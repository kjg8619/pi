import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { type FileHandle, lstat, mkdir, open, realpath, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { type Static, Type } from "typebox";
import { type PolicyDecision, PolicyDecisionSchema, type Run, RunSchema, validateContract } from "./contracts.ts";
import { createRuntimeEvent, type EventDeliveryFailure, type RuntimeEvent, type RuntimeEventSink } from "./events.ts";
import type { ActionAudit, ActionOutcome } from "./policy.ts";
import type { StateStore } from "./ports.ts";

const counter = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const ActionRecordSchema = Type.Object(
	{
		decision: PolicyDecisionSchema,
		status: Type.Enum(["DENIED", "PREPARED", "SUCCEEDED", "FAILED", "INTERRUPTED"]),
	},
	{ additionalProperties: false },
);
const StateSchema = Type.Object(
	{
		schemaVersion: Type.Literal(1),
		/** Project storage revision, distinct from each Run.revision and its code revisionCycle. */
		revision: counter,
		runs: Type.Array(RunSchema),
		actions: Type.Array(ActionRecordSchema),
	},
	{ additionalProperties: false },
);
export type FileRuntimeState = Static<typeof StateSchema>;
type StateFile = "state.json" | "tasks.json";
export interface FileStateStoreOptions {
	now?: () => number;
	events?: RuntimeEventSink;
	/** Deterministic I/O failure injection for tests, not an execution/policy hook. */
	beforeAtomicStep?: (file: StateFile, step: "write" | "sync" | "rename") => void;
}
export class StateStoreError extends Error {
	readonly stage: string;
	readonly stateCommitted: boolean;
	cleanupFailed = false;
	constructor(stage: string, stateCommitted = false) {
		super(`Runtime storage failed (${stage}); further writes are disabled`);
		this.stage = stage;
		this.stateCommitted = stateCommitted;
	}
}
function active(run: Run): boolean {
	return ["CREATED", "RUNNING", "WAITING_APPROVAL"].includes(run.status);
}
function assertState(value: unknown): FileRuntimeState {
	const state = validateContract(StateSchema, value);
	const runIds = new Set(state.runs.map((run) => run.runId));
	if (runIds.size !== state.runs.length || state.runs.filter(active).length > 1) throw new Error("Conflicting runs");
	for (const run of state.runs) {
		const taskIds = new Set(run.tasks.map((task) => task.id));
		if (taskIds.size !== run.tasks.length || !taskIds.has(run.currentTask) || run.revision < 1)
			throw new Error("Invalid run identity");
	}
	const actionIds = new Set<string>();
	for (const action of state.actions) {
		const id = JSON.stringify([action.decision.runId, action.decision.actionId]);
		if (
			actionIds.has(id) ||
			!runIds.has(action.decision.runId) ||
			(action.status === "DENIED") !== (action.decision.decision !== "ALLOW")
		)
			throw new Error("Invalid action record");
		actionIds.add(id);
	}
	if (state.actions.filter((action) => action.status === "PREPARED").length > 1) throw new Error("Concurrent actions");
	return state;
}
function projection(state: FileRuntimeState) {
	const tasks = state.runs.flatMap((run) => run.tasks.map((task) => ({ runId: run.runId, ...task })));
	return {
		schemaVersion: 1,
		revision: state.revision,
		pending: tasks.filter((task) => task.status === "pending"),
		inProgress: tasks.filter((task) => task.status === "inProgress"),
		completed: tasks.filter((task) => task.status === "completed"),
		blocked: tasks.filter((task) => task.status === "blocked"),
	};
}

/** Local cooperative single writer. The owner must close in finally after workers have stopped. */
export class FileStateStore implements StateStore, ActionAudit {
	readonly projectPath: string;
	private readonly directory: string;
	private readonly lockPath: string;
	private readonly token = randomUUID();
	private readonly options: FileStateStoreOptions;
	private lockIdentity?: { dev: number; ino: number };
	private directoryIdentity?: { dev: number; ino: number };
	private state: FileRuntimeState = { schemaVersion: 1, revision: 0, runs: [], actions: [] };
	private closed = false;
	private busy = false;
	private readonly eventFailures: EventDeliveryFailure[] = [];

	private constructor(projectPath: string, options: FileStateStoreOptions) {
		this.projectPath = projectPath;
		this.directory = join(projectPath, ".ai");
		this.lockPath = join(this.directory, "writer.lock");
		this.options = options;
	}
	static async open(projectPath: string, options: FileStateStoreOptions = {}): Promise<FileStateStore> {
		const canonical = await realpath(projectPath);
		if (!(await lstat(canonical)).isDirectory()) throw new StateStoreError("workspace");
		const store = new FileStateStore(canonical, options);
		try {
			await mkdir(store.directory, { mode: 0o700 }).catch((error: NodeJS.ErrnoException) => {
				if (error.code !== "EEXIST") throw error;
			});
			const directory = await lstat(store.directory);
			if (!directory.isDirectory() || directory.isSymbolicLink()) throw new StateStoreError("directory");
			store.directoryIdentity = { dev: directory.dev, ino: directory.ino };
			const lock = await open(store.lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
			try {
				const identity = await lock.stat();
				store.lockIdentity = { dev: identity.dev, ino: identity.ino };
				await lock.writeFile(
					JSON.stringify({ schemaVersion: 1, projectPath: canonical, token: store.token, pid: process.pid }),
				);
				await lock.sync();
			} finally {
				await lock.close();
			}
			await store.initialize();
			return store;
		} catch (error) {
			const failure = error instanceof StateStoreError ? error : new StateStoreError("open/lock");
			store.closed = true;
			try {
				await store.releaseLock();
			} catch {
				failure.cleanupFailed = true;
			}
			throw failure;
		}
	}
	get snapshot(): FileRuntimeState {
		return structuredClone(this.state);
	}
	get deliveryFailures(): EventDeliveryFailure[] {
		return structuredClone(this.eventFailures);
	}

	private async assertDirectory(): Promise<void> {
		const stat = await lstat(this.directory);
		if (
			!stat.isDirectory() ||
			stat.isSymbolicLink() ||
			stat.dev !== this.directoryIdentity?.dev ||
			stat.ino !== this.directoryIdentity.ino ||
			(await realpath(this.projectPath)) !== this.projectPath
		)
			throw new StateStoreError("directory changed");
	}
	private async checkOwnership(): Promise<void> {
		if (this.closed) throw new StateStoreError("closed");
		await this.assertDirectory();
		const handle = await open(this.lockPath, constants.O_RDONLY | constants.O_NOFOLLOW);
		try {
			const stat = await handle.stat();
			if (
				!stat.isFile() ||
				stat.nlink !== 1 ||
				stat.dev !== this.lockIdentity?.dev ||
				stat.ino !== this.lockIdentity.ino
			)
				throw new StateStoreError("lock lost");
			const owner: unknown = JSON.parse(await handle.readFile("utf8"));
			if (!owner || typeof owner !== "object" || !("token" in owner) || owner.token !== this.token)
				throw new StateStoreError("lock lost");
		} finally {
			await handle.close();
		}
	}
	async assertWritable(): Promise<void> {
		try {
			await this.checkOwnership();
			const persisted = await this.readJson("state.json");
			if (
				(persisted !== undefined || this.state.revision > 0) &&
				JSON.stringify(persisted) !== JSON.stringify(this.state)
			)
				throw new StateStoreError("authoritative state changed outside the writer");
		} catch (error) {
			await this.fail(error);
		}
	}
	private async releaseLock(): Promise<void> {
		if (!this.lockIdentity) return;
		await this.assertDirectory();
		const stat = await lstat(this.lockPath);
		if (
			!stat.isFile() ||
			stat.nlink !== 1 ||
			stat.dev !== this.lockIdentity.dev ||
			stat.ino !== this.lockIdentity.ino
		)
			throw new StateStoreError("lock replacement; manual inspection required");
		// Never remove another owner's lock, even if the inode was modified in place.
		const handle = await open(this.lockPath, constants.O_RDONLY | constants.O_NOFOLLOW);
		try {
			const content = await handle.readFile("utf8");
			if (content) {
				const owner: unknown = JSON.parse(content);
				if (!owner || typeof owner !== "object" || !("token" in owner) || owner.token !== this.token)
					throw new StateStoreError("lock owner changed");
			}
		} finally {
			await handle.close();
		}
		await unlink(this.lockPath);
		this.lockIdentity = undefined;
	}
	async close(): Promise<void> {
		if (this.busy) throw new Error("Storage operation still in flight");
		this.closed = true;
		await this.releaseLock();
	}
	private async fail(error: unknown): Promise<never> {
		this.closed = true;
		const failure = error instanceof StateStoreError ? error : new StateStoreError("I/O or invalid state");
		try {
			await this.releaseLock();
		} catch {
			failure.cleanupFailed = true;
		}
		throw failure;
	}
	private async readJson(file: StateFile): Promise<unknown | undefined> {
		await this.checkOwnership();
		let handle: FileHandle;
		try {
			handle = await open(join(this.directory, file), constants.O_RDONLY | constants.O_NOFOLLOW);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
			throw error;
		}
		try {
			const stat = await handle.stat();
			if (!stat.isFile() || stat.nlink !== 1 || stat.size > 16 * 1024 * 1024)
				throw new StateStoreError("unsafe state file");
			return JSON.parse(await handle.readFile("utf8")) as unknown;
		} finally {
			await handle.close();
		}
	}
	private async atomicReplace(file: StateFile, value: unknown): Promise<void> {
		const content = `${JSON.stringify(value, null, 2)}\n`;
		if (Buffer.byteLength(content, "utf8") > 16 * 1024 * 1024) throw new StateStoreError("state size limit");
		await this.checkOwnership();
		const target = join(this.directory, file);
		try {
			const stat = await lstat(target);
			if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new StateStoreError("unsafe target");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
		const temporary = join(this.directory, `.${file}.${randomUUID()}.tmp`);
		const handle = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
		try {
			try {
				this.options.beforeAtomicStep?.(file, "write");
				await handle.writeFile(content);
				this.options.beforeAtomicStep?.(file, "sync");
				await handle.sync();
			} finally {
				await handle.close();
			}
			await this.checkOwnership();
			this.options.beforeAtomicStep?.(file, "rename");
			await rename(temporary, target);
			// File data is flushed before rename. Directory fsync/power-loss durability is not promised.
		} finally {
			await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
				if (error.code !== "ENOENT") throw error;
			});
		}
	}
	private async commit(next: FileRuntimeState): Promise<void> {
		next.revision = this.state.revision + 1;
		assertState(next);
		try {
			await this.atomicReplace("state.json", next);
		} catch {
			throw new StateStoreError("state.json", false);
		}
		this.state = structuredClone(next);
		try {
			await this.atomicReplace("tasks.json", projection(next));
		} catch {
			throw new StateStoreError("tasks.json", true);
		}
	}
	private async initialize(): Promise<void> {
		const raw = await this.readJson("state.json");
		if (raw !== undefined) this.state = structuredClone(assertState(raw));
		else {
			// Orphan projection is evidence of missing source, never a replacement source of truth.
			if ((await this.readJson("tasks.json")) !== undefined) throw new StateStoreError("missing state.json");
			return;
		}
		const next = structuredClone(this.state);
		const events: RuntimeEvent[] = [];
		for (const run of next.runs)
			if (active(run)) {
				run.status = "INTERRUPTED";
				run.revision++;
				run.eventSequence++;
				run.updatedAt = (this.options.now ?? Date.now)();
				run.activeAgents = [];
				run.next = [];
				run.lastError = "Previous owner stopped; inspect workspace and start a new run. No automatic resume.";
				run.tasks = run.tasks.map((task) => (task.status === "completed" ? task : { ...task, status: "blocked" }));
				events.push(createRuntimeEvent(run, run.eventSequence, { type: "RunInterrupted", reason: run.lastError }));
			}
		for (const action of next.actions) if (action.status === "PREPARED") action.status = "INTERRUPTED";
		if (JSON.stringify(next) !== JSON.stringify(this.state)) await this.commit(next);
		else {
			let tasks: unknown;
			try {
				tasks = await this.readJson("tasks.json");
			} catch (error) {
				if (!(error instanceof SyntaxError)) throw error;
			}
			if (JSON.stringify(tasks) !== JSON.stringify(projection(this.state)))
				await this.atomicReplace("tasks.json", projection(this.state));
		}
		for (const event of events) {
			try {
				await this.options.events?.emit(structuredClone(event));
			} catch {
				this.eventFailures.push({ sequence: event.sequence, type: event.type });
			}
		}
	}
	private async mutate(change: (next: FileRuntimeState) => void): Promise<void> {
		if (this.closed || this.busy) throw new StateStoreError("closed or concurrent operation");
		this.busy = true;
		try {
			await this.assertWritable();
			const next = structuredClone(this.state);
			change(next);
			await this.commit(next);
		} catch (error) {
			await this.fail(error);
		} finally {
			this.busy = false;
		}
	}
	async load(runId: string): Promise<Run | undefined> {
		await this.assertWritable();
		return structuredClone(this.state.runs.find((run) => run.runId === runId));
	}
	async save(run: Run): Promise<void> {
		run = structuredClone(run);
		await this.mutate((next) => {
			validateContract(RunSchema, run);
			const index = next.runs.findIndex((item) => item.runId === run.runId);
			const previous = next.runs[index];
			if (run.revision !== (previous?.revision ?? 0) + 1 || (previous && !active(previous)))
				throw new Error("Stale revision or terminal run; resume is unsupported");
			if (!previous && (run.status !== "CREATED" || next.runs.some(active)))
				throw new Error("Project already has an active run");
			if (next.actions.some((action) => action.status === "PREPARED")) throw new Error("Action still in flight");
			if (index < 0) next.runs.push(run);
			else next.runs[index] = run;
		});
	}
	async prepare(decision: PolicyDecision): Promise<void> {
		decision = structuredClone(decision);
		await this.mutate((next) => {
			validateContract(PolicyDecisionSchema, decision);
			if (
				!next.runs.some((run) => run.runId === decision.runId && run.status === "RUNNING") ||
				next.actions.some(
					(item) =>
						item.status === "PREPARED" ||
						(item.decision.runId === decision.runId &&
							(item.decision.actionId === decision.actionId ||
								item.decision.configDigest !== decision.configDigest)),
				)
			)
				throw new Error("Action requires a running owner, a fresh ID and the same frozen configuration");
			next.actions.push({ decision, status: decision.decision === "ALLOW" ? "PREPARED" : "DENIED" });
		});
	}
	async finish(runId: string, actionId: string, outcome: ActionOutcome): Promise<void> {
		await this.mutate((next) => {
			const action = next.actions.find(
				(item) => item.decision.runId === runId && item.decision.actionId === actionId,
			);
			if (!action || action.status !== "PREPARED") throw new Error("No pending action");
			action.status = outcome;
		});
	}
}

/** Scope must await worker cancellation/termination before returning; never release a live worker's lock. */
export async function withFileStateStore<T>(
	projectPath: string,
	operation: (store: FileStateStore) => Promise<T>,
	options?: FileStateStoreOptions,
): Promise<T> {
	const store = await FileStateStore.open(projectPath, options);
	try {
		return await operation(store);
	} finally {
		await store.close();
	}
}
