import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync } from "node:fs";
import { join, sep } from "node:path";
import { listFiles } from "./list-files.ts";
import {
	isListablePath,
	isPolicyPath,
	isProtectedPath,
	type PolicyContext,
	type PolicyPathInspector,
} from "./policy.ts";

/**
 * Task Context Pack (V0.5A, C01): Host-selected bounded starting context for a worker invocation.
 * It is advisory context only — never permission, approval, verification evidence, mutation receipt
 * or completion authority. Policy filtering happens before any content access, and the pack is rebuilt
 * from the current workspace for every invocation (no persistent cache).
 */
export const TASK_CONTEXT_DOMAIN = "weavra-task-context-pack-v1";
export const TASK_CONTEXT_VERSION = 1;
export const CONTEXT_MAX_SCANNED_FILES = 64;
export const CONTEXT_MAX_RELATED_FILES = 24;
export const CONTEXT_MAX_SYMBOLS = 32;
export const CONTEXT_MAX_SNIPPETS = 12;
export const CONTEXT_MAX_SNIPPET_BYTES = 4096;
export const CONTEXT_MAX_PACK_BYTES = 49152;
const FILE_MAX_BYTES = 262144;

export type TaskContextMode = "disabled" | "bounded";

export interface TaskContextFile {
	path: string;
	reasons: string[];
}

export interface TaskContextSymbol {
	name: string;
	path: string;
	kind: string;
	reason: "lsp-symbol" | "literal";
}

export interface TaskContextSnippet {
	path: string;
	startLine: number;
	endLine: number;
	fileDigest: string;
	snippetDigest: string;
	text: string;
}

export interface TaskContextRules {
	path: string | null;
	digest: string | null;
	bytes: number | null;
	kind: "configured-file" | "inline" | "none";
}

export interface TaskContextPack {
	version: number;
	digest: string;
	mode: "bounded";
	targetSymbols: TaskContextSymbol[];
	relatedFiles: TaskContextFile[];
	projectRules: TaskContextRules;
	snippets: TaskContextSnippet[];
	unknowns: string[];
	truncated: boolean;
}

/** Narrow read-only LSP seam; the builder never mutates and never retries stale evidence. */
export interface ContextLspPort {
	documentSymbols(path: string): Promise<{ status: string; symbols: Array<{ name: string; kind: string }> }>;
	references(path: string, line: number): Promise<{ status: string; paths: string[] }>;
}

export interface TaskContextInput {
	cwd: string;
	mode: TaskContextMode;
	/** Host-derived seeds: acceptance scope paths, changed files, previous review issue files. */
	seedPaths: readonly string[];
	/** Task text used only for deterministic literal extraction (goal + acceptance statements). */
	taskText: readonly string[];
	/** Workspace-relative paths that are already known to be relevant (verification/handoff). */
	changedFiles?: readonly string[];
	previousReviewFiles?: readonly string[];
	paths: PolicyPathInspector;
	lsp?: ContextLspPort;
	protectedPaths?: readonly string[];
	/** Declared trusted verifier oracle sources: never included in the pack. */
	verifierSources?: readonly string[];
	/** Frozen policy for listable-path filtering (Host-owned, never worker input). */
	policy: PolicyContext;
	/** Host-owned listing bounds; defaults to the workspace root at depth 4. */
	listingRoots?: readonly string[];
	listingDepth?: number;
	signal?: AbortSignal;
}

function sha256Of(value: unknown, domain: string): string {
	return createHash("sha256").update(JSON.stringify({ domain, value })).digest("hex");
}

function canonical(path: string): string {
	try {
		return realpathSync(path);
	} catch {
		return path;
	}
}

/** Policy-first filter: secrets and protected paths are excluded before any read or listing. */
function isContextEligible(
	workspace: string,
	path: string,
	protectedPaths: readonly string[],
	verifierSources: readonly string[],
	policy: PolicyContext,
): boolean {
	if (!isListablePath(path, policy) || !isPolicyPath(path)) return false;
	if (isProtectedPath(path, protectedPaths)) return false;
	if (verifierSources.some((source) => source === path)) return false;
	let absolute: string;
	try {
		absolute = canonical(join(workspace, path));
	} catch {
		return false;
	}
	if (!absolute.startsWith(workspace + sep)) return false;
	try {
		const stat = lstatSync(absolute);
		if (stat.isSymbolicLink() || stat.nlink > 1 || !stat.isFile()) return false;
	} catch {
		return false;
	}
	return true;
}

