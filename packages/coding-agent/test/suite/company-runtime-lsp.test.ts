import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Context, fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PiAgentExecutor } from "../../../company-runtime/src/agent-runner.ts";
import { trustedReviewEvidenceRefs } from "../../../company-runtime/src/agent-tools.ts";
import { parseRuntimeConfig, type RuntimeConfig } from "../../../company-runtime/src/config.ts";
import type { VerificationResult } from "../../../company-runtime/src/contracts.ts";
import { LspManager } from "../../../company-runtime/src/lsp/manager.ts";
import type { AgentExecutionRequest } from "../../../company-runtime/src/ports.ts";
import { RegisteredVerifier } from "../../../company-runtime/src/verification.ts";
import { StandardWorkflow } from "../../../company-runtime/src/workflow.ts";
import { createHarness, getMessageText, type Harness } from "./harness.ts";

let harness: Harness, cwd: string, agentDir: string, config: RuntimeConfig;
let results: VerificationResult[];
const server = fileURLToPath(new URL("../../../company-runtime/test/fixtures/lsp-server.mjs", import.meta.url));
function input(context: Context): AgentExecutionRequest {
	return JSON.parse(
		getMessageText(context.messages.find((message) => message.role === "user")),
	) as AgentExecutionRequest;
}
function tool(name: string, args: Record<string, unknown>) {
	return fauxAssistantMessage(fauxToolCall(name, args), { stopReason: "toolUse" });
}
function submit(context: Context) {
	const request = input(context);
	if (request.role === "Reviewer") {
		const refs = trustedReviewEvidenceRefs(request.verification);
		return tool("submit_review", {
			runId: request.runId,
			task: request.task.id,
			revision: request.revision,
			role: request.role,
			result: "PASS",
			issues: [],
			diffDigest: request.verification.diffDigest,
			evidenceRefs: refs,
			requirements: request.task.requirements.map((requirement) => ({
				requirement,
				status: "MET",
				evidenceRefs: refs,
			})),
		});
	}
	return tool("submit_handoff", {
		runId: request.runId,
		task: request.task.id,
		revision: request.revision,
		role: request.role,
		summary: "Edited target",
		changed_files:
			request.role === "Executor" && request.scope.risk === "R0"
				? []
				: [request.task.goal.includes("package.json") ? "package.json" : "src/app.ts"],
		assumptions: [],
		tests_run: [],
		known_risks: [],
		unresolved: [],
		...(request.role === "Executor"
			? {
					requirements: request.task.requirements.map((requirement) => ({
						requirement,
						status: "MET",
						explanation: "Applied exact change",
					})),
				}
			: {}),
	});
}
function git(...args: string[]) {
	return execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
		cwd,
		env: { PATH: process.env.PATH, HOME: agentDir, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
		stdio: "pipe",
	}).toString();
}
function create(goal = "Fix typo in src/app.ts") {
	return new StandardWorkflow({
		cwd,
		goal,
		config,
		approval: {
			requestApproval: async (request) => ({
				runId: request.runId,
				actionId: request.actionId,
				actionDigest: request.actionDigest,
				configDigest: request.configDigest,
				expiresAt: request.expiresAt,
				approved: true,
			}),
		},
		createAgents: async (store, quickScope, r2RunId, r3Scope) => {
			const executor = await PiAgentExecutor.create({
				cwd,
				agentDir,
				config,
				modelRuntime: harness.session.modelRuntime,
				audit: store,
				quickScope,
				r2RunId,
				r3Scope,
			});
			return { executor, policy: executor.policyContext };
		},
	});
}
function state() {
	return JSON.parse(readFileSync(join(cwd, ".ai/state.json"), "utf8")) as {
		actions: Array<{ decision: { role: string; risk: string; decision: string }; status: string }>;
	};
}
beforeEach(async () => {
	harness = await createHarness({ models: [{ id: "coding" }, { id: "review" }] });
	cwd = join(harness.tempDir, "project");
	agentDir = join(harness.tempDir, "workers");
	for (const path of ["src", "scripts", ".ai"]) mkdirSync(join(cwd, path), { recursive: true });
	mkdirSync(agentDir);
	config = parseRuntimeConfig(
		JSON.stringify({
			schemaVersion: 1,
			models: {
				profiles: {
					coding: { provider: "faux", model: "coding" },
					reasoning: { provider: "faux", model: "review" },
				},
			},
			files: { allowed_paths: ["src", "package.json"] },
			verification: {
				checks: [
					{
						id: "regression",
						kind: "test",
						executable: process.execPath,
						args: ["scripts/check.mjs"],
						required: true,
					},
				],
			},
			code_intelligence: {
				lsp: {
					enabled: true,
					servers: [
						{
							id: "fake",
							executable: process.execPath,
							args: [server, "normal", join(agentDir, "lsp-trace"), join(agentDir, "crash-marker")],
							extensions: [".ts", ".json"],
							timeout_ms: 2000,
						},
					],
				},
			},
		}),
	);
	writeFileSync(join(cwd, ".ai/config.yaml"), JSON.stringify(config));
	writeFileSync(join(cwd, ".gitignore"), ".ai/state.json\n.ai/tasks.json\n.ai/writer.lock\n");
	writeFileSync(join(cwd, "src/app.ts"), 'export const value = "foo";\n');
	writeFileSync(join(cwd, "src/target.ts"), "const value = 1;\n");
	writeFileSync(join(cwd, "package.json"), '{"name":"foo"}\n');
	writeFileSync(
		join(cwd, "scripts/check.mjs"),
		'console.log("CHECK_PASSED"); process.exit(process.argv[2] === "fail" ? 7 : 0);\n',
	);
	git("init", "-q");
	git("add", "--", ".ai/config.yaml", ".gitignore", "src", "scripts/check.mjs", "package.json");
	git(
		"-c",
		"user.name=Fixture",
		"-c",
		"user.email=fixture@invalid",
		"-c",
		"commit.gpgsign=false",
		"commit",
		"-m",
		"LSP baseline",
	);
	results = [];
	const verify = RegisteredVerifier.prototype.verify;
	vi.spyOn(RegisteredVerifier.prototype, "verify").mockImplementation(async function (
		this: RegisteredVerifier,
		request,
	) {
		const result = await verify.call(this, request);
		results.push(structuredClone(result));
		return result;
	});
});
afterEach(() => {
	vi.restoreAllMocks();
	harness.cleanup();
});

