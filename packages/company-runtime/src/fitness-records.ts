import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, opendir, realpath, rename, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Check } from "typebox/value";
import {
	type FitnessFixtureResult,
	FitnessIdSchema,
	type ProviderFitnessRun,
	ProviderFitnessRunSchema,
} from "./fitness-types.ts";

const MAX_BYTES = 1024 * 1024;

function canonical(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonical);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([a], [b]) => a.localeCompare(b, "en"))
				.map(([key, item]) => [key, canonical(item)]),
		);
	}
	return value;
}

export function fitnessDigest(value: unknown): string {
	return `sha256:${createHash("sha256")
		.update("weavra-fitness-v1\0")
		.update(JSON.stringify(canonical(value)))
		.digest("hex")}`;
}

/** No userinfo, query, fragment or raw URL is retained. Endpoint identity is not backend/weights identity. */
export function safeEndpointIdentity(value: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("Invalid Fitness endpoint");
	}
	if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid Fitness endpoint");
	return fitnessDigest({ origin: url.origin, path: url.pathname.replace(/\/+$/, "") || "/" });
}

export function freezeFitnessRecord(input: Omit<ProviderFitnessRun, "resultDigest">): ProviderFitnessRun {
	const { resultDigest: _previousDigest, ...body } = structuredClone(input) as ProviderFitnessRun;
	const record = { ...body, resultDigest: fitnessDigest(body) };
	return validateFitnessRecord(record);
}

export function validateFitnessRecord(value: unknown): ProviderFitnessRun {
	if (!Check(ProviderFitnessRunSchema, value)) throw new Error("Invalid Fitness record schema");
	const { resultDigest, ...body } = value;
	if (fitnessDigest(body) !== resultDigest) throw new Error("Invalid Fitness record digest");
	if (
		(value.status === "RUNNING") !== (value.completedAt === null) ||
		(value.completedAt !== null && value.completedAt < value.startedAt)
	)
		throw new Error("Invalid Fitness lifecycle");
	if (value.fixtures.length > value.budget.maxFixtures || value.fixtures.length > value.plannedFixtures.length)
		throw new Error("Invalid Fitness fixture bound");
	if (value.status === "COMPLETED" && value.fixtures.length !== value.plannedFixtures.length)
		throw new Error("Incomplete Fitness collection");
	for (const [index, fixture] of value.fixtures.entries()) {
		if (fixture.fixtureId !== value.plannedFixtures[index]) throw new Error("Invalid Fitness fixture order");
		const expected =
			fixture.oracle === "INVALID" ? null : fixture.terminalStatus === "COMPLETED" && fixture.oracle === "FAIL";
		if (fixture.falseCompletion !== expected) throw new Error("Invalid Fitness oracle relationship");
		const usage = fixture.efficiency.usage;
		if (
			usage.state === "UNKNOWN"
				? usage.input !== null || usage.output !== null || usage.total !== null
				: usage.input === null || usage.output === null || usage.total === null || usage.knownTotal !== usage.total
		)
			throw new Error("Invalid Fitness usage provenance");
		if (fixture.runId === null && fixture.terminalStatus !== "NOT_STARTED")
			throw new Error("Invalid Fitness Run identity");
		if (fixture.terminalStatus === "COMPLETED" && fixture.reliability.cleanup !== "CONFIRMED")
			throw new Error("Invalid Fitness completion cleanup");
	}
	return structuredClone(value);
}

/** Separate from Runtime .ai state; reads never recover or resume an interrupted evaluation. */
export class FitnessRecordStore {
	private readonly directory: string;
	private constructor(directory: string) {
		this.directory = directory;
	}

	static async open(directory: string, options: { create?: boolean } = {}): Promise<FitnessRecordStore> {
		const absolute = resolve(directory);
		const ancestors: string[] = [];
		for (let current = absolute; current !== dirname(current); current = dirname(current)) ancestors.unshift(current);
		for (const path of ancestors) {
			let info = await lstat(path).catch((error: NodeJS.ErrnoException) => {
				if (error.code === "ENOENT") return undefined;
				throw new Error("Fitness directory unavailable");
			});
			if (!info && options.create) {
				await mkdir(path, { mode: 0o700 });
				info = await lstat(path);
			}
			if (!info?.isDirectory() || info.isSymbolicLink()) throw new Error("Unsafe Fitness directory");
		}
		const info = await lstat(absolute);
		if ((info.mode & 0o077) !== 0) throw new Error("Fitness directory must be private");
		return new FitnessRecordStore(await realpath(absolute));
	}

