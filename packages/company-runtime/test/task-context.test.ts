import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseRuntimeConfig } from "../src/config.ts";
import type { PolicyContext } from "../src/policy.ts";
import { FilePolicyPathInspector } from "../src/policy-paths.ts";
import {
	buildTaskContextPack,
	CONTEXT_MAX_RELATED_FILES,
	type ContextLspPort,
	extractLiteralTerms,
	summarizeTaskContextPack,
	TASK_CONTEXT_DOMAIN,
} from "../src/task-context.ts";

let cwd: string;
let policy: PolicyContext;

const write = (path: string, content: string) => {
	mkdirSync(join(cwd, path, ".."), { recursive: true });
	writeFileSync(join(cwd, path), content);
};

async function build(overrides: Partial<Parameters<typeof buildTaskContextPack>[0]> = {}) {
	const inspector = await FilePolicyPathInspector.open(cwd);
	return await buildTaskContextPack({
		cwd,
		mode: "bounded",
		seedPaths: ["src/service.ts"],
		taskText: ["Rename `formatLabel` usage in src/service.ts"],
		paths: inspector,
		policy,
		protectedPaths: [".env", ".git", ".ai"],
		verifierSources: ["test/oracle.mjs"],
		listingRoots: ["src", "test"],
		...overrides,
	});
}

beforeEach(() => {
	cwd = realpathSync(mkdtempSync(join(tmpdir(), "weavra-context-")));
	write(
		"src/service.ts",
		'import { formatLabel } from "./formatter.ts";\nexport const service = () => formatLabel("x");\n',
	);
	write("src/formatter.ts", "export function formatLabel(value: string): string {\n\treturn value.trim();\n}\n");
	write("test/service.test.ts", 'import { service } from "../src/service.ts";\nservice();\n');
	write("src/other.ts", "export const other = 1;\n");
	write(".env", "TOKEN=SUPER_SECRET_VALUE\n");
	write(".ai/config.yaml", "schemaVersion: 1\n");
	write("test/oracle.mjs", "export const oracle = 'ORACLE_SECRET_MARKER';\n");
	execFileSync("ln", ["-sf", join(cwd, ".env"), join(cwd, "src/link.ts")]);
	execFileSync("git", ["init", "-q"], { cwd });
	execFileSync("git", ["add", "--", "."], { cwd });
	execFileSync("git", ["-c", "user.email=e@x", "-c", "user.name=E", "commit", "-qm", "init"], { cwd });
	policy = {
		executionMode: "EDIT",
		executionRunId: "run-1",
		tools: [],
		allowedPaths: ["src", "test"],
		protectedPaths: [".env", ".git", ".ai"],
		configDigest: "config",
	};
});

afterEach(() => rmSync(cwd, { recursive: true, force: true }));