describe("V0.3B actual SDK/faux + real stdio server + unchanged process checks", () => {
	it.each(["QUICK", "STANDARD/R1", "STANDARD/R2"])(
		"%s receives advisory errors and read-only navigation without weakening guards",
		async (mode) => {
			const path = mode === "STANDARD/R2" ? "package.json" : "src/app.ts";
			if (mode !== "QUICK") config.runtime.workflow = "STANDARD";
			harness.setResponses([
				(context) => {
					expect(
						context.tools?.filter((item) => item.name.startsWith("runtime_lsp_")).map((item) => item.name),
					).toHaveLength(4);
					expect(context.tools?.some((item) => /rename|codeAction|formatting/.test(item.name))).toBe(false);
					return tool("runtime_lsp_symbols", { path });
				},
				tool("runtime_read", { path, anchors: true }),
				(context) => {
					const output = getMessageText(context.messages.at(-1)).split("\n");
					return tool("runtime_edit", {
						path,
						oldText: "foo",
						newText: "bar",
						fileDigest: output[0].slice(12),
						anchor: output[1].split(" ")[0],
					});
				},
				submit,
				...(mode !== "QUICK"
					? [
							(context: Context) => {
								const request = input(context);
								if (request.role !== "Reviewer") throw new Error("Expected Reviewer");
								expect(
									context.tools?.some((item) =>
										["runtime_write", "runtime_edit", "runtime_delete"].includes(item.name),
									),
								).toBe(false);
								const refs = trustedReviewEvidenceRefs(request.verification);
								expect(request.verification.lspEvidence?.[0]).toMatchObject({
									status: "AVAILABLE",
									serverId: "fake",
								});
								expect(request.verification.lspEvidence?.[0].diagnostics[0].severity).toBe("error");
								expect(request.verification.reviewContext?.evidence.map((item) => item.ref).sort()).toEqual(
									[...refs].sort(),
								);
								expect(refs.filter((ref) => ref.startsWith("lsp:"))).toHaveLength(1);
								return tool("runtime_lsp_definition", { path, line: 1, column: 1 });
							},
							submit,
						]
					: []),
			]);
			const report = await create(
				mode === "STANDARD/R2" ? "Update dependency name in package.json" : undefined,
			).execute();
			expect(report.error).toBeUndefined();
			expect(report.run?.status).toBe("COMPLETED");
			expect(report.run?.risk).toBe(mode === "STANDARD/R2" ? "R2" : "R1");
			expect(report.run?.verification.map((check) => [check.status, check.exitCode])).toEqual([
				["PASS", 0],
				["PASS", 0],
			]);
			expect(results).toHaveLength(2);
			expect(results.every((result) => result.lspEvidence?.[0].diagnostics.length === 2)).toBe(true);
			expect(
				state()
					.actions.filter((action) => action.decision.role !== "Verifier" && action.decision.risk !== "R0")
					.map((action) => action.decision.risk),
			).toEqual([mode === "STANDARD/R2" ? "R2" : "R1"]);
			expect(existsSync(join(cwd, ".ai/writer.lock"))).toBe(false);
		},
	);
	it.each(["missing", "push-empty", "request-timeout"])(
		"%s remains advisory without manufacturing process PASS",
		async (mode) => {
			config.runtime.workflow = "STANDARD";
			const server = config.code_intelligence!.lsp.servers[0];
			if (mode === "missing") server.executable = "missing-weavra-language-server";
			else {
				server.args[1] = mode;
				server.timeout_ms = mode === "request-timeout" ? 250 : 2000;
			}
			harness.setResponses([
				tool("runtime_edit", { path: "src/app.ts", oldText: "foo", newText: "bar" }),
				submit,
				(context) => {
					const request = input(context);
					if (request.role !== "Reviewer") throw new Error("Expected Reviewer");
					expect(request.verification.lspEvidence?.[0].status).toBe(
						mode === "missing" ? "UNAVAILABLE" : mode === "push-empty" ? "PARTIAL" : "ERROR",
					);
					return submit(context);
				},
			]);
			const report = await create().execute();
			expect(report.run?.status).toBe("COMPLETED");
			expect(report.run?.verification).toHaveLength(2);
			expect(report.run?.verification.every((check) => check.stdout?.includes("CHECK_PASSED"))).toBe(true);
		},
	);
	it("diagnostic query success cannot override a failing required process check", async () => {
		config.verification.checks[0].args.push("fail");
		harness.setResponses([tool("runtime_edit", { path: "src/app.ts", oldText: "foo", newText: "bar" }), submit]);
		const report = await create().execute();
		expect(report.run?.status).toBe("BLOCKED");
		expect(report.run?.verification[0]).toMatchObject({ status: "FAIL", exitCode: 7 });
		expect(results[0].lspEvidence?.[0].status).toBe("AVAILABLE");
		expect(report.run?.review).toBeUndefined();
	});
	it("QUICK/R0 uses LSP read tools without gaining mutation or Reviewer authority", async () => {
		harness.setResponses([
			(context) => {
				expect(context.tools?.some((item) => ["runtime_edit", "runtime_write"].includes(item.name))).toBe(false);
				return tool("runtime_lsp_symbols", { path: "src/app.ts" });
			},
			submit,
		]);
		const report = await create("Explain src/app.ts").execute();
		expect(report.run?.status).toBe("COMPLETED");
		expect(report.run?.risk).toBe("R0");
		expect(report.changedFiles).toEqual([]);
		expect(results[0].lspEvidence?.[0]).toMatchObject({
			status: "UNAVAILABLE",
			reason: expect.stringContaining("No changed files"),
		});
	});
	it("worker LSP Policy denial happens before server start", async () => {
		harness.setResponses([tool("runtime_lsp_symbols", { path: ".ai/config.yaml" })]);
		const report = await create().execute();
		expect(report.run?.status).toBe("FAILED");
		expect(state().actions[0]).toMatchObject({ status: "DENIED", decision: { risk: "R0", decision: "DENY" } });
		expect(existsSync(join(agentDir, "lsp-trace"))).toBe(false);
	});
	it("workspace-wide symbol scope cannot be smuggled through the document-only schema", async () => {
		harness.setResponses([tool("runtime_lsp_symbols", { path: "src/app.ts", scope: "workspace" })]);
		const report = await create().execute();
		expect(report.run?.status).toBe("FAILED");
		expect(existsSync(join(agentDir, "lsp-trace"))).toBe(false);
		expect(report.changedFiles).toEqual([]);
	});
	it("LSP enabled still requires at least one required process check", async () => {
		config.verification.checks = [];
		const report = await create().execute();
		expect(report.error).toContain("required verification check");
		expect(harness.faux.state.callCount).toBe(0);
	});
	it("workspace changes after diagnostic response mark LSP evidence STALE and preserve check freshness guards", async () => {
		const diagnostics = LspManager.prototype.diagnostics;
		vi.spyOn(LspManager.prototype, "diagnostics").mockImplementation(async function (this: LspManager, request) {
			const result = await diagnostics.call(this, request);
			writeFileSync(join(cwd, "src/target.ts"), "external\n");
			return result;
		});
		harness.setResponses([tool("runtime_edit", { path: "src/app.ts", oldText: "foo", newText: "bar" }), submit]);
		const report = await create().execute();
		expect(report.run?.status).toBe("BLOCKED");
		expect(results[0].lspEvidence?.[0].status).toBe("STALE");
		expect(results[0].checks[0].status).toBe("FAIL");
		expect(results[0].lspEvidence?.[0].diffDigest).not.toBe(results[0].diffDigest);
	});
	it("cancel during a live LSP query settles before writer release", async () => {
		config.code_intelligence!.lsp.servers[0].args[1] = "request-timeout";
		harness.setResponses([tool("runtime_lsp_symbols", { path: "src/app.ts" })]);
		const workflow = create();
		const job = workflow.execute();
		await vi.waitFor(() =>
			expect(
				existsSync(join(agentDir, "lsp-trace")) &&
					readFileSync(join(agentDir, "lsp-trace"), "utf8").includes("textDocument/documentSymbol"),
			).toBe(true),
		);
		expect(existsSync(join(cwd, ".ai/writer.lock"))).toBe(true);
		workflow.cancel();
		const report = await job;
		expect(report.run?.status).toBe("CANCELLED");
		expect(existsSync(join(cwd, ".ai/writer.lock"))).toBe(false);
		const trace = readFileSync(join(agentDir, "lsp-trace"), "utf8")
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line) as { pid: number });
		for (const pid of new Set(trace.map((item) => item.pid))) expect(() => process.kill(pid, 0)).toThrow();
	});
	it("cancellation in verifier LSP preserves already-executed process outcomes", async () => {
		config.code_intelligence!.lsp.servers[0].args[1] = "request-timeout";
		harness.setResponses([tool("runtime_edit", { path: "src/app.ts", oldText: "foo", newText: "bar" }), submit]);
		const workflow = create();
		const job = workflow.execute();
		await vi.waitFor(() =>
			expect(
				existsSync(join(agentDir, "lsp-trace")) &&
					readFileSync(join(agentDir, "lsp-trace"), "utf8").includes("textDocument/diagnostic"),
			).toBe(true),
		);
		workflow.cancel();
		const report = await job;
		expect(report.run?.status).toBe("CANCELLED");
		expect(report.run?.verification[0]).toMatchObject({
			status: "FAIL",
			exitCode: 0,
			stdout: expect.stringContaining("CHECK_PASSED"),
		});
		expect(results[0].lspEvidence?.[0]).toMatchObject({ status: "ERROR", reason: "LSP diagnostics cancelled" });
		expect(existsSync(join(cwd, ".ai/writer.lock"))).toBe(false);
	});
	it("R3 retains one-use approval and Reviewer read-only tools with LSP enabled", async () => {
		harness.setResponses([
			(context) => {
				expect(context.tools?.some((item) => ["runtime_write", "runtime_edit"].includes(item.name))).toBe(false);
				return tool("runtime_lsp_symbols", { path: "src/app.ts" });
			},
			tool("runtime_delete", { path: "src/app.ts" }),
			submit,
			(context) => {
				const request = input(context);
				if (request.role !== "Reviewer") throw new Error("Expected Reviewer");
				expect(request.verification.lspEvidence?.[0].status).toBe("UNAVAILABLE");
				expect(
					context.tools?.some((item) => ["runtime_write", "runtime_edit", "runtime_delete"].includes(item.name)),
				).toBe(false);
				return submit(context);
			},
		]);
		const report = await create("Delete file src/app.ts").execute();
		expect(report.error).toBeUndefined();
		expect(report.run?.status).toBe("COMPLETED");
		expect(report.run?.approvals?.map((record) => record.status)).toEqual(["CONSUMED"]);
		expect(report.run?.verification.map((check) => check.status)).toEqual(["PASS", "PASS"]);
	});
	it("unconfirmed LSP cleanup prevents COMPLETE and retains the writer lease", async () => {
		vi.spyOn(LspManager.prototype, "safeToRelease", "get").mockReturnValue(false);
		harness.setResponses([tool("runtime_edit", { path: "src/app.ts", oldText: "foo", newText: "bar" }), submit]);
		const report = await create().execute();
		expect(report.run?.status).not.toBe("COMPLETED");
		expect(report.error).toContain("cleanup unconfirmed");
		expect(existsSync(join(cwd, ".ai/writer.lock"))).toBe(true);
	});
});
