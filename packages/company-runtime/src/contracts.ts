import { type Static, type TSchema, Type } from "typebox";
import { Check } from "typebox/value";

const text = Type.String({ minLength: 1, pattern: "\\S" });
const counter = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const texts = Type.Array(text);
const strict = { additionalProperties: false } as const;

export const STANDARD_STEP_IDS = ["implement", "self-check", "review", "test", "complete"] as const;
export const StepReferenceSchema = Type.Object(
	{ stepId: Type.Enum(STANDARD_STEP_IDS), attempt: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }) },
	strict,
);
export type StepReference = Static<typeof StepReferenceSchema>;
export type StepId = StepReference["stepId"];

export const WorkflowSchema = Type.Enum(["QUICK", "STANDARD", "COMPLEX"]);
export const RiskSchema = Type.Enum(["R0", "R1", "R2", "R3"]);
export const RoleSchema = Type.Enum(["Executor", "Developer", "Reviewer", "Lead"]);
export const CheckKindSchema = Type.Enum(["build", "lint", "test", "typecheck", "format", "custom"]);
export const ClassificationSchema = Type.Object(
	{
		intent: Type.Enum([
			"question",
			"analysis",
			"bugfix",
			"implementation",
			"refactor",
			"research",
			"architecture",
			"creative",
			"maintenance",
		]),
		complexity: WorkflowSchema,
		risk: RiskSchema,
		confidence: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()]),
		reason: text,
	},
	strict,
);

export const TaskSchema = Type.Object(
	{
		id: text,
		goal: text,
		requirements: Type.Array(text, { minItems: 1 }),
		status: Type.Enum(["pending", "inProgress", "completed", "blocked"]),
	},
	strict,
);

// Execution evidence is produced by the verifier, never inferred from agent prose.
export const CheckResultSchema = Type.Object(
	{
		id: text,
		runId: text,
		revision: counter,
		kind: CheckKindSchema,
		status: Type.Enum(["PASS", "FAIL", "SKIPPED", "UNAVAILABLE"]),
		required: Type.Boolean(),
		exitCode: Type.Union([Type.Integer(), Type.Null()]),
		reason: text,
		evidenceRefs: texts,
		diffDigest: text,
		startedAt: Type.Optional(counter),
		finishedAt: Type.Optional(counter),
		stdout: Type.Optional(Type.String({ maxLength: 16384 })),
		stderr: Type.Optional(Type.String({ maxLength: 16384 })),
	},
	strict,
);

export const CheckRequirementSchema = Type.Object(
	{ id: text, kind: CheckKindSchema, required: Type.Boolean() },
	strict,
);
export const VerificationResultSchema = Type.Object(
	{
		runId: text,
		revision: counter,
		step: StepReferenceSchema,
		diffDigest: text,
		evidenceRefs: Type.Array(text, { minItems: 1 }),
		checks: Type.Array(CheckResultSchema),
		changedFiles: Type.Optional(texts),
		// Explicit verifier-owned review material; no Pi messages or implicit worker context.
		reviewContext: Type.Optional(
			Type.Object(
				{
					diff: Type.String({ maxLength: 262144 }),
					evidence: Type.Array(Type.Object({ ref: text, content: Type.String({ maxLength: 262144 }) }, strict)),
				},
				strict,
			),
		),
	},
	strict,
);
export type CheckRequirement = Static<typeof CheckRequirementSchema>;
export type VerificationResult = Static<typeof VerificationResultSchema>;

export const HandoffSchema = Type.Object(
	{
		runId: text,
		revision: counter,
		role: Type.Literal("Developer"),
		task: text,
		changed_files: texts,
		summary: text,
		assumptions: texts,
		// References to verifier evidence, not agent-supplied check results.
		tests_run: texts,
		known_risks: texts,
		unresolved: texts,
	},
	strict,
);

