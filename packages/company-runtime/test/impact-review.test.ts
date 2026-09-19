import { linkSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { fileDigest } from "../src/anchored-edit.ts";
import { buildImpactReviewPack, changedCurrentLines, type ImpactReviewInput } from "../src/impact-review.ts";
import type { LspLocation, LspPort, LspResult, LspSymbol } from "../src/lsp/types.ts";
import { FilePolicyPathInspector } from "../src/policy-paths.ts";

let cwd: string;
const before = "export function label(v) {\n  return v;\n}\nexport function untouched(v) {\n  return v;\n}\n";
const after = before.replace("return v;", "return v.trim();");
const sourceDigest = fileDigest(after);
const symbols: LspSymbol[] = [
	{
		path: "src/label.ts",
		name: "label",
		kind: 12,
		depth: 0,
		line: 1,
		column: 17,
		endLine: 1,
		endColumn: 22,
		range: { line: 1, column: 1, endLine: 3, endColumn: 2 },
	},
	{
		path: "src/label.ts",
		name: "untouched",
		kind: 12,
		depth: 0,
		line: 4,
		column: 17,
		endLine: 4,
		endColumn: 26,
		range: { line: 4, column: 1, endLine: 6, endColumn: 2 },
	},
];
const at = (path: string): LspLocation => ({ path, line: 1, column: 1, endLine: 1, endColumn: 6 });
function lsp(
	options: {
		status?: LspResult["status"];
		digest?: string;
		symbols?: LspSymbol[];
		references?: LspLocation[];
		mutate?: () => void;
	} = {},
): LspPort {
	const result: LspResult = {
		serverId: "fixture",
		status: options.status ?? "AVAILABLE",
		fileDigest: options.digest ?? sourceDigest,
		reason: "fixture",
		startedAt: 1,
		finishedAt: 2,
		withheld: 0,
		truncated: 0,
	};
	return {
		symbols: async () => {
			options.mutate?.();
			return { ...result, symbols: options.symbols ?? symbols };
		},
		references: async () => ({
			...result,
			locations: options.references ?? [at("src/caller.ts"), at("test/label.test.ts")],
		}),
		definition: async () => ({ ...result, locations: [] }),
		diagnostics: async () => ({ ...result, diagnostics: [] }),
		close: async () => {},
	};
}
function write(path: string, text: string) {
	mkdirSync(join(cwd, path, ".."), { recursive: true });
	writeFileSync(join(cwd, path), text);
}
async function build(overrides: Partial<ImpactReviewInput> = {}) {
	return buildImpactReviewPack({
		cwd,
		runId: "run",
		revision: 0,
		taskContractDigest: fileDigest("task"),
		generatedAt: 1,
		policy: {
			executionMode: "EDIT",
			executionRunId: "run",
			allowedPaths: ["src", "test"],
			protectedPaths: ["src/protected.ts", "src/rules.md"],
			tools: [{ id: "runtime_read", operation: "read" }],
			configDigest: "config",
		},
		paths: await FilePolicyPathInspector.open(cwd),
		protectedPaths: ["src/protected.ts", "src/rules.md"],
		verifierSources: ["test/oracle.ts"],
		scopePaths: ["src"],
		lsp: lsp(),
		diff: {
			safe: true,
			diffDigest: "diff",
			changedFiles: ["src/label.ts"],
			changedLines: 2,
			evidenceRefs: [],
			diff: JSON.stringify([{ path: "src/label.ts", before, after }]),
		},
		...overrides,
	});
}
beforeEach(() => {
	cwd = realpathSync(mkdtempSync(join(tmpdir(), "weavra-impact-")));
	write("src/label.ts", after);
	write("src/caller.ts", "label('x');\n");
	write("test/label.test.ts", "label('x');\n");
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

it("detects the changed function body, not an unchanged sibling, and identifies caller and test", async () => {
	const pack = await build();
	expect(pack.changedSymbols.map((s) => s.name)).toEqual(["label"]);
	expect(pack.changedSymbols[0]).toMatchObject({
		sourceDigest,
		range: symbols[0].range,
		selection: { line: 1, column: 17 },
	});
	expect(pack.callers.map((r) => r.path)).toEqual(["src/caller.ts", "test/label.test.ts"]);
	expect(pack.relatedTests).toEqual([
		{ path: "test/label.test.ts", reason: "lsp-reference", sourceDigest: fileDigest("label('x');\n") },
	]);
});
it("selects the most specific enclosing nested symbol", async () => {
	const nested = {
		...symbols[0],
		name: "inner",
		kind: 13,
		depth: 1,
		line: 2,
		column: 3,
		range: { line: 2, column: 3, endLine: 2, endColumn: 19 },
	};
	expect((await build({ lsp: lsp({ symbols: [...symbols, nested] }) })).changedSymbols.map((s) => s.name)).toEqual([
		"inner",
	]);
});
it("computes separated changed lines without marking the unchanged middle, including a deletion gap", () => {
	expect(changedCurrentLines("a\nb\nc\nd\ne", "a\nB\nc\nD\ne")).toEqual([2, 4]);
	expect(changedCurrentLines("a\nb\nc", "a\nc")).toEqual([2]);
	expect(changedCurrentLines("a", "a")).toEqual([]);
});
it("reports unavailable when exact line computation exceeds its finite budget", () => {
	expect(changedCurrentLines("a\n".repeat(1600), "b\n".repeat(1600))).toBeUndefined();
});
it("canonicalizes LSP order and excludes observation time from content identity", async () => {
	const first = await build(),
		second = await build({
			generatedAt: 99,
			lsp: lsp({ symbols: [...symbols].reverse(), references: [at("test/label.test.ts"), at("src/caller.ts")] }),
		});
	expect(first.digest).toBe(second.digest);
	expect(first.changedSymbols[0].id).toBe(second.changedSymbols[0].id);
});
it("excludes protected, oracle, project instructions, outside-root, symlinks and hardlinks before reading", async () => {
	for (const p of ["src/protected.ts", "src/rules.md", "test/oracle.ts", ".env", ".ai/config.yaml", ".git/config"])
		write(p, "PRIVATE_SENTINEL");
	symlinkSync(join(cwd, ".env"), join(cwd, "src/escape.ts"));
	linkSync(join(cwd, ".env"), join(cwd, "src/hard.ts"));
	const forbidden = [
		"src/protected.ts",
		"src/rules.md",
		"test/oracle.ts",
		".env",
		".ai/config.yaml",
		".git/config",
		"../outside.ts",
		"/tmp/outside.ts",
		"src/escape.ts",
		"src/hard.ts",
	];
	const pack = await build({ lsp: lsp({ references: [...forbidden.map(at), at("src/caller.ts")] }) });
	expect(pack.callers.map((p) => p.path)).toEqual(["src/caller.ts"]);
	for (const value of [...forbidden, "PRIVATE_SENTINEL"]) expect(JSON.stringify(pack)).not.toContain(value);
});
it.each(["STALE", "UNAVAILABLE", "ERROR"] as const)("degrades %s without inventing changed symbols", async (status) => {
	const pack = await build({ lsp: lsp({ status }) });
	expect(pack.changedSymbols).toEqual([]);
	expect(pack.callers).toEqual([]);
	expect(pack.unknowns).toContain("LSP symbols unavailable or stale");
});
it("does not accept a stale source digest even with AVAILABLE status", async () => {
	expect((await build({ lsp: lsp({ digest: fileDigest(before) }) })).changedSymbols).toEqual([]);
});
it("rejects a source changed during the LSP query", async () => {
	expect((await build({ lsp: lsp({ mutate: () => write("src/label.ts", before) }) })).changedSymbols).toEqual([]);
});
it("does not guess body ranges from name selection positions", async () => {
	const selectionOnly = symbols.map(({ range: _range, ...symbol }) => symbol);
	const pack = await build({ lsp: lsp({ symbols: selectionOnly }) });
	expect(pack.changedSymbols).toEqual([]);
	expect(pack.unknowns).toContain("symbol extent unavailable or invalid");
});
it("degrades absent LSP and still offers explicitly heuristic test discovery", async () => {
	const pack = await build({ lsp: undefined });
	expect(pack.changedSymbols).toEqual([]);
	expect(pack.unknowns).toContain("LSP unavailable");
	expect(pack.relatedTests[0].reason).toBe("same-stem");
});
it("trims deterministically below the requested cap and rejects an impossible minimum", async () => {
	const first = await build({ maxBytes: 850 }),
		second = await build({ maxBytes: 850, lsp: lsp({ symbols: [...symbols].reverse() }) });
	expect(Buffer.byteLength(JSON.stringify(first))).toBeLessThanOrEqual(850);
	expect(first.truncated).toBe(true);
	expect(second.digest).toBe(first.digest);
	await expect(build({ maxBytes: 10 })).rejects.toThrow("minimum exceeds");
});
it("propagates cancellation instead of continuing with a falsely usable pack", async () => {
	const abort = new AbortController();
	abort.abort();
	await expect(build({ signal: abort.signal })).rejects.toThrow();
});
