import { join } from "node:path";
import {
	type ExtensionAPI,
	type ExtensionCommandContext,
	getAgentDir,
	ModelRuntime,
} from "@earendil-works/pi-coding-agent";
import { PiAgentExecutor } from "./agent-runner.ts";
import { loadRuntimeConfig } from "./config.ts";
import type { RuntimeEventSink } from "./events.ts";
import {
	displayText,
	formatConfiguration,
	formatHistory,
	formatRunView,
	ObservationInputError,
	pageNumber,
	type RunView,
} from "./observations.ts";
import { FileStateStore } from "./state-store.ts";
import { formatWorkflowReport, StandardWorkflow, type WorkflowReport } from "./workflow.ts";

/** Explicit composition seam for local faux tests/Hosts, not a worker-visible provider registration mechanism. */
export interface CompanyExtensionOptions {
	agentDir?: string;
	createModels?: (signal: AbortSignal) => Promise<ModelRuntime>;
	events?: RuntimeEventSink;
	approvalTimeoutMs?: number;
}
export function registerCompanyRuntime(
	pi: Pick<ExtensionAPI, "registerCommand" | "on">,
	options: CompanyExtensionOptions = {},
): void {
	let pending: Promise<void> | undefined;
	let exporting: Promise<void> | undefined;
	let workflow: StandardWorkflow | undefined;
	let cancellation: AbortController | undefined;
	let last: WorkflowReport | undefined;
	let project: string | undefined;
	const cancel = async () => {
		cancellation?.abort();
		workflow?.cancel();
		await pending;
		await exporting;
	};
	const inspect = async (ctx: ExtensionCommandContext, runId?: string): Promise<RunView> => {
		const id = runId === "latest" ? undefined : runId;
		if (pending && project === ctx.cwd && (!id || id === workflow?.snapshot?.runId))
			return {
				run: workflow?.snapshot,
				report: workflow?.report,
				state: workflow?.observationState,
				source: "live Kernel + action audit",
			};
		const snapshot = await FileStateStore.readSnapshot(ctx.cwd);
		const run = id ? snapshot.state?.runs.find((run) => run.runId === id) : snapshot.state?.runs.at(-1);
		if (id && !run) throw new ObservationInputError("Unknown run ID; use /workflow history");
		const diagnostics: string[] = [];
		if (snapshot.state && !snapshot.tasksCurrent)
			diagnostics.push("tasks.json is unavailable or out of sync; no repair was performed");
		if (snapshot.writerPresent)
			diagnostics.push("Writer lock present; this is not proof of a live worker. Query acquired no lock");
		else if (run && ["CREATED", "RUNNING", "WAITING_APPROVAL"].includes(run.status))
			diagnostics.push(
				"Stored active status without a writer; liveness is unconfirmed. No recovery/resume was performed",
			);
		const local = project === ctx.cwd ? last : undefined;
		if (local?.error && !local.run) diagnostics.push(`Last preflight failed: ${local.error}; no new run was created`);
		if (local?.error && local.run?.runId === run?.runId && local.run) {
			diagnostics.push(`Durable status: ${run?.status}; last local failure takes precedence`);
			return {
				run: local.run,
				report: local,
				state: snapshot.state,
				diagnostics,
				source: `local failure / stored project revision ${snapshot.state?.revision}`,
			};
		}
		return {
			run,
			state: snapshot.state,
			diagnostics,
			source: `stored project revision ${snapshot.state?.revision ?? "none"}`,
			report: local?.run?.runId === run?.runId || !run ? local : undefined,
		};
	};
	const usage = {
		workflow: "/workflow [help|run <goal>|status [runId]|history [page]|config|cancel]",
		state: "/state [runId] | /state checks|decisions [runId] [page] | /state review [runId] | /state check <number> [runId] | /state export",
		team: "/team [runId]",
		risk: "/risk [runId]",
	};
	for (const name of ["team", "state", "workflow", "risk"] as const) {
		pi.registerCommand(name, {
			description: `Weavra ${name} (QUICK R0/R1, STANDARD R0/R1/R2, scoped R3); /${name} help`,
			handler: async (args, ctx) => {
				if (!ctx.hasUI) throw new Error("Weavra commands require a notification-capable UI");
				if (!ctx.isProjectTrusted()) {
					ctx.ui.notify("Weavra: project is not trusted; no configuration or state was read.", "warning");
					return;
				}
				const argument = args.trim();
				try {
					if (argument === "help") {
						ctx.ui.notify(
							[
								"Weavra v0.1 RC1 (development)",
								usage[name],
								...(name === "workflow"
									? [
											"QUICK: Executor only; R0 read-only, R1 one-file small change (up to 100 changed lines).",
											"STANDARD: Developer -> SELF_CHECK -> independent Reviewer -> TEST -> COMPLETE; R0/R1/R2 and scoped R3.",
											"R2 file changes require STANDARD and independent Reviewer PASS; no install/shell tools.",
											"Scoped R3: one tracked text-file deletion, separate one-time Human Approval (default Deny), then independent Reviewer and checks.",
											"Both workflows require trusted config, clean Git, required checks and fresh evidence. Approval is not completion.",
											"No automatic commit/rollback or resume. Cancel with /workflow cancel, not parent Esc.",
											usage.state,
											usage.team,
											usage.risk,
										]
									: [
											"Read-only snapshots: omitted runId/latest selects the latest run; stored PASS is not a live check.",
											...(name === "state"
												? ["Only /state export writes derived views; it does not resume a run."]
												: []),
											"Workflow, Reviewer and Human Approval requirements: /workflow help",
										]),
							].join("\n"),
							"info",
						);
						return;
					}
					if (name === "workflow" && argument === "config") {
						const loaded = await loadRuntimeConfig(ctx.cwd);
						ctx.ui.notify(
							loaded.status === "configured"
								? formatConfiguration(loaded.config)
								: "Weavra: .ai/config.yaml is missing",
							loaded.status === "configured" ? "info" : "warning",
						);
						return;
					}
					if (name === "state" && argument === "export") {
						if (pending || exporting || !ctx.isIdle()) {
							ctx.ui.notify("Export requires an idle parent and no active Weavra operation.", "warning");
							return;
						}
						exporting = (async () => {
							const snapshot = await FileStateStore.readSnapshot(ctx.cwd);
							if (
								!snapshot.state ||
								snapshot.writerPresent ||
								snapshot.state.runs.some((run) =>
									["CREATED", "RUNNING", "WAITING_APPROVAL"].includes(run.status),
								)
							)
								throw new Error(
									"Export refused: missing state or active/unconfirmed writer; no recovery performed",
								);
							const store = await FileStateStore.open(ctx.cwd, { recoverInterrupted: false });
							try {
								const result = await store.exportViews();
								ctx.ui.notify(
									`Exported operational projections from revision ${result.sourceRevision}: ${result.updated} file(s) updated\n${result.paths.join("\n")}\nNot execution/approval authority. No gitignore or commit changes.`,
									"info",
								);
							} finally {
								await store.close();
							}
						})()
							.catch((error) => {
								ctx.ui.notify(
									`Export failed: ${displayText(error instanceof Error ? error.message : "unknown export error")}`,
									"error",
								);
							})
							.finally(() => {
								exporting = undefined;
							});
						await exporting;
						return;
					}
					if (name === "workflow" && argument === "cancel") {
						await cancel();
						ctx.ui.notify(
							`${last ? formatWorkflowReport(last) : "Weavra: no active run."}\nNo rollback performed.`,
							last?.error ? "warning" : "info",
						);
						return;
					}
					if (name === "workflow" && argument.startsWith("run ")) {
						if (pending || exporting) {
							ctx.ui.notify("Weavra: a run is already active.", "warning");
							return;
						}
						if (!ctx.isIdle()) {
							ctx.ui.notify("Weavra: wait for the parent agent to become idle.", "warning");
							return;
						}
						const goal = argument.slice(4).trim();
						if (!goal) throw new Error("A goal is required");
						workflow = undefined;
						last = undefined;
						project = ctx.cwd;
						cancellation = new AbortController();
						const signal = cancellation.signal;
						pending = (async () => {
							const loaded = await loadRuntimeConfig(ctx.cwd);
							if (loaded.status !== "configured") throw new Error(".ai/config.yaml is missing");
							const { config } = loaded;
							const approved = await ctx.ui.confirm(
								"Weavra: run trusted QUICK/STANDARD workflow?",
								`Allowed files: ${config.files.allowed_paths.join(", ")}\nChecks (may mutate files; not sandboxed):\n${config.verification.checks.map((check) => JSON.stringify({ executable: check.executable, argv: check.args, cwd: check.cwd })).join("\n")}\nR2 file changes require independent STANDARD review. Only preselected single-file R3 deletion can request separate human approval; no other destructive or install/shell tools.\nCredential environment is filtered. No automatic rollback/commit. Trust only reviewed executables and scripts.`,
								{ signal },
							);
							if (!approved) throw new Error("Workflow preflight declined");
							signal.throwIfAborted();
							const agentDir = options.agentDir ?? getAgentDir();
							const models = options.createModels
								? await options.createModels(signal)
								: await ModelRuntime.create({
										authPath: join(agentDir, "auth.json"),
										modelsPath: join(agentDir, "models.json"),
										allowModelNetwork: false,
										signal,
									});
							workflow = new StandardWorkflow({
								cwd: ctx.cwd,
								goal,
								config,
								signal,
								events: options.events,
								approvalTimeoutMs: options.approvalTimeoutMs,
								approval: {
									requestApproval: async (request, signal) => {
										const selected =
											ctx.hasUI && ctx.isProjectTrusted() && !signal?.aborted
												? await ctx.ui.select(
														`R3: delete ONE file?\nProject: ${ctx.cwd}\nRun: ${request.runId}\nRole: ${request.role} | Step: ${request.step.stepId}@${request.step.attempt}\nTarget: ${request.path}\nBytes: ${request.bytes}\nFingerprint: ${request.preconditionDigest}\nAction: ${request.actionId}\nExpires: ${new Date(request.expiresAt).toISOString()}\nNo automatic rollback. Deny is the default.`,
														["Deny", "Approve once"],
														{ signal, timeout: Math.max(0, request.expiresAt - Date.now()) },
													)
												: undefined;
										return {
											runId: request.runId,
											actionId: request.actionId,
											actionDigest: request.actionDigest,
											configDigest: request.configDigest,
											expiresAt: request.expiresAt,
											approved:
												selected === "Approve once" &&
												ctx.hasUI &&
												ctx.isProjectTrusted() &&
												!signal?.aborted,
										};
									},
								},
								createAgents: async (store, quickScope, r2RunId, r3Scope) => {
									const executor = await PiAgentExecutor.create({
										cwd: ctx.cwd,
										agentDir,
										config,
										timeoutMs: config.agents.worker_timeout_ms,
										modelRuntime: models,
										audit: store,
										quickScope,
										r2RunId,
										r3Scope,
									});
									return { executor, policy: executor.policyContext };
								},
							});
							last = await workflow.execute();
							ctx.ui.notify(
								formatWorkflowReport(last),
								last.run?.status === "COMPLETED" && !last.error ? "info" : "warning",
							);
						})()
							.catch((error) => {
								last = {
									changedFiles: [],
									partialChanges: false,
									changesUnknown: false,
									error: signal.aborted
										? "Preflight cancelled"
										: error instanceof Error
											? error.message
											: "Workflow preflight failed",
									recommendedAction: "Inspect configuration and workspace; no automatic retry",
								};
								ctx.ui.notify(formatWorkflowReport(last), "error");
							})
							.finally(() => {
								pending = undefined;
							});
						ctx.ui.notify("Weavra: preflight started. Status/cancel remain available.", "info");
						return;
					}
					const parts = argument ? argument.split(/\s+/) : [];
					if (name === "workflow" && parts[0] === "history") {
						if (parts.length > 2) throw new ObservationInputError(usage.workflow);
						const view = await inspect(ctx);
						ctx.ui.notify(
							view.state ? formatHistory(view.state, pageNumber(parts[1])) : "Weavra: state missing; no history",
							view.state ? "info" : "warning",
						);
						return;
					}
					let detail = "summary";
					let id: string | undefined;
					let number = 1;
					if (name === "workflow") {
						if (parts.length && (parts[0] !== "status" || parts.length > 2))
							throw new ObservationInputError(usage.workflow);
						id = parts[1];
					} else if (name === "state" && parts[0] === "check") {
						if (parts.length < 2 || parts.length > 3) throw new ObservationInputError(usage.state);
						detail = "check";
						number = pageNumber(parts[1]);
						id = parts[2];
					} else if (name === "state" && ["checks", "review", "decisions"].includes(parts[0])) {
						if (parts.length > 3 || (parts[0] === "review" && parts.length > 2))
							throw new ObservationInputError(usage.state);
						detail = parts[0];
						id = parts[1];
						number = pageNumber(parts[2]);
					} else {
						if (parts.length > 1) throw new ObservationInputError(usage[name]);
						id = parts[0];
					}
					if (pending && project === ctx.cwd && !workflow?.snapshot && !id) {
						ctx.ui.notify("Weavra: preflight in progress; /workflow cancel is available.", "info");
						return;
					}
					const view = await inspect(ctx, id);
					ctx.ui.notify(formatRunView(name, view, detail, number), view.run ? "info" : "warning");
				} catch (error) {
					if (error instanceof ObservationInputError) {
						ctx.ui.notify(error.message, "warning");
						return;
					}
					ctx.ui.notify(
						"Weavra command failed; check configuration, state integrity and writer ownership.",
						"error",
					);
				}
			},
		});
	}
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode === "tui" && ctx.hasUI)
			ctx.ui.notify(
				"Weavra Runtime loaded — v0.1 RC1 (development)\nQUICK / STANDARD · R0–R2 / scoped R3\n/workflow · /state · /team · /risk — /workflow help",
				"info",
			);
	});
	pi.on("input", () => (pending || exporting ? { action: "handled" } : { action: "continue" }));
	pi.on("tool_call", () =>
		pending || exporting
			? { block: true, reason: "Weavra workflow owns workspace; use /workflow cancel", terminate: true }
			: undefined,
	);
	pi.on("user_bash", () =>
		pending || exporting
			? {
					result: {
						output: "Weavra workflow owns workspace; user bash blocked",
						exitCode: 1,
						cancelled: false,
						truncated: false,
					},
				}
			: undefined,
	);
	pi.on("session_before_switch", cancel);
	pi.on("session_before_fork", cancel);
	pi.on("session_before_tree", cancel);
	pi.on("session_shutdown", cancel);
}

export default function companyRuntime(pi: ExtensionAPI): void {
	registerCompanyRuntime(pi);
}
