import { randomUUID } from "node:crypto";
import { selectR3Scope } from "./approval.ts";
import { classifyRequest, selectWorkflow } from "./classification.ts";
import type { RuntimeConfig } from "./config.ts";
import type { QuickScope, R3Scope, Run } from "./contracts.ts";
import type { RuntimeEventSink } from "./events.ts";
import {
	bindExecutionContract,
	type ExecutionContract,
	type ExecutionMode,
	proposeExecutionMode,
} from "./execution-contract.ts";
import { CompanyKernel } from "./kernel.ts";
import { LspManager } from "./lsp/manager.ts";
import type { LspServerStatus } from "./lsp/types.ts";
import { formatRunView, type ObservationState } from "./observations.ts";
import type { PolicyContext } from "./policy.ts";
import type { AgentExecutor, ApprovalPort } from "./ports.ts";
import { ProcessCleanupError } from "./process-runner.ts";
import { selectQuickScope } from "./quick.ts";
import { FileStateStore } from "./state-store.ts";
import { RegisteredVerifier } from "./verification.ts";
import { GitWorkspace } from "./workspace.ts";

export interface WorkflowOptions {
	cwd: string;
	goal: string;
	/** Explicit trusted Host selection; natural-language proposal alone is never a grant. */
	executionMode: ExecutionMode;
	config: RuntimeConfig;
	createAgents: (
		store: FileStateStore,
		quickScope: QuickScope | undefined,
		r2RunId: string | undefined,
		r3Scope: R3Scope | undefined,
		executionContract: ExecutionContract,
	) => Promise<{ executor: AgentExecutor; policy: PolicyContext }>;
	events?: RuntimeEventSink;
	signal?: AbortSignal;
	approval?: ApprovalPort;
	approvalTimeoutMs?: number;
}
export interface WorkflowReport {
	run?: Run;
	changedFiles: string[];
	partialChanges: boolean;
	changesUnknown: boolean;
	error?: string;
	recommendedAction: string;
	diagnostics?: string[];
}