describe("V0.5A task context pack", () => {
	it("defaults to disabled and validates the mode strictly", () => {
		const base = {
			schemaVersion: 1,
			models: { profiles: { coding: { provider: "p", model: "m" }, reasoning: { provider: "p", model: "m" } } },
		};
		expect(parseRuntimeConfig(JSON.stringify(base)).agents.context_pack).toEqual({ mode: "disabled" });
		expect(
			parseRuntimeConfig(JSON.stringify({ ...base, agents: { context_pack: { mode: "bounded" } } })).agents
				.context_pack,
		).toEqual({ mode: "bounded" });
		expect(() =>
			parseRuntimeConfig(JSON.stringify({ ...base, agents: { context_pack: { mode: "eager" } } })),
		).toThrow();
		expect(() =>
			parseRuntimeConfig(JSON.stringify({ ...base, agents: { context_pack: { mode: "bounded", budget: 99 } } })),
		).toThrow();
	});

	it("returns no pack in disabled mode", async () => {
		expect(await build({ mode: "disabled" })).toBeUndefined();
		expect(summarizeTaskContextPack(undefined)).toMatchObject({ mode: "disabled", digest: null, bytes: 0 });
	});

	it("includes the acceptance seed, same-stem test and literal reference with bounded provenance", async () => {
		const pack = (await build())!;
		const paths = pack.relatedFiles.map((file) => file.path);
		expect(paths).toContain("src/service.ts");
		expect(paths).toContain("test/service.test.ts");
		expect(pack.relatedFiles.find((file) => file.path === "src/service.ts")?.reasons).toContain("acceptance-scope");
		expect(pack.relatedFiles.find((file) => file.path === "test/service.test.ts")?.reasons).toContain(
			"same-stem-test",
		);
		expect(pack.snippets.length).toBeGreaterThan(0);
		for (const snippet of pack.snippets) {
			expect(snippet.path).toMatch(/^(src|test)\//);
			expect(snippet.startLine).toBeGreaterThan(0);
			expect(snippet.endLine).toBeGreaterThanOrEqual(snippet.startLine);
			expect(snippet.fileDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
			expect(snippet.snippetDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
		}
		expect(pack.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
		expect(pack.truncated).toBe(false);
	});

	it("never includes protected, oracle or symlinked paths in files, snippets or the digest", async () => {
		const pack = (await build())!;
		const serialized = JSON.stringify(pack);
		expect(serialized).not.toContain(".env");
		expect(serialized).not.toContain(".ai/config.yaml");
		expect(serialized).not.toContain("oracle.mjs");
		expect(serialized).not.toContain("link.ts");
		expect(serialized).not.toContain("SUPER_SECRET_VALUE");
		expect(serialized).not.toContain("ORACLE_SECRET_MARKER");
	});

	it("keeps the digest deterministic for the same pack and independent of discovery order", async () => {
		const first = (await build())!;
		const second = (await build({ seedPaths: ["src/service.ts"] }))!;
		expect(second.digest).toBe(first.digest);
		expect(second.digest).not.toContain("rr1:");
		expect(first.relatedFiles.map((file) => file.path)).toEqual(
			[...first.relatedFiles.map((file) => file.path)].sort(),
		);
	});

	it("changes the digest when a selected file's content changes", async () => {
		const before = (await build())!;
		write("src/service.ts", "export const service = 42;\n");
		const after = (await build())!;
		expect(after.digest).not.toBe(before.digest);
	});

	it("records unavailable LSP as an unknown instead of inventing symbols", async () => {
		const lsp: ContextLspPort = {
			documentSymbols: async () => ({ status: "UNAVAILABLE", symbols: [] }),
			references: async () => ({ status: "UNAVAILABLE", paths: [] }),
		};
		const pack = (await build({ lsp }))!;
		expect(pack.targetSymbols).toEqual([]);
		expect(pack.unknowns.join(" ")).toContain("lsp symbols unavailable");
	});

	it("includes advisory LSP symbols only when they match a task literal", async () => {
		const lsp: ContextLspPort = {
			documentSymbols: async () => ({
				status: "AVAILABLE",
				symbols: [
					{ name: "formatLabel", kind: "function" },
					{ name: "unrelatedThing", kind: "function" },
				],
			}),
			references: async () => ({ status: "AVAILABLE", paths: [] }),
		};
		const pack = (await build({ lsp }))!;
		expect(
			pack.targetSymbols.some((symbol) => symbol.name === "formatLabel" && symbol.path === "src/service.ts"),
		).toBe(true);
		expect(pack.targetSymbols.some((symbol) => symbol.name === "unrelatedThing")).toBe(false);
		expect(pack.targetSymbols.every((symbol) => symbol.reason === "lsp-symbol")).toBe(true);
	});

	it("enforces the related-file and snippet budgets", async () => {
		for (let index = 0; index < 40; index += 1)
			write(`src/gen${String(index).padStart(2, "0")}.ts`, "export const formatLabel = 1;\n");
		await build();
		const pack = (await build({
			seedPaths: [
				"src/service.ts",
				...Array.from({ length: 40 }, (_, index) => `src/gen${String(index).padStart(2, "0")}.ts`),
			],
		}))!;
		expect(pack.relatedFiles.length).toBeLessThanOrEqual(CONTEXT_MAX_RELATED_FILES);
		expect(pack.snippets.length).toBeLessThanOrEqual(12);
		expect(pack.truncated).toBe(true);
		expect(Buffer.byteLength(JSON.stringify(pack), "utf8")).toBeLessThanOrEqual(49152);
	});

	it("derives default listing roots from allowed paths instead of the workspace root", async () => {
		write("docs/note.md", "formatLabel lives here but docs are outside the allowed roots\n");
		const pack = (await build({ listingRoots: undefined }))!;
		const paths = pack.relatedFiles.map((file) => file.path);
		expect(paths.some((path) => path.startsWith("docs/"))).toBe(false);
		expect(paths).toContain("src/service.ts");
	});

	it("degrades to an honest empty pack when no listable allowed root exists", async () => {
		const emptyPolicy: PolicyContext = { ...policy, allowedPaths: [] };
		const pack = (await build({ policy: emptyPolicy, listingRoots: undefined }))!;
		expect(pack.relatedFiles).toEqual([]);
		expect(pack.snippets).toEqual([]);
		expect(pack.targetSymbols).toEqual([]);
		expect(pack.truncated).toBe(false);
		expect(pack.unknowns).toContain("no listable allowed roots");
		expect(pack.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
	});

	it("denies lexical symlink seeds and symlinked parent directories", async () => {
		write("src/real.ts", "export const formatLabel = 1;\n");
		execFileSync("ln", ["-sf", "real.ts", join(cwd, "src/lexical.ts")]);
		mkdirSync(join(cwd, "src/linked-dir"), { recursive: true });
		execFileSync("ln", ["-sfn", "real.ts", join(cwd, "src/linked-dir/inner.ts")]);
		execFileSync("ln", ["-sfn", join(cwd, "src"), join(cwd, "src/dir-link")]);
		const pack = (await build({ seedPaths: ["src/lexical.ts", "src/dir-link/real.ts"] }))!;
		const serialized = JSON.stringify(pack);
		expect(pack.relatedFiles.some((file) => file.path.includes("lexical.ts"))).toBe(false);
		expect(serialized).not.toContain("dir-link");
		// real.ts is a legitimate allowed file; only the symlinked paths must never appear.
		expect(pack.relatedFiles.every((file) => file.path === "src/real.ts" || !file.path.includes("lexical"))).toBe(
			true,
		);
	});

	it("hard-caps the whole canonical pack at 48 KiB with deterministic trimming", async () => {
		for (let index = 0; index < 20; index += 1) {
			const filler = Array.from({ length: 200 }, (_, line) => `// formatLabel line ${line} ${"x".repeat(60)}`).join(
				"\n",
			);
			write(`src/big${String(index).padStart(2, "0")}.ts`, `${filler}\nexport const value = formatLabel;\n`);
		}
		const seeds = Array.from({ length: 20 }, (_, index) => `src/big${String(index).padStart(2, "0")}.ts`);
		const first = (await build({ seedPaths: ["src/service.ts", ...seeds] }))!;
		const second = (await build({ seedPaths: ["src/service.ts", ...seeds] }))!;
		expect(Buffer.byteLength(JSON.stringify(first), "utf8")).toBeLessThanOrEqual(49152);
		expect(first.truncated).toBe(true);
		expect(first.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
		expect(second.digest).toBe(first.digest);
	});

	it("binds project-rule metadata into the pack digest without copying the instruction body", async () => {
		const withRules = (await build({
			projectInstruction: { path: "AGENTS.md", digest: `sha256:${"a".repeat(64)}`, bytes: 12 },
		}))!;
		const otherRules = (await build({
			projectInstruction: { path: "AGENTS.md", digest: `sha256:${"b".repeat(64)}`, bytes: 12 },
		}))!;
		expect(withRules.projectRules).toEqual({
			kind: "configured-file",
			path: "AGENTS.md",
			digest: `sha256:${"a".repeat(64)}`,
			bytes: 12,
		});
		expect(otherRules.digest).not.toBe(withRules.digest);
		expect(JSON.stringify(withRules)).not.toContain("PROJECT_PRIVATE_MARKER");
	});

	it("extracts only deterministic literal terms", () => {
		const terms = extractLiteralTerms([
			"Rename `formatLabel` in src/service.ts",
			"keep camelCaseThing and a plain sentence",
		]);
		expect(terms).toContain("formatLabel");
		expect(terms).toContain("camelCaseThing");
		expect(terms).toContain("service.ts");
		expect(terms.every((term) => term.length >= 3)).toBe(true);
		expect(extractLiteralTerms(["a plain english sentence with no identifiers"])).toEqual([]);
		expect(TASK_CONTEXT_DOMAIN).toBe("weavra-task-context-pack-v1");
		expect(readFileSync(join(cwd, ".env"), "utf8")).toContain("SUPER_SECRET_VALUE");
	});
});
