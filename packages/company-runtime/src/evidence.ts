import { isCriteriaReview, isTaskContract, type Run } from "./contracts.ts";
import { displayText } from "./observations.ts";

/**
 * Read-only projection of durable Run state plus the live workflow report. It is never an execution authority,
 * never mutates state and never contains prompts, completions, reasoning text, tool arguments or credentials.
 */
export const EVIDENCE_PACK_VERSION = 1;

export type EvidenceFailureCategory =
	| "PREFLIGHT"
	| "POLICY"
	| "PROVIDER"
	| "TOOL"
	| "BUDGET"
	| "VERIFICATION"
	| "REVIEW"
	| "APPROVAL"
	| "STORAGE"
	| "CLEANUP"
	| "CANCELLED"
	| "UNKNOWN";

export interface EvidencePackInput {
	run: Run;
	report?: {
		changedFiles: string[];
		partialChanges: boolean;
		changesUnknown: boolean;
		error?: string;
	};
}

export interface EvidenceWorkerSummary {
	role: string;
	revision: number;
	step: string;
	provider: string;
	model: string;
	responseModel: string | null;
	thinking: string | null;
	outcome: string;
	durationMs: number;
	modelTurns: number;
	toolCalls: number;
	toolCallsByName: Record<string, number>;
	reportedTokens: number | null;
}

export interface EvidencePack {
	version: number;
	runId: string;
	status: string;
	goal: string;
	workflow: string;
	risk: string;
	executionMode: string | null;
	taskContract: {
		digest: string | null;
		criteria: Array<{ id: string; statement: string; status: string; evidenceRefs: string[] }>;
	} | null;
	acceptanceLegacyUnknown: boolean;
	workspace: { diffDigest: string | null; changedFiles: string[]; changedLines: number | null };
	checks: Array<{
		id: string;
		step: string;
		status: string;
		required: boolean;
		exitCode: number | null;
		evidenceRefs: string[];
		trust: {
			mode: string;
			status: string;
			registrationDigest: string;
			executableDigest: string;
			sources: Array<{ path: string; digest: string }>;
		} | null;
		sandbox: {
			mode: string;
			status: string;
			backend: string;
			backendVersion: string;
			policyDigest: string;
		} | null;
	}>;
	lsp: { available: boolean; stale: boolean } | null;
	review: {
		result: string;
		independent: boolean;
		criteria: Array<{ criterionId: string; status: string; evidenceRefs: string[] }>;
	} | null;
	approval: { status: string; target: string } | null;
	failure: { category: EvidenceFailureCategory; reason: string | null } | null;
	partialChanges: boolean;
	cleanup: "confirmed" | "uncertain" | "UNKNOWN";
	workers: EvidenceWorkerSummary[];
	budget: {
		configured: boolean;
		workerInvocations: number;
		reportedTokens: number | null;
		maxWorkerInvocations: number | null;
		maxReportedTokens: number | null;
		exceeded: boolean;
		reason: string | null;
	};
	provenance: {
		runtimeSourceCommit: string | null;
		runtimeSourcePath: string | null;
		cliBundleSha256: string | null;
		cliBundleMtimeMs: number | null;
		cliBundleVersion: string | null;
		targetWorkspaceCommit: string | null;
		configDigest: string | null;
		taskContractDigest: string | null;
		capturedAt: number | null;
	};
	limitations: string[];
}

/** Only structured, known signals are mapped; ambiguous failures stay UNKNOWN instead of guessing from text. */
function failureCategory(run: Run, error: string | undefined): EvidenceFailureCategory {
	if (run.budget?.exceeded) return "BUDGET";
	if (run.status === "CANCELLED") return "CANCELLED";
	if (
		run.approvals?.some(
			(record) => record.status === "DENIED" || record.status === "EXPIRED" || record.status === "CANCELLED",
		)
	)
		return "APPROVAL";
	if (run.verification.some((check) => check.status === "FAIL" || (check.required && check.status === "UNAVAILABLE")))
		return "VERIFICATION";
	if (run.review && !isCriteriaReview(run.review)) return "UNKNOWN";
	if (run.review && (run.review.result === "REVISE" || run.review.result === "BLOCK")) return "REVIEW";
	const text = (error ?? run.lastError ?? "").trim();
	if (!text) return "UNKNOWN";
	if (text.startsWith("Policy ")) return "POLICY";
	if (text.startsWith("Budget ")) return "BUDGET";
	if (text === "Worker provider failed") return "PROVIDER";
	if (text === "Worker tool failed or was denied") return "TOOL";
	if (text.startsWith("Runtime storage failed")) return "STORAGE";
	if (text.includes("cleanup unconfirmed") || text.includes("Resource cleanup unconfirmed")) return "CLEANUP";
	if (text.startsWith("Unsupported classification/workflow")) return "PREFLIGHT";
	return "UNKNOWN";
}

