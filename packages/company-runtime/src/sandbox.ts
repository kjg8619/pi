import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import type { ProcessResult } from "./process-runner.ts";
import { runProcess } from "./process-runner.ts";

/**
 * Verifier Sandbox (V0.4C): an OS-level boundary for registered verification check processes only.
 * It is integrity/containment for *that* process — not permission, approval, review or completion authority.
 * Workers, LSP, Git and the launcher keep the existing (unsandboxed) execution path.
 */
export const SRT_PACKAGE = "@anthropic-ai/sandbox-runtime";
export const SRT_VERSION = "0.0.76";
export const SANDBOX_POLICY_DOMAIN = "weavra-verifier-sandbox-v1";
const BACKEND_DOMAIN = "weavra-verifier-sandbox-backend-v1";

export type SandboxMode = "disabled" | "required";
export type SandboxStatus = "ENFORCED" | "UNAVAILABLE" | "STALE" | "UNKNOWN";

export interface SandboxBackend {
	/** Absolute path to the frozen SRT CLI entry (argv-based; never a shell string). */
	cliPath: string;
	packageRoot: string;
	version: string;
	identityDigest: string;
}

/** Bounded public projection stored in CheckResult; never settings JSON, env, HOME or absolute protected paths. */
export interface SandboxEvidence {
	mode: SandboxMode;
	status: SandboxStatus;
	backend: string;
	backendVersion: string;
	policyDigest: string;
}

export interface SandboxPolicyDigest {
	policyDigest: string;
	networkMode: "deny-all";
	workspaceRead: boolean;
	workspaceWrite: boolean;
	denyReadCount: number;
	denyWriteCount: number;
}

export interface SandboxPolicySnapshot extends SandboxPolicyDigest {
	backend: SandboxBackend;
	/** Canonical (realpath) settings payload; Host-owned and never project-derived. */
	settings: {
		filesystem: { denyRead: string[]; allowRead: string[]; allowWrite: string[]; denyWrite: string[] };
		network: { allowedDomains: string[]; deniedDomains: string[] };
	};
}

export class SandboxUnavailableError extends Error {
	constructor(reason: string) {
		super(`Verifier sandbox unavailable: ${reason}`);
		this.name = "SandboxUnavailableError";
	}
}

function sha256Of(value: unknown, domain: string): string {
	return createHash("sha256").update(JSON.stringify({ domain, value })).digest("hex");
}

function identityDigest(path: string, domain: string): string {
	const stat = statSync(path, { bigint: true });
	return `sha256:${sha256Of(
		{
			path,
			dev: stat.dev.toString(),
			ino: stat.ino.toString(),
			mode: stat.mode.toString(),
			size: stat.size.toString(),
			mtimeNs: stat.mtimeNs.toString(),
			ctimeNs: stat.ctimeNs.toString(),
		},
		domain,
	)}`;
}

/**
 * Host-frozen backend: the SRT CLI entry resolved from the installed package, exact-version checked.
 * Missing package, unreadable metadata, wrong version or a missing CLI entry all fail closed.
 */
export function resolveSandboxBackend(): SandboxBackend {
	const require = createRequire(import.meta.url);
	let packageJsonPath: string;
	try {
		packageJsonPath = require.resolve(`${SRT_PACKAGE}/package.json`);
	} catch {
		throw new SandboxUnavailableError(`${SRT_PACKAGE} is not installed`);
	}
	const packageRoot = dirname(packageJsonPath);
	const metadata = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
		version?: string;
		bin?: Record<string, string>;
	};
	if (metadata.version !== SRT_VERSION)
		throw new SandboxUnavailableError(
			`${SRT_PACKAGE} version ${metadata.version ?? "unknown"} is not ${SRT_VERSION}`,
		);
	const entry = metadata.bin?.srt;
	if (!entry) throw new SandboxUnavailableError(`${SRT_PACKAGE} exposes no srt CLI entry`);
	const cliPath = realpathSync(join(packageRoot, entry));
	return {
		cliPath,
		packageRoot,
		version: metadata.version,
		identityDigest: identityDigest(cliPath, BACKEND_DOMAIN),
	};
}

/** Canonical Host path: existing paths resolve to realpath; missing tails append to the nearest existing ancestor. */
export function canonicalHostPath(path: string): string {
	let current = path;
	const tail: string[] = [];
	for (;;) {
		try {
			return [realpathSync(current), ...tail.reverse()].join(sep);
		} catch {
			const parent = dirname(current);
			if (parent === current) return path;
			tail.push(current.slice(parent.length + 1));
			current = parent;
		}
	}
}

