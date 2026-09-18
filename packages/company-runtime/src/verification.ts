import { randomUUID } from "node:crypto";
import { lstat, realpath } from "node:fs/promises";
import { join } from "node:path";
import { workerDigest } from "./agent-tools.ts";
import type { RuntimeConfig } from "./config.ts";
import type { CheckResult, VerificationResult } from "./contracts.ts";
import { collectLspEvidence, markStaleLspEvidence } from "./lsp/evidence.ts";
import type { LspEvidence, LspPort } from "./lsp/types.ts";
import { type ActionAudit, evaluateRegisteredCheck, type PolicyContext, type RegisteredCheck } from "./policy.ts";
import { FilePolicyPathInspector } from "./policy-paths.ts";
import type { VerificationRequest, Verifier } from "./ports.ts";
import { ProcessCleanupError, resolveExecutable, runProcess, verificationEnvironment } from "./process-runner.ts";
import {
	registrationDigestOf,
	resolveVerifierTrustSources,
	snapshotVerifierExecutable,
	snapshotVerifierSources,
	type VerifierTrustSnapshot,
	validateVerifierTrust,
	verifierTrustEvidence,
} from "./verifier-trust.ts";
import type { DiffEvidence, GitWorkspace } from "./workspace.ts";

export class RegisteredVerifier implements Verifier {
	readonly workspace: GitWorkspace;
	private processCleanupConfirmed = true;
	get safeToRelease(): boolean {
		return this.processCleanupConfirmed && this.workspace.safeToRelease && this.lsp?.cleanupFailed !== true;
	}
	private readonly config: RuntimeConfig;
	private readonly policy: PolicyContext;
	private readonly audit: ActionAudit;
	private readonly paths: FilePolicyPathInspector;
	private readonly registrations: Array<RegisteredCheck | undefined>;
	private readonly trustSnapshots: Array<VerifierTrustSnapshot | undefined>;
	private readonly lsp?: LspPort;
	private constructor(
		config: RuntimeConfig,
		policy: PolicyContext,
		audit: ActionAudit,
		workspace: GitWorkspace,
		paths: FilePolicyPathInspector,
		registrations: Array<RegisteredCheck | undefined>,
		trustSnapshots: Array<VerifierTrustSnapshot | undefined>,
		lsp?: LspPort,
	) {
		this.trustSnapshots = trustSnapshots;
		this.lsp = lsp;
		this.config = config;
		this.policy = policy;
		this.audit = audit;
		this.workspace = workspace;
		this.paths = paths;
		this.registrations = registrations;
	}
	static async create(
		config: RuntimeConfig,
		policy: PolicyContext,
		audit: ActionAudit,
		workspace: GitWorkspace,
		lsp?: LspPort,
	): Promise<RegisteredVerifier> {
		config = structuredClone(config);
		const env = verificationEnvironment();
		const registrations = await Promise.all(
			config.verification.checks.map(async (check) => {
				let executable: string;
				try {
					executable = await resolveExecutable(check.executable, env.PATH);
				} catch {
					return undefined;
				}
				return {
					id: check.id,
					executable,
					argv: [...check.args],
					cwd: check.cwd,
					timeoutMs: check.timeout_ms,
					env: { ...env },
				};
			}),
		);
		const trustMode = config.verification.trust?.mode ?? "compatible";
		// Strict: a missing/invalid declared trust source or unreadable direct source fails before any process.
		// Compatible: existing behavior is preserved; trust metadata degrades to absent instead of failing the Run.
		const trustSnapshots = registrations.map((registration, index) => {
			if (!registration) return undefined;
			const check = config.verification.checks[index];
			try {
				const sources = snapshotVerifierSources(workspace.cwd, resolveVerifierTrustSources(workspace.cwd, check));
				const executable = snapshotVerifierExecutable(registration.executable);
				return {
					mode: trustMode,
					registrationDigest: registrationDigestOf({
						check,
						executable,
						sources,
						configDigest: policy.configDigest,
						trustMode,
					}),
					executableDigest: `sha256:${executable.dev}:${executable.ino}:${executable.size}:${executable.mtimeNs}`,
					executable,
					sources,
				};
			} catch (error) {
				if (trustMode === "strict") throw error;
				return undefined;
			}
		});
		return new RegisteredVerifier(
			config,
			structuredClone(policy),
			audit,
			workspace,
			await FilePolicyPathInspector.open(workspace.cwd),
			registrations,
			trustSnapshots,
			lsp,
		);
	}
	private async cwdSafe(path: string): Promise<boolean> {
		const cwd = join(this.workspace.cwd, path);
		try {
			return path === "."
				? (await realpath(cwd)) === this.workspace.cwd && (await lstat(cwd)).isDirectory()
				: (await this.paths.inspect([path])).every((item) => item.safe && item.kind === "directory");
		} catch {
			return false;
		}
	}
	async inspect(signal?: AbortSignal) {
		const { diff: _diff, ...snapshot } = await this.workspace.inspect(signal);
		return snapshot;
	}
	async verify(request: VerificationRequest): Promise<VerificationResult> {
		if (!this.safeToRelease) throw new ProcessCleanupError();
		if (this.policy.r3Scope && request.runId !== this.policy.r3Scope.runId)
			throw new Error("R3 verifier run binding mismatch");
		if (this.policy.r2RunId && request.runId !== this.policy.r2RunId)
			throw new Error("R2 verifier run binding mismatch");
		const configured = this.config.verification.checks;
		const requirementOf = (check: { id: string; kind: string; required: boolean; trustRequired?: boolean }) => ({
			id: check.id,
			kind: check.kind,
			required: check.required,
			...(check.trustRequired === true ? { trustRequired: true } : {}),
		});
		const strictTrust = (this.config.verification.trust?.mode ?? "compatible") === "strict";
		if (
			JSON.stringify(request.checks.map(requirementOf)) !==
			JSON.stringify(
				configured.map(({ id, kind, required }) =>
					requirementOf({ id, kind, required, ...(strictTrust ? { trustRequired: true } : {}) }),
				),
			)
		)
			throw new Error("Verification request changed registered checks");
		const before = await this.workspace.inspect(request.signal);
		if (!before.safe) throw new Error("Unsupported workspace mutation; review required");
		const checks: CheckResult[] = [];
		for (const [index, check] of configured.entries()) {
			const now = Date.now();
			const base: CheckResult = {
				id: check.id,
				runId: request.runId,
				revision: request.revision,
				step: structuredClone(request.step),
				kind: check.kind,
				required: check.required,
				status: "SKIPPED",
				exitCode: null,
				reason: "Cancelled before check",
				startedAt: now,
				finishedAt: now,
				evidenceRefs: [`check:${request.runId}:${request.step.stepId}:${request.step.attempt}:${check.id}`],
				diffDigest: before.diffDigest,
				stdout: "",
				stderr: "",
			};
			if (request.signal?.aborted) {
				checks.push(base);
				continue;
			}
			const registration = this.registrations[index];
			if (!registration) {
				checks.push({ ...base, status: "UNAVAILABLE", reason: "Registered executable unavailable" });
				continue;
			}
			const action = structuredClone(registration);
			const cwd = join(this.workspace.cwd, action.cwd);
			const cwdSafe = await this.cwdSafe(action.cwd);
			const decision = evaluateRegisteredCheck(
				{
					runId: request.runId,
					actionId: randomUUID(),
					actionDigest: workerDigest({
						executionContract: { runId: this.policy.executionRunId, mode: this.policy.executionMode },
						projectInstructionDigest: this.policy.projectInstruction?.digest ?? null,
						request: action,
						step: request.step,
						revision: request.revision,
					}),
				},
				action,
				registration,
				this.policy,
				cwdSafe,
			);
			await this.audit.prepare(decision);
			if (decision.decision !== "ALLOW") {
				checks.push({
					...base,
					status:
						request.handoff.role === "Executor" || this.policy.r2RunId || this.policy.r3Scope
							? "FAIL"
							: "UNAVAILABLE",
					reason: "Check blocked by execution policy",
				});
				continue;
			}
			let intentOpen = true;
			try {
				await this.audit.assertWritable();
				if (!(await this.cwdSafe(action.cwd))) {
					intentOpen = false;
					await this.audit.finish(decision.runId, decision.actionId, "FAILED");
					checks.push({
						...base,
						status:
							request.handoff.role === "Executor" || this.policy.r2RunId || this.policy.r3Scope
								? "FAIL"
								: "UNAVAILABLE",
						reason: "Check cwd changed after intent persistence",
					});
					continue;
				}
				const trustSnapshot = this.trustSnapshots[index];
				if (trustSnapshot?.mode === "strict") {
					const pre = validateVerifierTrust(this.workspace.cwd, trustSnapshot);
					if (!pre.ok) {
						intentOpen = false;
						await this.audit.finish(decision.runId, decision.actionId, "FAILED");
						checks.push({
							...base,
							// A trust violation is never PASS and never silently optional.
							status: "FAIL",
							reason: `${pre.reason ?? "Verifier trust source changed"} before execution`,
							trust: verifierTrustEvidence(trustSnapshot, "STALE"),
						});
						continue;
					}
				}
				request.signal?.throwIfAborted();
				this.processCleanupConfirmed = false;
				const result = await runProcess({
					executable: action.executable,
					argv: action.argv,
					cwd,
					env: action.env,
					timeoutMs: action.timeoutMs,
					signal: request.signal,
				});
				this.processCleanupConfirmed = result.cleanupConfirmed;
				if (!this.safeToRelease) {
					intentOpen = false;
					await this.audit.finish(decision.runId, decision.actionId, "INTERRUPTED");
					throw new ProcessCleanupError();
				}
				await this.audit.assertWritable();
				intentOpen = false;
				await this.audit.finish(
					decision.runId,
					decision.actionId,
					request.signal?.aborted
						? "INTERRUPTED"
						: result.reason === "exited" && result.exitCode === 0
							? "SUCCEEDED"
							: "FAILED",
				);
				let current: DiffEvidence;
				try {
					current = await this.workspace.inspect();
				} catch {
					if (!this.workspace.safeToRelease) throw new ProcessCleanupError();
					current = { ...before, safe: false };
				}
				const post = trustSnapshot ? validateVerifierTrust(this.workspace.cwd, trustSnapshot) : undefined;
				checks.push({
					...base,
					status:
						post && !post.ok
							? "FAIL"
							: result.reason === "unavailable"
								? "UNAVAILABLE"
								: result.reason === "exited" &&
										result.exitCode === 0 &&
										current.safe &&
										!request.signal?.aborted
									? "PASS"
									: "FAIL",
					exitCode: result.exitCode,
					reason: post
						? post.ok
							? `Check ${request.signal?.aborted ? "cancelled" : result.reason}${current.safe ? "" : "; unsupported mutation"}`
							: `${post.reason ?? "Verifier trust source changed"} during execution`
						: `Check ${request.signal?.aborted ? "cancelled" : result.reason}${current.safe ? "" : "; unsupported mutation"}`,
					startedAt: result.startedAt,
					finishedAt: result.finishedAt,
					stdout: result.stdout,
					stderr: result.stderr,
					diffDigest: current.diffDigest,
					...(trustSnapshot
						? {
								trust: verifierTrustEvidence(
									trustSnapshot,
									post?.ok ? (trustSnapshot.mode === "strict" ? "VERIFIED" : "UNVERIFIED") : "STALE",
								),
							}
						: {}),
				});
			} catch (error) {
				// An intent may remain PREPARED on storage failure; S2 recovery marks it INTERRUPTED, never replays.
				if (!this.safeToRelease) throw new ProcessCleanupError();
				if (request.signal?.aborted && intentOpen && error === request.signal.reason) {
					await this.audit.finish(decision.runId, decision.actionId, "INTERRUPTED");
					checks.push({ ...base, reason: "Cancelled before process start" });
				} else throw error;
			}
		}
		let final: DiffEvidence;
		try {
			final = await this.workspace.inspect();
		} catch {
			if (!this.workspace.safeToRelease) throw new ProcessCleanupError();
			final = { ...before, safe: false };
		}
		const lspConfig = this.config.code_intelligence?.lsp;
		let lspEvidence: LspEvidence[] | undefined;
		if (this.lsp && lspConfig?.enabled && final.safe && !request.signal?.aborted) {
			try {
				lspEvidence = await collectLspEvidence(this.lsp, lspConfig, request, final.changedFiles, final.diffDigest);
			} catch (error) {
				if (error instanceof ProcessCleanupError || this.lsp.cleanupFailed) {
					this.processCleanupConfirmed = false;
					throw new ProcessCleanupError();
				}
				if (!request.signal?.aborted) throw error;
				// Preserve already-executed process outcomes on LSP cancellation, as on process cancellation.
				const now = Date.now();
				lspEvidence = [
					{
						serverId: "runtime",
						status: "ERROR",
						diagnostics: [],
						reason: "LSP diagnostics cancelled",
						diffDigest: final.diffDigest,
						evidenceRef: `lsp:${request.runId}:${request.step.stepId}:${request.step.attempt}:cancelled`,
						startedAt: now,
						finishedAt: now,
						withheld: 0,
						truncated: 0,
					},
				];
			}
		}
		if (lspEvidence) {
			try {
				final = await this.workspace.inspect();
			} catch {
				if (!this.workspace.safeToRelease) throw new ProcessCleanupError();
				final = { ...final, safe: false };
			}
			markStaleLspEvidence(lspEvidence, final.diffDigest, final.safe);
		}
		for (const [index, check] of checks.entries())
			if (check.status === "PASS" && this.trustSnapshots[index]?.mode === "strict") {
				const settled = validateVerifierTrust(this.workspace.cwd, this.trustSnapshots[index]!);
				if (!settled.ok) {
					check.status = "FAIL";
					check.reason = `${settled.reason ?? "Verifier trust source changed"} before result settlement`;
					check.trust = verifierTrustEvidence(this.trustSnapshots[index]!, "STALE");
				}
			}
		for (const check of checks)
			if (
				check.status === "PASS" &&
				(request.signal?.aborted || !final.safe || check.diffDigest !== final.diffDigest)
			) {
				check.status = "FAIL";
				check.reason = request.signal?.aborted
					? "Verification cancelled before result settlement"
					: "Workspace changed or evidence unavailable; check evidence is stale";
			}
		return {
			runId: request.runId,
			revision: request.revision,
			step: request.step,
			diffDigest: final.diffDigest,
			evidenceRefs: [...final.evidenceRefs, ...(lspEvidence?.map((item) => item.evidenceRef) ?? [])],
			...(lspEvidence ? { lspEvidence } : {}),
			changedFiles: final.changedFiles,
			checks,
			reviewContext: {
				diff: final.diff,
				evidence: [
					{
						ref: final.evidenceRefs[0],
						content: `Actual changed files: ${JSON.stringify(final.changedFiles)}\nDigest: ${final.diffDigest}`,
					},
					...checks.map((check) => ({ ref: check.evidenceRefs[0], content: JSON.stringify(check) })),
					...(lspEvidence?.map((item) => ({ ref: item.evidenceRef, content: JSON.stringify(item) })) ?? []),
				],
			},
		};
	}
}