export function projectEvidencePack(input: EvidencePackInput): EvidencePack {
	const { run } = input;
	const report = input.report;
	const task = run.tasks[0];
	const contract = task && isTaskContract(task) ? task : null;
	const acceptance = new Map((run.acceptance ?? []).map((entry) => [entry.criterionId, entry]));
	const cleanup: EvidencePack["cleanup"] =
		report?.changesUnknown === true
			? "uncertain"
			: report && run.status === "COMPLETED" && !report.error
				? "confirmed"
				: "UNKNOWN";
	const limitations: string[] = [];
	if (!contract) limitations.push("Legacy run: acceptance criteria and measurements were not recorded");
	if (!run.workerMeasurements?.length && contract) limitations.push("No worker measurement recorded for this run");
	if (!run.provenance) limitations.push("No provenance snapshot recorded for this run");
	if (cleanup === "uncertain")
		limitations.push("Resource cleanup unconfirmed; do not treat this as a clean completion");
	if (run.workspace?.changedLines === undefined) limitations.push("Changed line count unknown");
	if (run.executionMode === undefined) limitations.push("Execution contract not recorded (legacy run)");
	const lspChecks = run.verification.flatMap((check) => check.evidenceRefs.filter((ref) => ref.startsWith("lsp:")));
	return {
		version: EVIDENCE_PACK_VERSION,
		runId: run.runId,
		status: run.status,
		goal: run.goal,
		workflow: run.workflow,
		risk: run.risk,
		executionMode: run.executionMode ?? null,
		taskContract: contract
			? {
					digest: run.taskContractDigest ?? null,
					criteria: contract.acceptanceCriteria.map((criterion) => ({
						id: criterion.id,
						statement: criterion.statement,
						status: acceptance.get(criterion.id)?.status ?? "UNKNOWN",
						evidenceRefs: acceptance.get(criterion.id)?.evidenceRefs ?? [],
					})),
				}
			: null,
		acceptanceLegacyUnknown: contract === null,
		workspace: {
			diffDigest: run.workspace?.diffDigest ?? null,
			changedFiles: run.workspace?.changedFiles ?? [],
			changedLines: run.workspace?.changedLines ?? null,
		},
		checks: run.verification.map((check) => ({
			id: check.id,
			step: check.step?.stepId ?? "unrecorded",
			status: check.status,
			required: check.required,
			exitCode: check.exitCode,
			evidenceRefs: [...check.evidenceRefs],
			// Bounded trust projection only: no raw contents, env, credentials or absolute executable paths.
			trust: check.trust
				? {
						mode: check.trust.mode,
						status: check.trust.status,
						registrationDigest: check.trust.registrationDigest,
						executableDigest: check.trust.executableDigest,
						sources: check.trust.sources.map((source) => ({ path: source.path, digest: source.digest })),
					}
				: null,
			sandbox: check.sandbox
				? {
						mode: check.sandbox.mode,
						status: check.sandbox.status,
						backend: check.sandbox.backend,
						backendVersion: check.sandbox.backendVersion,
						policyDigest: check.sandbox.policyDigest,
					}
				: null,
		})),
		lsp: lspChecks.length
			? { available: true, stale: (run.workspace?.evidenceRefs ?? []).some((ref) => ref.startsWith("stale:")) }
			: null,
		review: run.review
			? isCriteriaReview(run.review)
				? {
						result: run.review.result,
						independent:
							(run.roleSessionRefs ?? []).filter((ref) => ref.role === "Reviewer").length > 0 &&
							new Set((run.roleSessionRefs ?? []).map((ref) => ref.sessionId)).size ===
								(run.roleSessionRefs ?? []).length,
						criteria: run.review.criteria.map((item) => ({
							criterionId: item.criterionId,
							status: item.status,
							evidenceRefs: [...item.evidenceRefs],
						})),
					}
				: { result: run.review.result, independent: false, criteria: [] }
			: null,
		approval: run.approvals?.length
			? { status: run.approvals[0].status, target: run.approvals[0].request.path }
			: null,
		failure: ["COMPLETED"].includes(run.status)
			? null
			: { category: failureCategory(run, report?.error), reason: report?.error ?? run.lastError ?? null },
		partialChanges:
			report?.partialChanges ?? (run.status !== "COMPLETED" && (run.workspace?.changedFiles.length ?? 0) > 0),
		cleanup,
		workers: (run.workerMeasurements ?? []).map((measurement) => ({
			role: measurement.role,
			revision: measurement.revision,
			step: `${measurement.step.stepId}@${measurement.step.attempt}`,
			provider: measurement.actualProvider,
			model: measurement.actualModel,
			responseModel: measurement.responseModel ?? null,
			thinking: measurement.providerThinkingLevel ?? null,
			outcome: measurement.outcome,
			durationMs: measurement.durationMs,
			modelTurns: measurement.modelTurns,
			toolCalls: measurement.toolCalls,
			toolCallsByName: measurement.toolCallsByName,
			reportedTokens: measurement.usage.source === "provider" ? measurement.usage.totalTokens : null,
		})),
		budget: {
			configured: run.budget?.configured ?? false,
			workerInvocations: run.budget?.workerInvocations ?? 0,
			reportedTokens: run.budget?.reportedTokens ?? null,
			maxWorkerInvocations: run.budget?.maxWorkerInvocations ?? null,
			maxReportedTokens: run.budget?.maxReportedTokens ?? null,
			exceeded: run.budget?.exceeded ?? false,
			reason: run.budget?.reason ?? null,
		},
		provenance: {
			runtimeSourceCommit: run.provenance?.runtimeSource?.commit ?? null,
			runtimeSourcePath: run.provenance?.runtimeSource?.path ?? null,
			cliBundleSha256: run.provenance?.cliBundle?.sha256 ?? null,
			cliBundleMtimeMs: run.provenance?.cliBundle?.mtimeMs ?? null,
			cliBundleVersion: run.provenance?.cliBundle?.version ?? null,
			targetWorkspaceCommit: run.provenance?.targetWorkspaceCommit ?? null,
			configDigest: run.provenance?.configDigest ?? null,
			taskContractDigest: run.provenance?.taskContractDigest ?? null,
			capturedAt: run.provenance?.capturedAt ?? null,
		},
		limitations,
	};
}