/**
 * Fixed Host-owned sandbox policy. Network is deny-all, workspace write is allowed for tool compatibility,
 * protected and trusted oracle paths are write-denied, and protected/secret paths stay read-denied even
 * inside the workspace allow-read carve-out.
 */
export function buildSandboxPolicy(input: {
	workspace: string;
	/** Canonical workspace-relative paths the verifier may read (trusted oracle/sources). */
	trustedSources: readonly string[];
	/** Canonical workspace-relative paths denied for read+write (project instruction, .git/.ai, .env, credentials). */
	protectedPaths: readonly string[];
}): SandboxPolicySnapshot {
	const workspace = canonicalHostPath(input.workspace);
	// Workspace-relative policy entries resolve against the canonical workspace root; absolute entries stay as-is.
	const resolvePolicyPath = (path: string) => canonicalHostPath(path.startsWith("/") ? path : join(workspace, path));
	const protect = [...new Set(input.protectedPaths.map(resolvePolicyPath))].sort();
	const settings = {
		filesystem: {
			// denyRead broad (HOME), then allowRead the workspace carve-out, while specific protected paths stay denied.
			denyRead: [...protect, canonicalHostPath(tmpdir()), canonicalHostPath(process.env.HOME ?? "")]
				.filter(Boolean)
				.sort(),
			allowRead: [workspace],
			allowWrite: [workspace],
			// denyWrite wins over allowWrite: oracle sources and protected paths are never writable.
			denyWrite: [...protect, ...input.trustedSources.map(resolvePolicyPath)].sort(),
		},
		network: { allowedDomains: [] as string[], deniedDomains: [] as string[] },
	};
	const policyDigest = `sha256:${sha256Of(
		{
			backend: SRT_PACKAGE,
			version: SRT_VERSION,
			networkMode: "deny-all",
			workspaceRead: true,
			workspaceWrite: true,
			denyRead: settings.filesystem.denyRead.length,
			allowRead: settings.filesystem.allowRead.length,
			denyWrite: settings.filesystem.denyWrite.length,
			protectedDigest: sha256Of(protect, SANDBOX_POLICY_DOMAIN),
			trustedDigest: sha256Of([...input.trustedSources].sort(), SANDBOX_POLICY_DOMAIN),
		},
		SANDBOX_POLICY_DOMAIN,
	)}`;
	return {
		backend: resolveSandboxBackend(),
		settings,
		policyDigest,
		networkMode: "deny-all",
		workspaceRead: true,
		workspaceWrite: true,
		denyReadCount: settings.filesystem.denyRead.length,
		denyWriteCount: settings.filesystem.denyWrite.length,
	};
}

export function sandboxEvidence(snapshot: SandboxPolicySnapshot, status: SandboxStatus): SandboxEvidence {
	return {
		mode: "required",
		status,
		backend: "srt",
		backendVersion: snapshot.backend.version,
		policyDigest: snapshot.policyDigest,
	};
}

/**
 * Runs one registered check inside the frozen sandbox. Settings live outside the workspace, are mode 0600,
 * have an unpredictable name, are used only for this invocation and are removed afterwards. argv is passed
 * through `--` verbatim: no shell, no string command, no `-c`.
 */
export async function runSandboxedCheck(input: {
	snapshot: SandboxPolicySnapshot;
	executable: string;
	argv: readonly string[];
	cwd: string;
	env: Record<string, string>;
	timeoutMs: number;
	signal?: AbortSignal;
}): Promise<{ result: ProcessResult; status: SandboxStatus }> {
	const directory = mkdtempSync(join(tmpdir(), "weavra-sandbox-"));
	const settingsPath = join(directory, "settings.json");
	try {
		writeFileSync(settingsPath, JSON.stringify(input.snapshot.settings), { mode: 0o600 });
		const result = await runProcess({
			executable: process.execPath,
			argv: [input.snapshot.backend.cliPath, "-s", settingsPath, "--", input.executable, ...input.argv],
			cwd: input.cwd,
			env: input.env,
			timeoutMs: input.timeoutMs,
			signal: input.signal,
		});
		const status: SandboxStatus =
			result.reason === "unavailable" || !result.cleanupConfirmed
				? "UNAVAILABLE"
				: result.reason === "exited"
					? "ENFORCED"
					: "STALE";
		return { result, status };
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}
