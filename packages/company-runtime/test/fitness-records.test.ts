import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	compareFitnessRuns,
	FitnessRecordStore,
	fitnessDigest,
	freezeFitnessRecord,
	passesFitnessCalibrationFixture,
	safeEndpointIdentity,
	validateFitnessRecord,
} from "../src/fitness-records.ts";
import type { FitnessFixtureResult, ProviderFitnessRun } from "../src/fitness-types.ts";

let directory: string;
beforeEach(async () => {
	directory = await realpath(await mkdtemp(join(tmpdir(), "fitness-records-")));
});
afterEach(async () => {
	await rm(directory, { recursive: true, force: true });
});
const digest = fitnessDigest("fixture");
function fixture(): FitnessFixtureResult {
	return {
		fixtureId: "F01",
		fixtureDigest: digest,
		runId: randomUUID(),
		taskContractDigest: digest,
		registeredCheckDigest: digest,
		configurationDigest: digest,
		terminalStatus: "COMPLETED",
		oracle: "PASS",
		falseCompletion: false,
		latencyMs: 12,
		ac: { met: 1, notMet: 0 },
		checks: { passed: 2, failed: 0, notRun: 0 },
		contract: {
			scopeViolations: 0,
			forbiddenMutationAttempts: 0,
			taskContractAdherence: true,
			strictReceiptRejections: 0,
			handoffRejections: 0,
			reviewRejections: 0,
		},
		tools: { calls: 2, invalidCalls: 0, retries: 0, runtimeRead: 1, runtimeEdit: 0, runtimeWrite: 0, lsp: 0 },
		reliability: {
			providerErrors: 0,
			authErrors: 0,
			transportErrors: 0,
			timeouts: 0,
			cancellation: "NOT_REQUESTED",
			repairCount: 0,
			reviewerRevisionCount: 0,
			cleanup: "CONFIRMED",
		},
		efficiency: {
			usage: { state: "KNOWN", input: 7, output: 3, total: 10, knownTotal: 10 },
			workerInvocations: 1,
			modelTurns: 2,
			httpAttempts: null,
			contextBytes: 64,
			costUsd: null,
		},
		evidenceDigest: digest,
	};
}
function record(overrides: Partial<ProviderFitnessRun> = {}): ProviderFitnessRun {
	return freezeFitnessRecord({
		schemaVersion: 1,
		id: randomUUID(),
		corpusRevision: "corpus-1",
		corpusDigest: digest,
		target: {
			provider: "test",
			model: "model",
			api: "test",
			endpointIdentity: digest,
			harnessRevision: "a".repeat(40),
			toolSchemaRevision: digest,
			promptRuntimeRevision: digest,
			configurationDigest: digest,
		},
		kind: "FAUX",
		startedAt: 1,
		completedAt: null,
		status: "RUNNING",
		budget: { maxFixtures: 2, maxWorkerCalls: 4, maxTotalTokens: 1000 },
		plannedFixtures: ["F01", "F02"],
		fixtures: [],
		environment: { platform: "test", arch: "test", node: "v1" },
		...overrides,
	});
}

describe("Fitness calibration admission", () => {
	it("requires adherence, clean scope, both checks, cleanup and known usage beyond oracle PASS", () => {
		const good = fixture();
		expect(passesFitnessCalibrationFixture(good)).toBe(true);
		const rejected: FitnessFixtureResult[] = [
			{ ...good, terminalStatus: "BLOCKED" },
			{ ...good, contract: { ...good.contract, taskContractAdherence: false } },
			{ ...good, contract: { ...good.contract, scopeViolations: 1 } },
			{ ...good, contract: { ...good.contract, forbiddenMutationAttempts: 1 } },
			{ ...good, checks: { passed: 1, failed: 1, notRun: 0 } },
			{ ...good, checks: { passed: 1, failed: 0, notRun: 1 } },
			{ ...good, reliability: { ...good.reliability, cleanup: "UNCONFIRMED" } },
			{
				...good,
				efficiency: {
					...good.efficiency,
					usage: { state: "UNKNOWN", input: null, output: null, total: null, knownTotal: 10 },
				},
			},
		];
		for (const result of rejected) expect(passesFitnessCalibrationFixture(result)).toBe(false);
	});
	it("refuses observed provider failures without fabricating an unobserved transport count", () => {
		const good = fixture();
		good.reliability.transportErrors = null;
		expect(passesFitnessCalibrationFixture(good)).toBe(true);
		for (const field of ["providerErrors", "authErrors", "transportErrors", "timeouts"] as const)
			expect(passesFitnessCalibrationFixture({ ...good, reliability: { ...good.reliability, [field]: 1 } })).toBe(
				false,
			);
		expect(good.reliability.transportErrors).toBeNull();
	});
});