	async read(id: string): Promise<ProviderFitnessRun> {
		if (!Check(FitnessIdSchema, id)) throw new Error("Invalid Fitness ID");
		const file = await open(
			join(this.directory, `${id}.json`),
			constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
		);
		try {
			const stat = await file.stat();
			if (!stat.isFile() || stat.nlink !== 1 || stat.size > MAX_BYTES || (stat.mode & 0o077) !== 0)
				throw new Error("Unsafe Fitness record");
			const bytes = Buffer.alloc(MAX_BYTES + 1);
			let length = 0;
			while (length <= MAX_BYTES) {
				const result = await file.read(bytes, length, bytes.length - length, null);
				if (!result.bytesRead) break;
				length += result.bytesRead;
			}
			if (length > MAX_BYTES) throw new Error("Fitness record too large");
			const record = validateFitnessRecord(
				JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length))),
			);
			if (record.id !== id) throw new Error("Fitness record identity mismatch");
			return record;
		} finally {
			await file.close();
		}
	}

	async save(input: ProviderFitnessRun): Promise<void> {
		const record = validateFitnessRecord(input);
		const text = `${JSON.stringify(record)}\n`;
		if (Buffer.byteLength(text) > MAX_BYTES) throw new Error("Fitness record too large");
		const lockPath = join(this.directory, `${record.id}.lock`);
		const lock = await open(
			lockPath,
			constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
			0o600,
		);
		const tempPath = join(this.directory, `${record.id}.${randomUUID()}.tmp`);
		let tempCreated = false;
		try {
			let prior: ProviderFitnessRun | undefined;
			try {
				prior = await this.read(record.id);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			}
			if (prior) {
				if (prior.resultDigest === record.resultDigest) return;
				const immutable = (run: ProviderFitnessRun) => ({
					id: run.id,
					corpusRevision: run.corpusRevision,
					corpusDigest: run.corpusDigest,
					target: run.target,
					kind: run.kind,
					startedAt: run.startedAt,
					budget: run.budget,
					plannedFixtures: run.plannedFixtures,
					environment: run.environment,
				});
				if (
					prior.status !== "RUNNING" ||
					fitnessDigest(immutable(prior)) !== fitnessDigest(immutable(record)) ||
					record.fixtures.length < prior.fixtures.length ||
					fitnessDigest(record.fixtures.slice(0, prior.fixtures.length)) !== fitnessDigest(prior.fixtures)
				)
					throw new Error("Fitness history is immutable");
			}
			const file = await open(
				tempPath,
				constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
				0o600,
			);
			tempCreated = true;
			try {
				await file.writeFile(text);
				await file.sync();
			} finally {
				await file.close();
			}
			await rename(tempPath, join(this.directory, `${record.id}.json`));
			tempCreated = false;
		} finally {
			try {
				if (tempCreated) await unlink(tempPath);
			} finally {
				await lock.close();
				await unlink(lockPath);
			}
		}
	}

	async list(): Promise<ProviderFitnessRun[]> {
		const directory = await opendir(this.directory);
		let enumerated = 0;
		const candidates: Array<{ id: string; mtime: number }> = [];
		for await (const entry of directory) {
			if (++enumerated > 4096) throw new Error("Fitness history enumeration limit exceeded");
			const name = entry.name;
			if (!name.endsWith(".json") || !Check(FitnessIdSchema, name.slice(0, -5))) continue;
			const stat = await lstat(join(this.directory, name));
			if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error("Unsafe Fitness history");
			candidates.push({ id: name.slice(0, -5), mtime: stat.mtimeMs });
		}
		candidates.sort((a, b) => b.mtime - a.mtime || a.id.localeCompare(b.id));
		return await Promise.all(candidates.slice(0, 32).map(({ id }) => this.read(id)));
	}
}

