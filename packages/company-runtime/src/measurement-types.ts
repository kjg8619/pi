import { type Static, Type } from "typebox";

const counter = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const text = Type.String({ minLength: 1, pattern: "\\S" });
const strict = { additionalProperties: false } as const;

// Leaf module on purpose: contracts.ts imports these schemas, so this file must not import contracts.ts.
// Role and step literals are owned by contracts.ts (RoleSchema, StepReferenceSchema) and kept in sync here.
const role = Type.Enum(["Executor", "Developer", "Reviewer", "Lead"]);
const step = Type.Object(
	{
		stepId: Type.Enum(["implement", "self-check", "review", "test", "complete"]),
		attempt: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
	},
	strict,
);

/**
 * Provider-reported usage for one worker invocation.
 * `source: "provider"` means every assistant message reported usage; `"unavailable"` means at least one did not,
 * so the numeric fields are partial and must render as UNKNOWN. `reasoning` is a subset of `output` and is never
 * added into `totalTokens` (the provider-reported total is preferred).
 */
export const WorkerUsageSchema = Type.Object(
	{
		source: Type.Enum(["provider", "unavailable"]),
		input: counter,
		output: counter,
		cacheRead: counter,
		cacheWrite: counter,
		totalTokens: counter,
		reasoning: Type.Optional(counter),
	},
	strict,
);
export type WorkerUsage = Static<typeof WorkerUsageSchema>;

export const WorkerMeasurementSchema = Type.Object(
	{
		role,
		profile: text,
		revision: counter,
		step,
		requestedProvider: text,
		requestedModel: text,
		actualProvider: text,
		actualModel: text,
		// Absent when the provider never echoed a concrete response model; render as UNKNOWN.
		responseModel: Type.Optional(text),
		providerThinkingLevel: Type.Optional(text),
		startedAt: counter,
		finishedAt: counter,
		durationMs: counter,
		modelTurns: counter,
		toolCalls: counter,
		toolCallsByName: Type.Record(text, counter),
		usage: WorkerUsageSchema,
		outcome: Type.Enum(["SUCCEEDED", "FAILED", "CANCELLED"]),
	},
	strict,
);
export type WorkerMeasurement = Static<typeof WorkerMeasurementSchema>;