describe("Fitness immutable records", () => {
	it("excludes endpoint userinfo/query/fragment from identity while distinguishing routes", () => {
		const safe = safeEndpointIdentity("https://example.test/v1");
		expect(safeEndpointIdentity("https://user:PRIVATE_KEY@example.test/v1?token=PRIVATE_KEY#PRIVATE_KEY")).toBe(safe);
		expect(safeEndpointIdentity("https://example.test/v2")).not.toBe(safe);
		expect(safe).not.toContain("PRIVATE_KEY");
		expect(() => safeEndpointIdentity("file:///secret")).toThrow();
	});
	it("canonicalizes object key order but binds exact fixture bytes", () => {
		expect(fitnessDigest({ a: 1, b: 2 })).toBe(fitnessDigest({ b: 2, a: 1 }));
		expect(fitnessDigest("line\n")).not.toBe(fitnessDigest("line\r\n"));
	});
	it("detects corrupted historical bodies and rejects future schema without migration", async () => {
		const store = await FitnessRecordStore.open(directory);
		const initial = record();
		await store.save(initial);
		const path = join(directory, `${initial.id}.json`);
		const bytes = await readFile(path);
		expect(await store.read(initial.id)).toEqual(initial);
		expect(await readFile(path)).toEqual(bytes);
		await writeFile(path, JSON.stringify({ ...initial, schemaVersion: 2 }), { mode: 0o600 });
		await expect(store.read(initial.id)).rejects.toThrow();
		expect(() => validateFitnessRecord({ ...initial, startedAt: 0 })).toThrow();
	});
	it("reads a frozen populated v1 record without rewriting its failed verdict or bytes", async () => {
		// This fixture predates corpus v2; do not regenerate it with current record helpers.
		const bytes = await readFile(new URL("./fixtures/fitness-v1.json", import.meta.url), "utf8");
		const historical = validateFitnessRecord(JSON.parse(bytes));
		const path = join(directory, `${historical.id}.json`);
		await writeFile(path, bytes, { mode: 0o600 });
		const store = await FitnessRecordStore.open(directory);
		const loaded = await store.read(historical.id);
		expect(loaded.corpusRevision).toBe("weavra-fitness-1");
		expect(loaded.status).toBe("CALIBRATION_FAILED");
		expect(compareFitnessRuns(loaded, loaded).left).toMatchObject({
			correctness: { executed: 1, oraclePass: 0, oracleFail: 1, falseCompletion: 1 },
			efficiency: { tokens: 6391, costUsd: null },
			reliability: { transportErrors: null },
		});
		expect(await store.list()).toEqual([loaded]);
		expect(await readFile(path, "utf8")).toBe(bytes);
	});
	it("preserves partial results and refuses terminal or settled-prefix rewrites", async () => {
		const store = await FitnessRecordStore.open(directory);
		const initial = record();
		await store.save(initial);
		const partial = freezeFitnessRecord({ ...initial, fixtures: [fixture()] });
		await store.save(partial);
		expect((await store.read(initial.id)).fixtures).toEqual(partial.fixtures);
		await expect(store.save(freezeFitnessRecord({ ...partial, fixtures: [] }))).rejects.toThrow();
		await expect(
			store.save(freezeFitnessRecord({ ...partial, fixtures: [{ ...partial.fixtures[0], latencyMs: 13 }] })),
		).rejects.toThrow();
		const final = freezeFitnessRecord({ ...partial, status: "BUDGET_EXHAUSTED", completedAt: 2 });
		await store.save(final);
		await store.save(final);
		await expect(store.save(freezeFitnessRecord({ ...final, status: "FAILED" }))).rejects.toThrow();
		expect(await store.read(initial.id)).toEqual(final);
	});
	it("binds target, corpus and budget across partial publication", async () => {
		const store = await FitnessRecordStore.open(directory);
		const initial = record();
		await store.save(initial);
		await expect(
			store.save(freezeFitnessRecord({ ...initial, target: { ...initial.target, model: "switched" } })),
		).rejects.toThrow();
		await expect(store.save(freezeFitnessRecord({ ...initial, corpusRevision: "corpus-2" }))).rejects.toThrow();
		await expect(
			store.save(freezeFitnessRecord({ ...initial, budget: { ...initial.budget, maxWorkerCalls: 9 } })),
		).rejects.toThrow();
	});
	it("records repeated evaluations separately without overwriting history", async () => {
		const store = await FitnessRecordStore.open(directory);
		const first = record();
		const second = record();
		await store.save(first);
		await store.save(second);
		expect(new Set((await store.list()).map((item) => item.id))).toEqual(new Set([first.id, second.id]));
	});
	it("rejects unknown fields instead of retaining Provider secrets or raw responses", () => {
		const initial = record();
		expect(() => freezeFitnessRecord({ ...initial, rawResponse: "PRIVATE_KEY" } as ProviderFitnessRun)).toThrow();
		expect(() =>
			freezeFitnessRecord({
				...initial,
				target: { ...initial.target, endpoint: "https://x?key=PRIVATE_KEY" },
			} as ProviderFitnessRun),
		).toThrow();
		expect(() =>
			freezeFitnessRecord({ ...initial, target: { ...initial.target, model: "model?key=PRIVATE_KEY" } }),
		).toThrow();
	});
	it("keeps UNKNOWN usage and cost distinct from a measured zero", () => {
		const value = fixture();
		value.efficiency.usage = { state: "UNKNOWN", input: null, output: null, total: null, knownTotal: 10 };
		const initial = record({ fixtures: [value] });
		expect(compareFitnessRuns(initial, initial).left.efficiency).toMatchObject({
			tokens: null,
			knownTokens: 10,
			costUsd: null,
		});
		value.efficiency.usage.total = 0;
		expect(() => record({ fixtures: [value] })).toThrow();
	});
	it("requires false completion only for a canonical completion with failed independent oracle", () => {
		const value = fixture();
		value.oracle = "FAIL";
		expect(() => record({ fixtures: [value] })).toThrow();
		value.falseCompletion = true;
		expect(record({ fixtures: [value] }).fixtures[0].falseCompletion).toBe(true);
		value.oracle = "INVALID";
		value.falseCompletion = null;
		expect(record({ fixtures: [value] }).fixtures[0].falseCompletion).toBeNull();
		expect(() => record({ status: "COMPLETED", completedAt: 2, fixtures: [fixture()] })).toThrow();
	});
	it("compares raw dimensions and marks mismatched corpus noncomparable", () => {
		const plannedFixtures = ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F09", "F10", "F08"];
		const left = record({
			status: "COMPLETED",
			completedAt: 2,
			budget: { maxFixtures: 10, maxWorkerCalls: 32, maxTotalTokens: 100000 },
			plannedFixtures,
			fixtures: plannedFixtures.map((fixtureId) => ({ ...fixture(), fixtureId })),
		});
		const right = record({ ...left, id: randomUUID() });
		const comparison = compareFitnessRuns(left, right);
		expect(comparison.comparable).toBe(true);
		expect(comparison.left.correctness).toMatchObject({ executed: 10, oraclePass: 10, falseCompletion: 0 });
		expect(compareFitnessRuns(left, record({ ...right, corpusDigest: fitnessDigest("different") })).comparable).toBe(
			false,
		);
	});
	it("keeps identical completed calibration subsets noncomparable as a full matrix", () => {
		const calibration = record({
			status: "COMPLETED",
			completedAt: 2,
			fixtures: [fixture(), { ...fixture(), fixtureId: "F02" }],
		});
		const comparison = compareFitnessRuns(calibration, record({ ...calibration, id: randomUUID() }));
		expect(comparison.comparable).toBe(false);
		expect(comparison.compatibility.fixtures).toBe(false);
		expect(comparison.left.correctness.executed).toBe(2);
	});
	it("does not compare unequal executed prefixes even when both planned the same corpus and budget", () => {
		const first = fixture();
		const left = record({ status: "BUDGET_EXHAUSTED", completedAt: 2, fixtures: [first] });
		const right = record({
			status: "COMPLETED",
			completedAt: 2,
			fixtures: [first, { ...fixture(), fixtureId: "F02" }],
		});
		const comparison = compareFitnessRuns(left, right);
		expect(comparison.comparable).toBe(false);
		expect(comparison.compatibility).toEqual({
			corpus: true,
			budget: true,
			harness: true,
			configuration: true,
			fixtures: false,
			kind: true,
		});
		expect(comparison.left.correctness).toMatchObject({ executed: 1, oraclePass: 1 });
		expect(comparison.right.correctness).toMatchObject({ executed: 2, oraclePass: 2 });
	});
	it("rejects path traversal and symlink records without reading the target", async () => {
		const store = await FitnessRecordStore.open(directory);
		await expect(store.read("../auth")).rejects.toThrow();
		const id = randomUUID();
		const secret = join(directory, "secret");
		await writeFile(secret, "PRIVATE_KEY", { mode: 0o600 });
		await symlink(secret, join(directory, `${id}.json`));
		await expect(store.read(id)).rejects.toThrow();
		await expect(store.list()).rejects.toThrow();
		expect(await readFile(secret, "utf8")).toBe("PRIVATE_KEY");
	});
});
