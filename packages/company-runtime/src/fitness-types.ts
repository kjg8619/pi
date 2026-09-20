import { type Static, Type } from "typebox";

const strict = { additionalProperties: false } as const;
const count = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const nullableCount = Type.Union([count, Type.Null()]);
const digest = Type.String({ pattern: "^sha256:[0-9a-f]{64}$" });
const nullableDigest = Type.Union([digest, Type.Null()]);
const identifier = (maxLength: number) =>
	Type.String({ minLength: 1, maxLength, pattern: "^[A-Za-z0-9][A-Za-z0-9._:/+-]*$" });
export const FitnessIdSchema = Type.String({
	pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
});
export const FitnessBudgetSchema = Type.Object(
	{
		maxFixtures: Type.Integer({ minimum: 1, maximum: 64 }),
		maxWorkerCalls: Type.Integer({ minimum: 1, maximum: 256 }),
		maxTotalTokens: Type.Integer({ minimum: 1, maximum: 10_000_000 }),
		maxCostUsd: Type.Optional(Type.Number({ exclusiveMinimum: 0, maximum: 10000 })),
	},
	strict,
);
export type FitnessBudget = Static<typeof FitnessBudgetSchema>;

export const ProviderTargetSchema = Type.Object(
	{
		provider: identifier(128),
		model: identifier(256),
		api: identifier(64),
		endpointIdentity: digest,
		harnessRevision: Type.String({ pattern: "^[0-9a-f]{40}$" }),
		toolSchemaRevision: digest,
		promptRuntimeRevision: digest,
		configurationDigest: digest,
	},
	strict,
);
export type ProviderTarget = Static<typeof ProviderTargetSchema>;

export const FitnessFixtureResultSchema = Type.Object(
	{
		fixtureId: identifier(64),
		fixtureDigest: digest,
		runId: Type.Union([FitnessIdSchema, Type.Null()]),
		taskContractDigest: nullableDigest,
		registeredCheckDigest: digest,
		configurationDigest: digest,
		terminalStatus: Type.Enum(["COMPLETED", "BLOCKED", "FAILED", "CANCELLED", "INTERRUPTED", "NOT_STARTED"]),
		oracle: Type.Enum(["PASS", "FAIL", "INVALID"]),
		falseCompletion: Type.Union([Type.Boolean(), Type.Null()]),
		latencyMs: count,
		ac: Type.Object({ met: nullableCount, notMet: nullableCount }, strict),
		checks: Type.Object({ passed: count, failed: count, notRun: count }, strict),
		contract: Type.Object(
			{
				scopeViolations: count,
				forbiddenMutationAttempts: count,
				taskContractAdherence: Type.Union([Type.Boolean(), Type.Null()]),
				strictReceiptRejections: count,
				handoffRejections: count,
				reviewRejections: count,
			},
			strict,
		),
		tools: Type.Object(
			{
				calls: count,
				invalidCalls: count,
				retries: count,
				runtimeRead: count,
				runtimeEdit: count,
				runtimeWrite: count,
				lsp: count,
			},
			strict,
		),
		reliability: Type.Object(
			{
				providerErrors: count,
				authErrors: count,
				transportErrors: nullableCount,
				timeouts: count,
				cancellation: Type.Enum(["NOT_REQUESTED", "CANCELLED", "FAILED", "NOT_REACHED"]),
				repairCount: count,
				reviewerRevisionCount: count,
				cleanup: Type.Enum(["CONFIRMED", "UNCONFIRMED"]),
			},
			strict,
		),
		efficiency: Type.Object(
			{
				usage: Type.Object(
					{
						state: Type.Enum(["KNOWN", "UNKNOWN"]),
						input: nullableCount,
						output: nullableCount,
						total: nullableCount,
						knownTotal: count,
						cacheRead: Type.Optional(nullableCount),
						cacheWrite: Type.Optional(nullableCount),
						reasoning: Type.Optional(nullableCount),
						detailSource: Type.Optional(Type.Literal("SDK_NORMALIZED")),
					},
					strict,
				),
				workerInvocations: count,
				modelTurns: count,
				httpAttempts: nullableCount,
				contextBytes: count,
				costUsd: Type.Union([Type.Number({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }), Type.Null()]),
			},
			strict,
		),
		evidenceDigest: digest,
	},
	strict,
);
export type FitnessFixtureResult = Static<typeof FitnessFixtureResultSchema>;

export const ProviderFitnessRunSchema = Type.Object(
	{
		schemaVersion: Type.Literal(1),
		id: FitnessIdSchema,
		corpusRevision: identifier(128),
		corpusDigest: digest,
		target: ProviderTargetSchema,
		kind: Type.Enum(["ACTUAL", "FAUX"]),
		startedAt: count,
		completedAt: nullableCount,
		status: Type.Enum([
			"RUNNING",
			"COMPLETED",
			"CANCELLED",
			"BUDGET_EXHAUSTED",
			"CALIBRATION_FAILED",
			"FAILED",
			"INTERRUPTED",
		]),
		budget: FitnessBudgetSchema,
		plannedFixtures: Type.Array(identifier(64), { minItems: 1, maxItems: 64, uniqueItems: true }),
		fixtures: Type.Array(FitnessFixtureResultSchema, { maxItems: 64 }),
		environment: Type.Object({ platform: identifier(64), arch: identifier(64), node: identifier(64) }, strict),
		resultDigest: digest,
	},
	strict,
);
export type ProviderFitnessRun = Static<typeof ProviderFitnessRunSchema>;