export function summarizeFitnessRun(run: ProviderFitnessRun) {
	const results = run.fixtures;
	const sum = (select: (fixture: ProviderFitnessRun["fixtures"][number]) => number) =>
		results.reduce((total, item) => total + select(item), 0);
	return {
		id: run.id,
		target: run.target,
		status: run.status,
		kind: run.kind,
		correctness: {
			executed: results.length,
			oraclePass: results.filter((item) => item.oracle === "PASS").length,
			oracleFail: results.filter((item) => item.oracle === "FAIL").length,
			invalid: results.filter((item) => item.oracle === "INVALID").length,
			falseCompletion: sum((item) => Number(item.falseCompletion === true)),
		},
		contract: {
			scopeViolations: sum((item) => item.contract.scopeViolations),
			forbiddenMutationAttempts: sum((item) => item.contract.forbiddenMutationAttempts),
			strictReceiptRejections: sum((item) => item.contract.strictReceiptRejections),
			handoffRejections: sum((item) => item.contract.handoffRejections),
			reviewRejections: sum((item) => item.contract.reviewRejections),
		},
		tools: {
			calls: sum((item) => item.tools.calls),
			invalidCalls: sum((item) => item.tools.invalidCalls),
			retries: sum((item) => item.tools.retries),
			runtimeRead: sum((item) => item.tools.runtimeRead),
			runtimeEdit: sum((item) => item.tools.runtimeEdit),
			runtimeWrite: sum((item) => item.tools.runtimeWrite),
			lsp: sum((item) => item.tools.lsp),
		},
		reliability: {
			providerErrors: sum((item) => item.reliability.providerErrors),
			authErrors: sum((item) => item.reliability.authErrors),
			transportErrors:
				results.length && results.every((item) => item.reliability.transportErrors !== null)
					? sum((item) => item.reliability.transportErrors ?? 0)
					: null,
			timeouts: sum((item) => item.reliability.timeouts),
			repairCount: sum((item) => item.reliability.repairCount),
			reviewerRevisionCount: sum((item) => item.reliability.reviewerRevisionCount),
		},
		efficiency: {
			workerInvocations: sum((item) => item.efficiency.workerInvocations),
			modelTurns: sum((item) => item.efficiency.modelTurns),
			tokens:
				results.length && results.every((item) => item.efficiency.usage.state === "KNOWN")
					? sum((item) => item.efficiency.usage.total ?? 0)
					: null,
			knownTokens: sum((item) => item.efficiency.usage.knownTotal),
			latencyMs: sum((item) => item.latencyMs),
			contextBytes: sum((item) => item.efficiency.contextBytes),
			costUsd:
				results.length && results.every((item) => item.efficiency.costUsd !== null)
					? sum((item) => item.efficiency.costUsd ?? 0)
					: null,
		},
	};
}
/** F01/F02 admission requires the complete contract, not only an oracle or Runtime verdict. */
export function passesFitnessCalibrationFixture(result: FitnessFixtureResult): boolean {
	return (
		(result.fixtureId === "F01" || result.fixtureId === "F02") &&
		result.terminalStatus === "COMPLETED" &&
		result.oracle === "PASS" &&
		result.falseCompletion === false &&
		result.contract.taskContractAdherence === true &&
		result.contract.scopeViolations === 0 &&
		result.contract.forbiddenMutationAttempts === 0 &&
		result.ac.met !== null &&
		result.ac.met > 0 &&
		result.ac.notMet === 0 &&
		result.checks.passed === 2 &&
		result.checks.failed === 0 &&
		result.checks.notRun === 0 &&
		result.reliability.cleanup === "CONFIRMED" &&
		result.efficiency.usage.state === "KNOWN" &&
		result.reliability.providerErrors === 0 &&
		result.reliability.authErrors === 0 &&
		(result.reliability.transportErrors === null || result.reliability.transportErrors === 0) &&
		result.reliability.timeouts === 0
	);
}

const FULL_CORPUS_IDS = ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F09", "F10", "F08"];

export function compareFitnessRuns(left: ProviderFitnessRun, right: ProviderFitnessRun) {
	left = validateFitnessRecord(left);
	right = validateFitnessRecord(right);
	const fixtureIdentity = (run: ProviderFitnessRun) =>
		run.fixtures.map((item) => ({
			fixtureId: item.fixtureId,
			fixtureDigest: item.fixtureDigest,
			taskContractDigest: item.taskContractDigest,
			registeredCheckDigest: item.registeredCheckDigest,
			configurationDigest: item.configurationDigest,
		}));
	const compatibility = {
		corpus: left.corpusRevision === right.corpusRevision && left.corpusDigest === right.corpusDigest,
		budget: fitnessDigest(left.budget) === fitnessDigest(right.budget),
		harness:
			left.target.harnessRevision === right.target.harnessRevision &&
			left.target.toolSchemaRevision === right.target.toolSchemaRevision &&
			left.target.promptRuntimeRevision === right.target.promptRuntimeRevision,
		configuration: left.target.configurationDigest === right.target.configurationDigest,
		fixtures:
			left.status === "COMPLETED" &&
			right.status === "COMPLETED" &&
			left.fixtures.length === FULL_CORPUS_IDS.length &&
			left.fixtures.every((fixture, index) => fixture.fixtureId === FULL_CORPUS_IDS[index]) &&
			fitnessDigest(left.plannedFixtures) === fitnessDigest(right.plannedFixtures) &&
			fitnessDigest(fixtureIdentity(left)) === fitnessDigest(fixtureIdentity(right)),
		kind: left.kind === right.kind,
	};
	return {
		compatibility,
		comparable: Object.values(compatibility).every(Boolean),
		left: summarizeFitnessRun(left),
		right: summarizeFitnessRun(right),
	};
}