const unknown = (value: unknown): string => (value === null || value === undefined ? "UNKNOWN" : String(value));

/** Human-readable summary. Estimated cost is UNKNOWN unless a trusted price source exists; today it never does. */
export function formatEvidencePack(pack: EvidencePack): string {
	const lines = [
		`Evidence Pack (read-only projection; not an execution authority)`,
		`Run: ${displayText(pack.runId)} | ${pack.status} | workflow ${pack.workflow} | risk ${pack.risk} | contract ${unknown(pack.executionMode)}`,
		`Goal: ${displayText(pack.goal)}`,
		`Task Contract: ${unknown(pack.taskContract?.digest)}`,
	];
	if (pack.taskContract)
		for (const criterion of pack.taskContract.criteria)
			lines.push(
				`  ${criterion.id} [${criterion.status}] ${displayText(criterion.statement)}` +
					(criterion.evidenceRefs.length
						? `; evidence: ${criterion.evidenceRefs.map((ref) => displayText(ref)).join(", ")}`
						: "; evidence: none recorded"),
			);
	else lines.push("  Acceptance criteria: UNKNOWN (legacy)");
	lines.push(
		`Workspace: diff ${unknown(pack.workspace.diffDigest)}; changed files ${pack.workspace.changedFiles.length ? pack.workspace.changedFiles.map((path) => displayText(path)).join(", ") : "none recorded"}; changed lines ${unknown(pack.workspace.changedLines)}`,
	);
	for (const check of pack.checks) {
		lines.push(
			`Check ${displayText(check.id)} (${check.step}${check.required ? ", required" : ""}): ${check.status}${check.exitCode === null ? "" : ` exit ${check.exitCode}`}`,
		);
		lines.push(
			check.sandbox
				? `  Verifier sandbox: ${check.sandbox.status} (${check.sandbox.backend} ${check.sandbox.backendVersion}); policy ${check.sandbox.policyDigest.slice(0, 20)}…; network denied`
				: "  Verifier sandbox: UNKNOWN (disabled or legacy)",
		);
		lines.push(
			check.trust
				? `  Verifier trust: ${check.trust.status} (${check.trust.mode}); registration ${check.trust.registrationDigest.slice(0, 20)}…; trusted sources ${check.trust.sources.length}`
				: "  Verifier trust: UNKNOWN (legacy)",
		);
	}
	lines.push(
		`LSP advisory evidence: ${pack.lsp ? (pack.lsp.stale ? "present (stale)" : "present") : "none recorded"}`,
	);
	lines.push(
		pack.review
			? `Reviewer: ${pack.review.result}; independent sessions: ${pack.review.independent ? "yes" : "no/UNKNOWN"}; criteria ${pack.review.criteria.length}`
			: "Reviewer: not required or not recorded",
	);
	lines.push(
		pack.approval
			? `R3 approval: ${pack.approval.status} on ${displayText(pack.approval.target)}`
			: "R3 approval: not applicable",
	);
	lines.push(
		`Budget: ${pack.budget.configured ? `invocations ${pack.budget.workerInvocations}/${unknown(pack.budget.maxWorkerInvocations)}, reported tokens ${unknown(pack.budget.reportedTokens)}/${unknown(pack.budget.maxReportedTokens)}` : "not configured (explicit unlimited)"}${pack.budget.exceeded ? `; EXCEEDED: ${displayText(pack.budget.reason ?? "reason unavailable")}` : ""}`,
	);
	lines.push(`Estimated cost: UNKNOWN (no trusted price source for this provider/model)`);
	if (!pack.workers.length) lines.push("Workers: no measurement recorded");
	for (const worker of pack.workers)
		lines.push(
			`  ${worker.role} ${worker.step} rev ${worker.revision}: ${worker.provider}/${worker.model}` +
				`${worker.responseModel ? ` (response ${worker.responseModel})` : ""} thinking ${unknown(worker.thinking)} | ${worker.outcome} ${worker.durationMs}ms | turns ${worker.modelTurns} | tools ${worker.toolCalls}${
					Object.keys(worker.toolCallsByName).length
						? ` (${Object.entries(worker.toolCallsByName)
								.map(([name, count]) => `${name}:${count}`)
								.join(", ")})`
						: ""
				} | reported tokens ${unknown(worker.reportedTokens)}`,
		);
	lines.push(
		`Partial changes: ${pack.partialChanges ? "yes" : "no"}; cleanup: ${pack.cleanup}`,
		`Failure: ${pack.failure ? `${pack.failure.category}${pack.failure.reason ? `: ${displayText(pack.failure.reason)}` : ""}` : "none (completed)"}`,
		`Provenance: runtime ${unknown(pack.provenance.runtimeSourceCommit)} (${unknown(pack.provenance.runtimeSourcePath)}); CLI bundle ${unknown(pack.provenance.cliBundleSha256)}${pack.provenance.cliBundleMtimeMs === null ? "" : ` mtime ${new Date(pack.provenance.cliBundleMtimeMs).toISOString()}`} version ${unknown(pack.provenance.cliBundleVersion)}; target HEAD ${unknown(pack.provenance.targetWorkspaceCommit)}; config ${unknown(pack.provenance.configDigest)}; contract ${unknown(pack.provenance.taskContractDigest)}; captured ${pack.provenance.capturedAt === null ? "UNKNOWN" : new Date(pack.provenance.capturedAt).toISOString()}`,
	);
	for (const limitation of pack.limitations) lines.push(`Limitation: ${displayText(limitation)}`);
	return lines.join("\n");
}
