import { mkdirSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { type Context, fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FitnessRecordStore } from "../../../company-runtime/src/fitness-records.ts";
import type { FitnessBudget } from "../../../company-runtime/src/fitness-types.ts";
import { FITNESS_CORPUS, validateFitnessFixture } from "../../../evals/src/fitness-corpus.ts";
import { type FitnessFauxBehavior, fitnessFauxResponse } from "../../../evals/src/fitness-faux.ts";
import { createFitnessTarget, type FitnessRunnerOptions, runFitnessMatrix } from "../../../evals/src/fitness-runner.ts";
import { createHarness, type Harness } from "./harness.ts";

let harness: Harness;
let options: FitnessRunnerOptions;
let sessions: string[];
beforeEach(async () => {
	harness = await createHarness({ models: [{ id: "fitness", contextWindow: 128000, maxTokens: 8192 }] });
	const root = realpathSync(harness.tempDir);
	const agentDir = join(root, "fitness-agent");
	mkdirSync(agentDir, { mode: 0o700 });
	const store = await FitnessRecordStore.open(join(root, "fitness-results"), { create: true });
	sessions = [];
	options = {
		models: harness.session.modelRuntime,
		target: createFitnessTarget(harness.session.modelRuntime, "faux", "fitness", "disabled"),
		agentDir,
		store,
		kind: "FAUX",
		sandbox: "disabled",
		budget: { maxFixtures: 10, maxWorkerCalls: 32, maxTotalTokens: 1000000 },
		fixtureIds: FITNESS_CORPUS.map((fixture) => fixture.id),
		onRequest: (request) => {
			const publish = request.onSessionCreated;
			request.onSessionCreated = async (reference) => {
				sessions.push(reference.sessionFile);
				await publish?.(reference);
			};
		},
	};
});
afterEach(() => harness.cleanup());
function responses(behavior: FitnessFauxBehavior) {
	harness.setResponses(
		Array.from({ length: 256 }, () => (context: Context) => fitnessFauxResponse(behavior, context)),
	);
}

describe("Fitness through actual SDK and Runtime boundaries", () => {
	it("executes the complete good corpus, independent rejection, fresh repair and live cancellation without transcripts", async () => {
		responses("GOOD");
		const result = await runFitnessMatrix(options);
		expect(result.status).toBe("COMPLETED");
		expect(result.fixtures.map((fixture) => [fixture.fixtureId, fixture.oracle])).toEqual(
			FITNESS_CORPUS.map((fixture) => [fixture.id, "PASS"]),
		);
		expect(result.fixtures[0].efficiency.usage).toMatchObject({
			state: "KNOWN",
			reasoning: null,
			detailSource: "SDK_NORMALIZED",
		});
		expect(result.fixtures[0].efficiency.usage.cacheRead).toBeGreaterThan(0);
		const review = result.fixtures.find((fixture) => fixture.fixtureId === "F06")!;
		expect(review.terminalStatus).toBe("BLOCKED");
		expect(review.falseCompletion).toBe(false);
		const repair = result.fixtures.find((fixture) => fixture.fixtureId === "F07")!;
		expect(repair.reliability.repairCount).toBe(1);
		expect(repair.efficiency.workerInvocations).toBe(3);
		expect(result.fixtures.at(-1)?.reliability).toMatchObject({ cancellation: "CANCELLED", cleanup: "CONFIRMED" });
		expect(sessions.every((reference) => reference.startsWith("memory:"))).toBe(true);
		expect(new Set(sessions).size).toBe(
			result.fixtures.reduce((total, fixture) => total + fixture.efficiency.workerInvocations, 0),
		);
		expect(
			readdirSync(options.agentDir, { recursive: true }).filter((path) => String(path).endsWith(".jsonl")),
		).toEqual([]);
		expect(await options.store.read(result.id)).toEqual(result);
	}, 30000);
	it("rejects a forbidden mutation and preserves the source boundary", async () => {
		responses("CONTRACT_VIOLATOR");
		const result = await runFitnessMatrix({ ...options, fixtureIds: ["F02"] });
		expect(result.fixtures[0]).toMatchObject({
			terminalStatus: "FAILED",
			falseCompletion: false,
			contract: { scopeViolations: 0, forbiddenMutationAttempts: 1 },
			reliability: { cleanup: "CONFIRMED" },
		});
	});
	it("keeps failed provider usage UNKNOWN, stops further calls, and excludes raw error secrets", async () => {
		responses("UNRELIABLE");
		const result = await runFitnessMatrix({ ...options, fixtureIds: ["F01", "F02"] });
		expect(result.status).toBe("BUDGET_EXHAUSTED");
		expect(result.fixtures).toHaveLength(1);
		expect(result.fixtures[0].efficiency.usage).toMatchObject({ state: "UNKNOWN", total: null });
		expect(result.fixtures[0].reliability.providerErrors).toBe(1);
		expect(JSON.stringify(await options.store.read(result.id))).not.toContain("FAUX_PRIVATE_CREDENTIAL_MARKER");
	});
	it("retains partial known usage but stops after a later turn has only SDK zero defaults", async () => {
		harness.setResponses(
			Array.from({ length: 256 }, (_, index) => (context: Context) => {
				if (index === 1) throw new Error("FAUX_PRIVATE_CREDENTIAL_MARKER");
				return fitnessFauxResponse("GOOD", context);
			}),
		);
		const result = await runFitnessMatrix({ ...options, fixtureIds: ["F01", "F02"] });
		expect(result.status).toBe("BUDGET_EXHAUSTED");
		expect(result.fixtures).toHaveLength(1);
		expect(result.fixtures[0].efficiency.usage).toMatchObject({
			state: "UNKNOWN",
			input: null,
			output: null,
			total: null,
			cacheRead: null,
			cacheWrite: null,
			reasoning: null,
		});
		expect(result.fixtures[0].efficiency.usage.knownTotal).toBeGreaterThan(0);
		expect(sessions).toHaveLength(1);
		expect(await options.store.read(result.id)).toEqual(result);
		expect(JSON.stringify(result)).not.toContain("FAUX_PRIVATE_CREDENTIAL_MARKER");
	});
	it("rejects an unrelated in-scope addition despite complete checks, handoff and independent review", async () => {
		harness.setResponses(
			Array.from({ length: 256 }, () => (context: Context) => {
				const response = fitnessFauxResponse("GOOD", context);
				const handoff = response.content.find((part) => part.type === "toolCall" && part.name === "submit_handoff");
				if (handoff?.type === "toolCall") {
					if (
						!context.messages.some(
							(message) => message.role === "toolResult" && message.toolName === "runtime_write",
						)
					)
						return fauxAssistantMessage(
							fauxToolCall("runtime_write", {
								path: "src/unrelated.mjs",
								operation: "create",
								mustNotExist: true,
								content: "export const unrelated = true;\n",
							}),
							{ stopReason: "toolUse" },
						);
					handoff.arguments.changed_files = [
						...(handoff.arguments.changed_files as string[]),
						"src/unrelated.mjs",
					];
				}
				return response;
			}),
		);
		const result = await runFitnessMatrix({ ...options, fixtureIds: ["F03"] });
		expect(result.fixtures[0]).toMatchObject({
			terminalStatus: "COMPLETED",
			oracle: "FAIL",
			falseCompletion: true,
			checks: { passed: 2, failed: 0 },
			contract: { scopeViolations: 0 },
			tools: { runtimeWrite: 1 },
		});
	});
	it("detects canonical false completion despite a schema-valid independent Reviewer PASS", async () => {
		responses("FALSE_COMPLETER");
		const result = await runFitnessMatrix({ ...options, fixtureIds: ["F06"] });
		expect(result.fixtures[0]).toMatchObject({ terminalStatus: "COMPLETED", oracle: "FAIL", falseCompletion: true });
	});
	it.each([
		{ maxFixtures: 1, maxWorkerCalls: 4, maxTotalTokens: 100000 },
		{ maxFixtures: 2, maxWorkerCalls: 1, maxTotalTokens: 100000 },
		{ maxFixtures: 2, maxWorkerCalls: 4, maxTotalTokens: 1 },
	])("preserves the first fixture when the next admission exceeds %j", async (budget: FitnessBudget) => {
		responses("GOOD");
		const result = await runFitnessMatrix({ ...options, fixtureIds: ["F01", "F02"], budget });
		expect(result.status).toBe("BUDGET_EXHAUSTED");
		expect(result.fixtures).toHaveLength(1);
		expect(result.fixtures[0].oracle).toBe("PASS");
		expect(await options.store.read(result.id)).toEqual(result);
	});
	it("does not invoke a Reviewer beyond the shared matrix worker budget", async () => {
		responses("GOOD");
		const result = await runFitnessMatrix({
			...options,
			fixtureIds: ["F03"],
			budget: { ...options.budget, maxWorkerCalls: 1 },
		});
		expect(result.status).toBe("BUDGET_EXHAUSTED");
		expect(result.fixtures[0].terminalStatus).not.toBe("COMPLETED");
		expect(sessions).toHaveLength(1);
	});
	it("admits no paid work when cost is UNKNOWN and a monetary ceiling is requested", async () => {
		responses("GOOD");
		const result = await runFitnessMatrix({ ...options, budget: { ...options.budget, maxCostUsd: 1 } });
		expect(result.status).toBe("BUDGET_EXHAUSTED");
		expect(result.fixtures).toEqual([]);
		expect(sessions).toEqual([]);
	});
	it("rejects changed target identity and actual execution without paid consent before any invocation", async () => {
		responses("GOOD");
		await expect(
			runFitnessMatrix({ ...options, target: { ...options.target, endpointIdentity: `sha256:${"0".repeat(64)}` } }),
		).rejects.toThrow();
		await expect(runFitnessMatrix({ ...options, kind: "ACTUAL" })).rejects.toThrow();
		expect(sessions).toEqual([]);
		expect(await options.store.list()).toEqual([]);
	});
	it("rejects oracle, private, runtime and traversal paths in corpus input", () => {
		for (const path of ["oracle", "oracle/check.mjs", "private", ".ai", ".git", "../escape", "fixture-context.txt"])
			expect(() => validateFitnessFixture({ ...FITNESS_CORPUS[0], allowedPaths: [path] })).toThrow();
	});
	it("rejects invalid corpus budgets and expected mutations outside the allowed scope", () => {
		const fixture = FITNESS_CORPUS.find((item) => item.id === "F03")!;
		expect(() => validateFitnessFixture({ ...fixture, budget: { ...fixture.budget, maxWorkerCalls: 0 } })).toThrow();
		expect(() => validateFitnessFixture({ ...fixture, allowedPaths: ["src/units.mjs"] })).toThrow();
	});
});
