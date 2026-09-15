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
import { FileStateStore } from "./state-store.ts";
import { formatWorkflowReport, StandardWorkflow, type WorkflowReport } from "./workflow.ts";

/** Explicit composition seam for local faux tests/Hosts, not a worker-visible provider registration mechanism. */
export interface CompanyExtensionOptions {
	agentDir?: string;
	createModels?: (signal: AbortSignal) => Promise<ModelRuntime>;
	events?: RuntimeEventSink;
}
export function registerCompanyRuntime(
	pi: Pick<ExtensionAPI, "registerCommand" | "on">,
	options: CompanyExtensionOptions = {},
): void {
	let pending: Promise<void> | undefined;
	let workflow: StandardWorkflow | undefined;
	let cancellation: AbortController | undefined;
	let last: WorkflowReport | undefined;
	let project: string | undefined;
	const cancel = async () => {
		cancellation?.abort();
		workflow?.cancel();
		await pending;
	};
	const report = async (ctx: ExtensionCommandContext) => {
		if (pending) {
			ctx.ui.notify(
				workflow
					? formatWorkflowReport(workflow.report)
					: "Company runtime: preflight in progress; /workflow cancel is available.",
				"info",
			);
			return;
		}
		if (last && project === ctx.cwd) {
			ctx.ui.notify(formatWorkflowReport(last), "info");
			return;
		}
		const loaded = await loadRuntimeConfig(ctx.cwd);
		if (loaded.status === "missing") {
			ctx.ui.notify("Company runtime: .ai/config.yaml is missing; no run started.", "warning");
			return;
		}
		const store = await FileStateStore.open(ctx.cwd);
		try {
			const run = store.snapshot.runs.at(-1);
			ctx.ui.notify(
				formatWorkflowReport({
					run,
					changedFiles: run?.workspace?.changedFiles ?? [],
					partialChanges: run?.status !== "COMPLETED" && !!run?.workspace?.changedFiles.length,
					changesUnknown: run?.status === "INTERRUPTED",
					error: run?.lastError ?? undefined,
					recommendedAction: "Inspect stored state and current git diff; no automatic resume",
				}),
				"info",
			);
		} finally {
			await store.close();
		}
	};
	for (const name of ["team", "state", "workflow", "risk"] as const) {
		pi.registerCommand(name, {
			description: `Company runtime ${name} (STANDARD R0/R1)`,
			handler: async (args, ctx) => {
				if (!ctx.hasUI) throw new Error("Company runtime commands require a notification-capable UI");
				if (!ctx.isProjectTrusted()) {
					ctx.ui.notify("Company runtime: project is not trusted; no configuration or state was read.", "warning");
					return;
				}
				const argument = args.trim();
				try {
					if (name === "workflow" && argument === "cancel") {
						await cancel();
						ctx.ui.notify(
							`${last ? formatWorkflowReport(last) : "Company runtime: no active run."}\nNo rollback performed.`,
							last?.error ? "warning" : "info",
						);
						return;
					}
					if (name === "workflow" && argument.startsWith("run ")) {
						if (pending) {
							ctx.ui.notify("Company runtime: a run is already active.", "warning");
							return;
						}
						if (!ctx.isIdle()) {
							ctx.ui.notify("Company runtime: wait for the parent agent to become idle.", "warning");
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
								"Run trusted STANDARD workflow?",
								`Allowed files: ${config.files.allowed_paths.join(", ")}\nChecks (may mutate files; not sandboxed):\n${config.verification.checks.map((check) => JSON.stringify({ executable: check.executable, argv: check.args, cwd: check.cwd })).join("\n")}\nCredential environment is filtered. No automatic rollback/commit. Trust only reviewed executables and scripts.`,
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
								createAgents: async (store) => {
									const executor = await PiAgentExecutor.create({
										cwd: ctx.cwd,
										agentDir,
										config,
										modelRuntime: models,
										audit: store,
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
						ctx.ui.notify("Company runtime: preflight started. Status/cancel remain available.", "info");
						return;
					}
					if (argument && !(name === "workflow" && argument === "status"))
						throw new Error(`Usage: /${name}${name === "workflow" ? " [run <goal>|status|cancel]" : ""}`);
					await report(ctx);
				} catch {
					ctx.ui.notify(
						"Company runtime command failed; check configuration, state integrity and writer ownership.",
						"error",
					);
				}
			},
		});
	}
	pi.on("input", () => (pending ? { action: "handled" } : { action: "continue" }));
	pi.on("tool_call", () =>
		pending
			? { block: true, reason: "Company workflow owns workspace; use /workflow cancel", terminate: true }
			: undefined,
	);
	pi.on("user_bash", () =>
		pending
			? {
					result: {
						output: "Company workflow owns workspace; user bash blocked",
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
