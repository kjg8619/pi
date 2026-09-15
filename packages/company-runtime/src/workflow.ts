import { randomUUID } from "node:crypto";
import { classifyRequest } from "./classification.ts";
import type { RuntimeConfig } from "./config.ts";
import type { Run } from "./contracts.ts";
import type { RuntimeEventSink } from "./events.ts";
import { CompanyKernel } from "./kernel.ts";
import type { PolicyContext } from "./policy.ts";
import type { AgentExecutor } from "./ports.ts";
import { FileStateStore } from "./state-store.ts";
import { RegisteredVerifier } from "./verification.ts";
import { GitWorkspace } from "./workspace.ts";

export interface WorkflowOptions {
	cwd: string;
	goal: string;
	config: RuntimeConfig;
	createAgents: (store: FileStateStore) => Promise<{ executor: AgentExecutor; policy: PolicyContext }>;
	events?: RuntimeEventSink;
	signal?: AbortSignal;
}
export interface WorkflowReport {
	run?: Run;
	changedFiles: string[];
	partialChanges: boolean;
	changesUnknown: boolean;
	error?: string;
	recommendedAction: string;
}

/** One awaited owner of the run, worker/check cancellation and project lock. No Pi/UI types. */
export class StandardWorkflow {
	private kernel?: CompanyKernel;
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
	get report(): WorkflowReport {
		return structuredClone({ ...this.reportValue, run: this.snapshot });
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
		try {
			signal.throwIfAborted();
			const { classification, requiresConfirmation } = classifyRequest(this.options.goal);
			if (
				requiresConfirmation ||
				classification.complexity !== "STANDARD" ||
				!["R0", "R1"].includes(classification.risk) ||
				!["adaptive", "STANDARD"].includes(this.options.config.runtime.workflow)
			)
				throw new Error(
					`Unsupported classification/workflow: ${classification.complexity}/${classification.risk}; no downgrade performed`,
				);
			if (this.options.config.agents.max_revision_cycles > 1)
				throw new Error("S4 supports at most one revision cycle");
			if (!this.options.config.verification.checks.some((check) => check.required))
				throw new Error("Configure at least one trusted required verification check");
			store = await FileStateStore.open(this.options.cwd, { events: this.options.events });
			const agents = await this.options.createAgents(store);
			signal.throwIfAborted();
			workspace = await GitWorkspace.open(this.options.cwd, agents.policy, signal);
			verifier = await RegisteredVerifier.create(this.options.config, agents.policy, store, workspace);
			signal.throwIfAborted();
			this.kernel = await CompanyKernel.create(
				{
					runId: randomUUID(),
					task: {
						id: randomUUID(),
						goal: this.options.goal,
						requirements: [this.options.goal],
						status: "pending",
					},
					classification,
					workflow: "STANDARD",
					maxRevisionCycles: this.options.config.agents.max_revision_cycles,
					checks: this.options.config.verification.checks.map(({ id, kind, required }) => ({
						id,
						kind,
						required,
					})),
				},
				{ agents: agents.executor, verifier, store, events: this.options.events },
			);
			await this.kernel.start();
			while (this.kernel.snapshot.status === "RUNNING") {
				if (signal.aborted) {
					await this.kernel.stop("CANCELLED", "Workflow cancelled");
					break;
				}
				const step = this.kernel.snapshot.currentStep;
				if (!step) throw new Error("Running workflow has no step");
				await this.kernel.advance(step.stepId, signal);
			}
		} catch (error) {
			this.reportValue.error = signal.aborted
				? "Workflow cancelled during preflight or storage failure"
				: error instanceof Error
					? error.message
					: "Workflow failed";
		} finally {
			if (workspace) {
				try {
					const current = await workspace.inspect();
					this.reportValue.changedFiles = current.changedFiles;
				} catch {
					this.reportValue.changesUnknown = true;
				}
			}
			if (!verifier || verifier.safeToRelease) {
				try {
					await store?.close();
				} catch {
					this.reportValue.error = "Lock cleanup failed; inspect owner before another run";
				}
			} else this.reportValue.error = "Check cleanup unconfirmed; project lock retained for manual inspection";
		}
		const run = this.snapshot;
		this.reportValue.error ??= run?.lastError ?? undefined;
		this.reportValue.partialChanges =
			run?.status !== "COMPLETED" && (this.reportValue.changedFiles.length > 0 || this.reportValue.changesUnknown);
		this.reportValue.recommendedAction =
			run?.status === "COMPLETED" && !this.reportValue.error
				? "Inspect the reviewed diff and verification results; no commit was made"
				: "Inspect git status/diff and recorded checks; preserve partial changes, then explicitly start a new run";
		return this.report;
	}
}

export function formatWorkflowReport(report: WorkflowReport): string {
	const run = report.run;
	return [
		`Run: ${run?.runId ?? "not started"}`,
		`Status: ${run?.status ?? "PREFLIGHT"} | Phase: ${run?.phase ?? "PREFLIGHT"} | Risk: ${run?.risk ?? "unclassified"}`,
		`Team: ${run?.activeAgents.join(", ") || "idle"} | Revision cycle: ${run?.revisionCycle ?? 0}`,
		`Goal: ${run?.goal ?? "not started"}`,
		`Diff: ${run?.workspace?.diffDigest ?? "not collected"} | Review: ${run?.review?.result ?? "not performed"}`,
		`Changed files: ${report.changedFiles.join(", ") || run?.workspace?.changedFiles.join(", ") || "none recorded"}`,
		`Partial changes exist: ${run?.status === "RUNNING" ? "possible; active step is not a live diff snapshot" : report.partialChanges ? "yes" : "no"}${report.changesUnknown ? " (collection incomplete)" : ""}`,
		`Verification: ${run?.verification.map((check) => `${check.id}@${check.revision}: ${check.status} (${check.reason})`).join("; ") || "not performed"}`,
		`Error: ${report.error ?? "none"}`,
		`Next: ${run?.status === "RUNNING" ? "Use /workflow status or /workflow cancel; parent Esc does not cancel workers" : report.recommendedAction}`,
	].join("\n");
}
