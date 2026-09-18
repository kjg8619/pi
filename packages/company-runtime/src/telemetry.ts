import {
	defineTelemetrySchema,
	type SpanAttributes,
	type SpanStatus,
	type TelemetryContext,
} from "@earendil-works/pi-telemetry";

export { NOOP_TELEMETRY_CONTEXT } from "@earendil-works/pi-telemetry";

/**
 * Weavra span vocabulary. Attributes are bounded identifiers and counts only:
 * no prompts, completions, reasoning text, file contents, tool arguments/outputs, credentials or raw env.
 */
export const WEAVRA_TELEMETRY_SCHEMA = defineTelemetrySchema({
	version: 1,
	spans: {
		"weavra.run": {
			description: "One Weavra run from preflight to terminal state.",
			parents: { kind: "root_or_external" },
			startAttributes: {
				runId: { type: "string", description: "Run identifier", required: true, cardinality: "high" },
				workflow: {
					type: "string",
					description: "Selected workflow",
					required: true,
					values: ["QUICK", "STANDARD"],
				},
				risk: {
					type: "string",
					description: "Risk classification",
					required: true,
					values: ["R0", "R1", "R2", "R3"],
				},
				executionMode: {
					type: "string",
					description: "Execution contract",
					required: true,
					values: ["READ_ONLY", "EDIT"],
				},
			},
			endAttributes: {
				status: {
					type: "string",
					description: "Terminal run status",
					required: false,
					values: ["COMPLETED", "BLOCKED", "FAILED", "CANCELLED", "INTERRUPTED"],
				},
				changedFiles: { type: "number", description: "Changed file count", required: false },
				durationMs: { type: "number", description: "Wall-clock duration", required: false },
			},
			status: { default: "ok", errorWhen: "status is BLOCKED, FAILED, CANCELLED or INTERRUPTED" },
		},
		"weavra.worker": {
			description: "One worker session invocation.",
			parents: { kind: "spans", spans: ["weavra.run"] },
			startAttributes: {
				role: {
					type: "string",
					description: "Worker role",
					required: true,
					values: ["Developer", "Executor", "Reviewer"],
				},
				profile: { type: "string", description: "Model profile", required: true, values: ["coding", "reasoning"] },
				revision: { type: "number", description: "Code revision cycle", required: true },
				provider: { type: "string", description: "Requested provider", required: true },
				model: { type: "string", description: "Requested model", required: true },
			},
			endAttributes: {
				actualProvider: { type: "string", description: "Session provider", required: false },
				actualModel: { type: "string", description: "Session model", required: false },
				thinking: { type: "string", description: "Provider thinking level when reported", required: false },
				outcome: {
					type: "string",
					description: "Invocation outcome",
					required: false,
					values: ["SUCCEEDED", "FAILED", "CANCELLED"],
				},
				durationMs: { type: "number", description: "Wall-clock duration", required: false },
				modelTurns: { type: "number", description: "Assistant turns", required: false },
				toolCalls: { type: "number", description: "Tool call count", required: false },
				reportedTokens: {
					type: "number",
					description: "Provider-reported total tokens when available",
					required: false,
				},
			},
			status: { default: "ok", errorWhen: "outcome is FAILED or CANCELLED" },
		},
	},
});

/** Telemetry is observation only: exporter failures must never change an execution result. */
export async function withSpan<T>(
	telemetry: TelemetryContext,
	name: string,
	attributes: SpanAttributes,
	callback: () => Promise<T> | T,
	onEnd?: (value: T) => { status: SpanStatus; attributes?: SpanAttributes },
): Promise<T> {
	const value = await telemetry.startSpan({ name, attributes }, async (span) => {
		try {
			const result = await callback();
			if (onEnd) {
				const end = onEnd(result);
				span.setAttributes(end.attributes ?? {});
				span.setStatus(end.status);
			}
			return result;
		} catch (error) {
			span.setStatus({
				status: "error",
				error: {
					name: error instanceof Error ? error.name : "Error",
					message: error instanceof Error ? error.message : "unknown",
				},
			});
			throw error;
		}
	});
	return value;
}
