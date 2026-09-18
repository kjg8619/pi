import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { PiAgentExecutor } from "../../company-runtime/src/agent-runner.ts";
import { classifyRequest, selectWorkflow } from "../../company-runtime/src/classification.ts";
import { parseRuntimeConfig, type RuntimeConfig } from "../../company-runtime/src/config.ts";
import { formatEvidencePack, projectEvidencePack } from "../../company-runtime/src/evidence.ts";
import { proposeExecutionMode } from "../../company-runtime/src/execution-contract.ts";
import { buildTaskContract } from "../../company-runtime/src/task-contract.ts";
import { StandardWorkflow } from "../../company-runtime/src/workflow.ts";

/**
 * One deterministic eval case. `oracle` is Host-owned and lives outside the Runtime:
 * a Runtime COMPLETED claim never implies eval PASS, and the implementation agent cannot edit the oracle.
 */
export interface WeavraEvalFixture {
	id: string;
	workflow: "QUICK" | "STANDARD";
	goal: string;
	statements: string[];
	allowedPaths: string[];
	checkIds: string[];
	files: Record<string, string>;
	oracle(context: { workspace: string; status: string | null }): string[];
}

export interface WeavraEvalOptions {
	/** Weavra agent directory (auth.json/models.json) for the worker profiles. */
	agentDir: string;
	provider?: string;
	model?: string;
	timeoutMs?: number;
}

export interface WeavraEvalResult {
	fixture: string;
	workflow: string;
	runtimeStatus: string | null;
	runtimeError: string | null;
	oraclePass: boolean;
	oracleFailures: string[];
	falseCompletion: boolean;
	changedFiles: string[];
	durationMs: number;
	reportedTokens: number | null;
	toolCalls: number | null;
	measurementPresent: boolean;
	taskContractDigest: string | null;
	evidencePack: string;
}

function git(cwd: string, args: string[]): void {
	execFileSync(
		"git",
		["-c", "core.hooksPath=/dev/null", "-c", "user.name=Eval", "-c", "user.email=eval@invalid", ...args],
		{
			cwd,
			stdio: "pipe",
			env: { PATH: process.env.PATH ?? "", HOME: cwd, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
		},
	);
}

/** Isolated Git workspace + trusted config + registered required check for one fixture. */
export function materializeFixture(
	fixture: WeavraEvalFixture,
	root: string,
	options: { provider: string; model: string },
): { cwd: string; config: RuntimeConfig } {
	const cwd = join(root, fixture.id);
	mkdirSync(join(cwd, ".ai"), { recursive: true });
	for (const [path, content] of Object.entries(fixture.files)) {
		mkdirSync(dirname(join(cwd, path)), { recursive: true });
		writeFileSync(join(cwd, path), content);
	}
	const config = parseRuntimeConfig(
		JSON.stringify({
			schemaVersion: 1,
			models: {
				profiles: {
					coding: { provider: options.provider, model: options.model },
					reasoning: { provider: options.provider, model: options.model },
				},
			},
			runtime: { workflow: fixture.workflow },
			files: { allowed_paths: fixture.allowedPaths },
			verification: {
				checks: fixture.checkIds.map((id) => ({
					id,
					kind: "test",
					executable: process.execPath,
					args: ["--test", "test/eval.test.mjs"],
				})),
			},
		}),
	);
	writeFileSync(
		join(cwd, ".ai/config.yaml"),
		[
			"schemaVersion: 1",
			"models:",
			"  profiles:",
			`    coding: { provider: ${options.provider}, model: ${options.model} }`,
			`    reasoning: { provider: ${options.provider}, model: ${options.model} }`,
			`runtime: { workflow: ${fixture.workflow} }`,
			`files: { allowed_paths: [${fixture.allowedPaths.join(", ")}] }`,
			"",
		].join("\n"),
	);
	git(cwd, ["init", "-q"]);
	git(cwd, ["add", "--", "."]);
	git(cwd, ["commit", "-qm", `eval fixture ${fixture.id}`]);
	return { cwd, config };
}

/**
 * Runs one fixture through the real Runtime code path with the configured provider profiles.
 * Paid provider runs are opt-in: nothing here runs inside the default regression suite.
 */
export async function runWeavraFixture(
	fixture: WeavraEvalFixture,
	options: WeavraEvalOptions,
): Promise<WeavraEvalResult> {
	const provider = options.provider ?? process.env.WEAVRA_EVAL_PROVIDER ?? "commandcode";
	const model = options.model ?? process.env.WEAVRA_EVAL_MODEL ?? "deepseek/deepseek-v4.1-flash";
	const root = mkdtempSync(join(tmpdir(), `weavra-eval-${fixture.id}-`));
	try {
		const { cwd, config } = materializeFixture(fixture, root, { provider, model });
		const models = await ModelRuntime.create({
			authPath: join(options.agentDir, "auth.json"),
			modelsPath: join(options.agentDir, "models.json"),
			allowModelNetwork: false,
			signal: AbortSignal.timeout(60_000),
		});
		const proposal = proposeExecutionMode(fixture.goal);
		if (proposal.requiresConfirmation || !proposal.mode) throw new Error(proposal.reason);
		const { classification } = classifyRequest(fixture.goal);
		const selection = selectWorkflow(classification, config.runtime.workflow);
		const taskContract = buildTaskContract({
			goal: fixture.goal,
			statements: fixture.statements,
			workflow: selection.workflow,
			config,
		});
		const startedAt = Date.now();
		const workflow = new StandardWorkflow({
			cwd,
			goal: fixture.goal,
			taskContract,
			executionMode: proposal.mode,
			config,
			signal: AbortSignal.timeout(options.timeoutMs ?? 900_000),
			createAgents: async (store, quickScope, r2RunId, r3Scope, executionContract) => {
				const executor = await PiAgentExecutor.create({
					executionContract,
					cwd,
					agentDir: options.agentDir,
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
		const report = await workflow.execute();
		const durationMs = Date.now() - startedAt;
		const state = JSON.parse(readFileSync(join(cwd, ".ai/state.json"), "utf8")) as {
			runs: Array<Parameters<typeof projectEvidencePack>[0]["run"]>;
		};
		const run = state.runs.at(-1);
		const pack = run ? projectEvidencePack({ run, report }) : undefined;
		const reportedTokens = pack
			? pack.workers.reduce<number | null>(
					(sum, worker) => (sum === null || worker.reportedTokens === null ? null : sum + worker.reportedTokens),
					0,
				)
			: null;
		const oracleFailures = fixture.oracle({ workspace: cwd, status: report.run?.status ?? null });
		return {
			fixture: fixture.id,
			workflow: selection.workflow,
			runtimeStatus: report.run?.status ?? null,
			runtimeError: report.error ?? null,
			oraclePass: oracleFailures.length === 0,
			oracleFailures,
			falseCompletion: report.run?.status === "COMPLETED" && oracleFailures.length > 0,
			changedFiles: report.changedFiles,
			durationMs,
			reportedTokens,
			toolCalls: pack?.workers.reduce((sum, worker) => sum + worker.toolCalls, 0) ?? null,
			measurementPresent: (run?.workerMeasurements?.length ?? 0) > 0,
			taskContractDigest: run?.taskContractDigest ?? null,
			evidencePack: pack ? formatEvidencePack(pack) : "",
		};
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}