/** Bounded strict read with before/after identity validation; an unstable read yields no snippet. */
function readStableText(path: string): { text: string; digest: string } | undefined {
	let fd: number;
	try {
		fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	} catch {
		return undefined;
	}
	try {
		const before = fstatSync(fd, { bigint: true });
		if (!before.isFile() || before.nlink !== 1n || before.size > BigInt(FILE_MAX_BYTES)) return undefined;
		const buffer = Buffer.alloc(Number(before.size) + 1);
		let length = 0;
		while (length < buffer.length) {
			const count = readSync(fd, buffer, length, buffer.length - length, length);
			if (!count) break;
			length += count;
		}
		const after = fstatSync(fd, { bigint: true });
		const current = lstatSync(path, { bigint: true });
		if (
			after.dev !== before.dev ||
			after.ino !== before.ino ||
			after.size !== before.size ||
			after.mtimeNs !== before.mtimeNs ||
			after.ctimeNs !== before.ctimeNs ||
			current.dev !== before.dev ||
			current.ino !== before.ino
		)
			return undefined;
		const bytes = buffer.subarray(0, length);
		if (bytes.includes(0)) return undefined;
		const text = bytes.toString("utf8");
		if (Buffer.from(text, "utf8").compare(bytes) !== 0) return undefined;
		return { text, digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };
	} catch {
		return undefined;
	} finally {
		closeSync(fd);
	}
}

