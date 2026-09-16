import { randomUUID } from "node:crypto";
import { lstat, realpath } from "node:fs/promises";
import { join } from "node:path";
import { workerDigest } from "./agent-tools.ts";
import type { RuntimeConfig } from "./config.ts";
import type { CheckResult, VerificationResult } from "./contracts.ts";
import { type ActionAudit, evaluateRegisteredCheck, type PolicyContext, type RegisteredCheck } from "./policy.ts";
import { FilePolicyPathInspector } from "./policy-paths.ts";
import type { VerificationRequest, Verifier } from "./ports.ts";
import { ProcessCleanupError, resolveExecutable, runProcess, verificationEnvironment } from "./process-runner.ts";
import type { DiffEvidence, GitWorkspace } from "./workspace.ts";

export class RegisteredVerifier implements Verifier {
	readonly workspace: GitWorkspace;
	private processCleanupConfirmed = true;
	get safeToRelease(): boolean {
		return this.processCleanupConfirmed && this.workspace.safeToRelease;
	}
	private readonly config: RuntimeConfig;
	private readonly policy: PolicyContext;
	private readonly audit: ActionAudit;
	private readonly paths: FilePolicyPathInspector;
	private readonly registrations: Array<RegisteredCheck | undefined>;
	private constructor(
		config: RuntimeConfig,
		policy: PolicyContext,
		audit: ActionAudit,
		workspace: GitWorkspace,
		paths: FilePolicyPathInspector,
		registrations: Array<RegisteredCheck | undefined>,
	) {
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
		return new RegisteredVerifier(
			config,
			structuredClone(policy),
			audit,
			workspace,
			await FilePolicyPathInspector.open(workspace.cwd),
			registrations,
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
		if (
			JSON.stringify(request.checks) !==
			JSON.stringify(configured.map(({ id, kind, required }) => ({ id, kind, required })))
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
					actionDigest: workerDigest({ request: action, step: request.step, revision: request.revision }),
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
				checks.push({
					...base,
					status:
						result.reason === "unavailable"
							? "UNAVAILABLE"
							: result.reason === "exited" && result.exitCode === 0 && current.safe && !request.signal?.aborted
								? "PASS"
								: "FAIL",
					exitCode: result.exitCode,
					reason: `Check ${request.signal?.aborted ? "cancelled" : result.reason}${current.safe ? "" : "; unsupported mutation"}`,
					startedAt: result.startedAt,
					finishedAt: result.finishedAt,
					stdout: result.stdout,
					stderr: result.stderr,
					diffDigest: current.diffDigest,
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
			evidenceRefs: final.evidenceRefs,
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
				],
			},
		};
	}
}