/** One awaited owner of the run, worker/check cancellation and project lock. No Pi/UI types. */
export class StandardWorkflow {
	private kernel?: CompanyKernel;
	private store?: FileStateStore;
	private lsp?: LspManager;
	get lspStatus(): LspServerStatus[] | undefined {
		return this.lsp?.status;
	}
	private reportValue: WorkflowReport = {
		changedFiles: [],
		partialChanges: false,
		changesUnknown: false,
		recommendedAction: "Wait for preflight",
	};
	private controller = new AbortController();
	private started = false;
	private readonly options: WorkflowOptions;
	constructor(options: WorkflowOptions) {
		this.options = { ...options, config: structuredClone(options.config) };
	}
	get snapshot(): Run | undefined {
		return this.kernel?.snapshot;
	}
	get observationState(): ObservationState | undefined {
		return this.store?.snapshot;
	}
	get report(): WorkflowReport {
		const failures = this.kernel?.deliveryFailures ?? [];
		return structuredClone({
			...this.reportValue,
			run: this.snapshot,
			diagnostics: failures.length
				? [`Observer delivery failures: ${failures.length}; execution result was not changed`]
				: [],
		});
	}
	cancel(): void {
		this.controller.abort();
	}
	async execute(): Promise<WorkflowReport> {
		if (this.started) throw new Error("Workflow instances cannot be resumed or restarted");
		this.started = true;
		const signal = this.options.signal
			? AbortSignal.any([this.controller.signal, this.options.signal])
			: this.controller.signal;
		let store: FileStateStore | undefined;
		let verifier: RegisteredVerifier | undefined;
		let workspace: GitWorkspace | undefined;
		let executor: AgentExecutor | undefined;
		let cleanupUncertain = false;
		try {
			signal.throwIfAborted();
			if (process.platform === "win32")
				throw new Error("Weavra Runtime requires POSIX process supervision; Windows execution is unsupported");
			const runId = randomUUID();
			const contract = bindExecutionContract(runId, this.options.executionMode);
			const proposal = proposeExecutionMode(this.options.goal);
			const { classification, requiresConfirmation } = classifyRequest(this.options.goal);
			const r3Scope =
				classification.risk === "R3" && contract.mode === "EDIT"
					? selectR3Scope(this.options.goal, runId)
					: undefined;
			if (
				requiresConfirmation ||
				classification.complexity === "COMPLEX" ||
				(classification.risk === "R3" && (!r3Scope || !this.options.approval)) ||
				(["R2", "R3"].includes(classification.risk) && this.options.config.runtime.workflow === "QUICK") ||
				!["adaptive", "STANDARD", "QUICK"].includes(this.options.config.runtime.workflow)
			)
				throw new Error(
					`Unsupported classification/workflow: ${classification.complexity}/${classification.risk}; no downgrade performed`,
				);
			if (proposal.requiresConfirmation || (proposal.mode === "READ_ONLY" && contract.mode !== "READ_ONLY"))
				throw new Error(
					"Execution request needs clarification or conflicts with the READ_ONLY contract; start a new explicit run",
				);
			const selection = selectWorkflow(classification, this.options.config.runtime.workflow);
			const quickScope =
				selection.workflow === "QUICK" ? selectQuickScope(this.options.goal, classification) : undefined;
			if (
				!Number.isInteger(this.options.config.agents.max_revision_cycles) ||
				this.options.config.agents.max_revision_cycles < 0 ||
				this.options.config.agents.max_revision_cycles > 3
			)
				throw new Error("STANDARD revision limit must be from 0 to 3");
			if (!this.options.config.verification.checks.some((check) => check.required))
				throw new Error("Configure at least one trusted required verification check");
			const r2RunId = classification.risk === "R2" ? runId : undefined;
			store = await FileStateStore.open(this.options.cwd, { events: this.options.events });
			this.store = store;
			const agents = await this.options.createAgents(store, quickScope, r2RunId, r3Scope, contract);
			executor = agents.executor;
			const configuredInstruction = this.options.config.project?.instructions.path;
			if ((agents.policy.projectInstruction?.path ?? undefined) !== configuredInstruction)
				throw new Error("Project instruction snapshot differs from the selected configuration");
			if (agents.policy.executionMode !== contract.mode || agents.policy.executionRunId !== contract.runId)
				throw new Error("Agent Policy execution contract differs from the frozen run");
			if (JSON.stringify(agents.policy.r3Scope) !== JSON.stringify(r3Scope))
				throw new Error("R3 execution binding differs from selected scope");
			if (agents.policy.r2RunId !== r2RunId) throw new Error("R2 execution binding differs from the selected run");
			signal.throwIfAborted();
			workspace = await GitWorkspace.open(this.options.cwd, agents.policy, signal);
			const lspConfig = this.options.config.code_intelligence?.lsp;
			if (lspConfig?.enabled) this.lsp = await LspManager.create(workspace.cwd, lspConfig, agents.policy);
			const lsp = this.lsp;
			verifier = await RegisteredVerifier.create(this.options.config, agents.policy, store, workspace, lsp);
			signal.throwIfAborted();
			this.kernel = await CompanyKernel.create(
				{
					runId,
					executionMode: contract.mode,
					projectInstruction: agents.policy.projectInstruction ?? null,
					task: {
						id: randomUUID(),
						goal: this.options.goal,
						requirements: [this.options.goal],
						status: "pending",
					},
					classification,
					workflow: selection.workflow,
					maxRevisionCycles: classification.risk === "R3" ? 0 : this.options.config.agents.max_revision_cycles,
					approvalTimeoutMs: this.options.approvalTimeoutMs,
					checks: this.options.config.verification.checks.map(({ id, kind, required }) => ({
						id,
						kind,
						required,
					})),
				},
				{
					agents: this.lsp
						? {
								execute: (request) => agents.executor.execute({ ...request, lsp: this.lsp }),
								get safeToRelease() {
									return agents.executor.safeToRelease !== false && !lsp?.cleanupFailed;
								},
							}
						: agents.executor,
					verifier,
					store,
					events: this.options.events,
					approval: this.options.approval,
				},
			);
			await this.kernel.start();
			while (this.kernel.snapshot.status === "RUNNING") {
				if (signal.aborted) {
					await this.kernel.stop("CANCELLED", "Workflow cancelled");
					break;
				}
				const step = this.kernel.snapshot.currentStep;
				if (!step) throw new Error("Running workflow has no step");
				// A live/unconfirmed LSP process must not survive a successful terminal commit.
				if (step.stepId === "complete") await this.lsp?.close();
				await this.kernel.advance(step.stepId, signal);
			}
		} catch (error) {
			cleanupUncertain ||= error instanceof ProcessCleanupError;
			this.reportValue.error = signal.aborted
				? "Workflow cancelled during preflight or storage failure"
				: error instanceof Error
					? error.message
					: "Workflow failed";
		} finally {
			try {
				await this.lsp?.close();
			} catch {
				cleanupUncertain = true;
			}
			cleanupUncertain ||= this.lsp?.safeToRelease === false;
			cleanupUncertain ||=
				executor?.safeToRelease === false ||
				verifier?.safeToRelease === false ||
				workspace?.safeToRelease === false;
			if (this.snapshot?.status === "COMPLETED" && !cleanupUncertain) {
				// Completion already captured live evidence after all workers/checks stopped.
				// Do not start another Git process after committing the terminal outcome.
				this.reportValue.changedFiles = this.snapshot.workspace?.changedFiles ?? [];
			} else if (workspace && !cleanupUncertain) {
				try {
					const current = await workspace.inspect();
					this.reportValue.changedFiles = current.changedFiles;
				} catch (error) {
					this.reportValue.changesUnknown = true;
					cleanupUncertain ||= error instanceof ProcessCleanupError || !workspace.safeToRelease;
				}
			}
			if (!cleanupUncertain) {
				try {
					await store?.close();
				} catch {
					this.reportValue.error = "Lock cleanup failed; inspect owner before another run";
				}
			} else {
				this.reportValue.changesUnknown = true;
				this.reportValue.changedFiles = this.snapshot?.workspace?.changedFiles ?? [];
				this.reportValue.error = [
					this.reportValue.error ?? this.snapshot?.lastError,
					"Resource cleanup unconfirmed; project lock retained for manual inspection",
				]
					.filter(Boolean)
					.join("; ");
			}
		}
		const run = this.snapshot;
		this.reportValue.error ??= run?.lastError ?? undefined;
		this.reportValue.partialChanges =
			run?.status !== "COMPLETED" && (this.reportValue.changedFiles.length > 0 || this.reportValue.changesUnknown);
		this.reportValue.recommendedAction =
			run?.status === "COMPLETED" && !this.reportValue.error
				? `Inspect the ${run.workflow === "QUICK" ? "verified" : "reviewed"} diff and verification results; no commit was made`
				: "Inspect git status/diff and recorded checks; preserve partial changes, then explicitly start a new run";
		return this.report;
	}
}

export function formatWorkflowReport(report: WorkflowReport): string {
	return formatRunView("state", { run: report.run, report, source: "local Kernel result" });
}