/** Deterministic literal terms: backticked/quoted identifiers, path stems and code-like tokens only. */
export function extractLiteralTerms(taskText: readonly string[]): string[] {
	const terms = new Set<string>();
	for (const raw of taskText) {
		for (const match of raw.matchAll(/`([^`\n]{1,64})`/g)) terms.add(match[1].trim());
		for (const match of raw.matchAll(/"([^"\n]{1,64})"/g)) terms.add(match[1].trim());
		for (const match of raw.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z0-9_.]+)\b/g)) terms.add(match[1]);
		for (const match of raw.matchAll(/\b(\w+\.(?:ts|tsx|js|mjs|cjs|json|md)\b)/g)) terms.add(match[1]);
		for (const match of raw.matchAll(/\b([a-z][a-z0-9]*(?:[A-Z][A-Za-z0-9]*)+)\b/g)) terms.add(match[1]);
	}
	return [...terms]
		.map((term) => term.replace(/^\.\//, "").trim())
		.filter((term) => term.length >= 3)
		.sort()
		.slice(0, 16);
}

function relatedTestCandidates(seed: string, discovered: readonly string[]): string[] {
	const stem = seed.replace(/\.[^.]+$/, "");
	const base = stem.split("/").pop() ?? stem;
	return discovered
		.filter((path) => path !== seed && !path.endsWith(seed))
		.filter(
			(path) =>
				/\.(?:test|spec)\.[^.]+$/.test(path) &&
				(path.includes(base) || path.startsWith("test/") || path.startsWith("tests/")),
		)
		.sort()
		.slice(0, CONTEXT_MAX_RELATED_FILES);
}

function snippetOf(text: string, fileDigest: string, path: string, term: string): TaskContextSnippet | undefined {
	const lines = text.split("\n");
	const index = lines.findIndex((line) => line.includes(term));
	if (index < 0) return undefined;
	const start = Math.max(0, index - 2);
	const end = Math.min(lines.length, index + 3);
	const slice = lines.slice(start, end);
	let snippetText = slice.join("\n");
	while (Buffer.byteLength(snippetText, "utf8") > CONTEXT_MAX_SNIPPET_BYTES && slice.length > 1) {
		slice.pop();
		snippetText = slice.join("\n");
	}
	return {
		path,
		startLine: start + 1,
		endLine: start + slice.length,
		fileDigest,
		snippetDigest: `sha256:${createHash("sha256").update(snippetText, "utf8").digest("hex")}`,
		text: snippetText,
	};
}

/**
 * Builds the bounded pack from the current workspace. Returns undefined in disabled mode.
 * No provider call, no mutation, no cache: the caller supplies already-derived seeds.
 */
export async function buildTaskContextPack(input: TaskContextInput): Promise<TaskContextPack | undefined> {
	if (input.mode !== "bounded") return undefined;
	const workspace = canonical(input.cwd);
	const protectedPaths = [...(input.protectedPaths ?? [])];
	const verifierSources = [...(input.verifierSources ?? [])];
	const policy = input.policy;
	const unknowns: string[] = [];
	let truncated = false;

	const listed = await listFiles(
		workspace,
		input.listingRoots ?? ["."],
		input.listingDepth ?? 4,
		input.policy,
		input.paths,
		input.signal ?? new AbortController().signal,
	);
	const eligible = listed.files.filter((path) =>
		isContextEligible(workspace, path, protectedPaths, verifierSources, policy),
	);
	// Policy-filtered files are not truncation; only the Host scan budget dropping eligible files is.
	if (listed.truncated || eligible.length > CONTEXT_MAX_SCANNED_FILES) truncated = true;
	const discovered = eligible.slice(0, CONTEXT_MAX_SCANNED_FILES);

	const related = new Map<string, Set<string>>();
	const addRelated = (path: string, reason: string) => {
		if (!isContextEligible(workspace, path, protectedPaths, verifierSources, policy)) return;
		const reasons = related.get(path) ?? new Set<string>();
		reasons.add(reason);
		related.set(path, reasons);
	};
	const seeds = [...new Set([...input.seedPaths, ...(input.changedFiles ?? [])])]
		.filter((path) => isContextEligible(workspace, path, protectedPaths, verifierSources, policy))
		.sort();
	for (const seed of seeds) {
		addRelated(seed, input.seedPaths.includes(seed) ? "acceptance-scope" : "changed-file");
		for (const candidate of relatedTestCandidates(seed, discovered)) addRelated(candidate, "same-stem-test");
	}
	for (const path of input.previousReviewFiles ?? []) addRelated(path, "previous-review");

	const terms = extractLiteralTerms(input.taskText);
	for (const path of discovered) {
		if (related.size >= CONTEXT_MAX_RELATED_FILES) break;
		const absolute = join(workspace, path);
		const read = readStableText(absolute);
		if (!read) {
			unknowns.push(`unreadable or unstable file: ${path}`);
			continue;
		}
		if (terms.some((term) => read.text.includes(term)) && !related.has(path)) addRelated(path, "literal-reference");
	}

	const targetSymbols: TaskContextSymbol[] = [];
	const snippets: TaskContextSnippet[] = [];
	const relatedPaths = [...related.keys()].sort().slice(0, CONTEXT_MAX_RELATED_FILES);
	if (related.size > relatedPaths.length) truncated = true;
	for (const path of relatedPaths) {
		const read = readStableText(join(workspace, path));
		if (!read) {
			unknowns.push(`unstable read for snippet: ${path}`);
			continue;
		}
		const term = terms.find((candidate) => read.text.includes(candidate));
		if (!term) continue;
		if (snippets.length >= CONTEXT_MAX_SNIPPETS) {
			truncated = true;
			break;
		}
		const snippet = snippetOf(read.text, read.digest, path, term);
		if (snippet) snippets.push(snippet);
	}

	if (input.lsp) {
		for (const path of relatedPaths.slice(0, 4)) {
			try {
				const symbols = await input.lsp.documentSymbols(path);
				if (symbols.status !== "AVAILABLE") {
					unknowns.push(`lsp symbols ${symbols.status.toLowerCase()} for ${path}`);
					continue;
				}
				for (const symbol of symbols.symbols) {
					if (targetSymbols.length >= CONTEXT_MAX_SYMBOLS) {
						truncated = true;
						break;
					}
					if (!terms.includes(symbol.name)) continue;
					targetSymbols.push({ name: symbol.name, path, kind: symbol.kind, reason: "lsp-symbol" });
				}
			} catch {
				unknowns.push(`lsp symbols error for ${path}`);
			}
		}
	}

	const packBody = {
		version: TASK_CONTEXT_VERSION,
		mode: "bounded" as const,
		targetSymbols: targetSymbols.slice(0, CONTEXT_MAX_SYMBOLS),
		relatedFiles: relatedPaths.map((path) => ({ path, reasons: [...related.get(path)!].sort() })),
		snippets,
		unknowns: [...new Set(unknowns)].sort(),
		truncated,
	};
	const digest = `sha256:${sha256Of(packBody, TASK_CONTEXT_DOMAIN)}`;
	return {
		...packBody,
		digest,
		projectRules: { path: null, digest: null, bytes: null, kind: "none" },
	};
}

/** Bounded observation summary; contains no snippet text and no absolute paths. */
export function summarizeTaskContextPack(pack: TaskContextPack | undefined): {
	mode: TaskContextMode;
	digest: string | null;
	bytes: number;
	relatedFileCount: number;
	symbolCount: number;
	snippetCount: number;
	unknownCount: number;
	truncated: boolean;
} {
	if (!pack) {
		return {
			mode: "disabled",
			digest: null,
			bytes: 0,
			relatedFileCount: 0,
			symbolCount: 0,
			snippetCount: 0,
			unknownCount: 0,
			truncated: false,
		};
	}
	return {
		mode: "bounded",
		digest: pack.digest,
		bytes: Buffer.byteLength(JSON.stringify(pack), "utf8"),
		relatedFileCount: pack.relatedFiles.length,
		symbolCount: pack.targetSymbols.length,
		snippetCount: pack.snippets.length,
		unknownCount: pack.unknowns.length,
		truncated: pack.truncated,
	};
}