export const ReviewSchema = Type.Object(
	{
		runId: text,
		revision: counter,
		role: Type.Literal("Reviewer"),
		task: text,
		result: Type.Enum(["PASS", "REVISE", "BLOCK"]),
		issues: Type.Array(
			Type.Object(
				{
					severity: Type.Enum(["info", "warning", "blocker"]),
					file: Type.Union([text, Type.Null()]),
					description: text,
					recommendation: text,
				},
				strict,
			),
		),
		requirements: Type.Array(
			Type.Object(
				{
					requirement: text,
					status: Type.Enum(["MET", "UNMET", "UNVERIFIED"]),
					evidenceRefs: texts,
				},
				strict,
			),
			{ minItems: 1 },
		),
		evidenceRefs: texts,
		diffDigest: text,
	},
	strict,
);

// A decision is not an approval token. R3 execution requires a separate, bound approval in S5.
export const PolicyDecisionSchema = Type.Object(
	{
		runId: text,
		actionId: text,
		role: Type.Union([RoleSchema, Type.Literal("Verifier")]),
		risk: Type.Union([RiskSchema, Type.Literal("UNKNOWN")]),
		decision: Type.Enum(["ALLOW", "DENY", "REVIEW_REQUIRED", "APPROVAL_REQUIRED"]),
		reason: text,
		actionDigest: text,
		configDigest: text,
	},
	strict,
);

export const RoleSessionReferenceSchema = Type.Object({ role: RoleSchema, sessionId: text, sessionFile: text }, strict);
export type RoleSessionReference = Static<typeof RoleSessionReferenceSchema>;

export const RunSchema = Type.Object(
	{
		schemaVersion: Type.Literal(1),
		revision: counter,
		eventSequence: counter,
		currentStep: Type.Union([StepReferenceSchema, Type.Null()]),
		runId: text,
		goal: text,
		status: Type.Enum([
			"CREATED",
			"RUNNING",
			"WAITING_APPROVAL",
			"BLOCKED",
			"FAILED",
			"CANCELLED",
			"INTERRUPTED",
			"COMPLETED",
		]),
		phase: Type.Enum(["PREFLIGHT", "IMPLEMENT", "SELF_CHECK", "REVIEW", "TEST", "COMPLETE"]),
		workflow: WorkflowSchema,
		classification: ClassificationSchema,
		risk: RiskSchema,
		currentTask: text,
		tasks: Type.Array(TaskSchema, { minItems: 1 }),
		activeAgents: Type.Array(RoleSchema, { uniqueItems: true }),
		completed: texts,
		next: texts,
		roleSessionRefs: Type.Array(RoleSessionReferenceSchema),
		revisionCycle: counter,
		workspace: Type.Optional(
			Type.Object({ diffDigest: text, changedFiles: texts, evidenceRefs: texts, safe: Type.Boolean() }, strict),
		),
		review: Type.Optional(ReviewSchema),
		verification: Type.Array(CheckResultSchema),
		lastError: Type.Union([text, Type.Null()]),
		createdAt: counter,
		updatedAt: counter,
	},
	strict,
);

export type Workflow = Static<typeof WorkflowSchema>;
export type Risk = Static<typeof RiskSchema>;
export type Role = Static<typeof RoleSchema>;
export type Classification = Static<typeof ClassificationSchema>;
export type Task = Static<typeof TaskSchema>;
export type CheckResult = Static<typeof CheckResultSchema>;
export type Handoff = Static<typeof HandoffSchema>;
export type Review = Static<typeof ReviewSchema>;
export type PolicyDecision = Static<typeof PolicyDecisionSchema>;
export type Run = Static<typeof RunSchema>;

export const STANDARD_STEP_PHASES = {
	implement: "IMPLEMENT",
	"self-check": "SELF_CHECK",
	review: "REVIEW",
	test: "TEST",
	complete: "COMPLETE",
} as const satisfies Record<StepId, Run["phase"]>;

/** Shape validation only. Kernel guards additionally check transitions, identity and evidence references. */
export function validateContract<T extends TSchema>(schema: T, value: unknown): Static<T> {
	if (!Check(schema, value)) throw new Error("Invalid runtime contract");
	return value;
}
