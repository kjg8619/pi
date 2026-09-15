import type { Review, RoleSessionReference, Run, StepReference } from "./contracts.ts";

interface EventIdentity {
	schemaVersion: 1;
	runId: string;
	taskId: string;
	sequence: number;
	stateRevision: number;
	timestamp: number;
}

/** Observation payloads, not commands or an event-sourced state model. */
export type RuntimeEventDetail =
	| { type: "RunCreated" | "RunStarted" | "RunCompleted" }
	| { type: "RunFailed" | "RunBlocked" | "RunCancelled" | "RunInterrupted"; reason: string }
	| { type: "StepStarted" | "StepCompleted"; step: StepReference }
	| { type: "StepFailed"; step: StepReference; reason: string }
	| {
			type: "AgentStarted" | "AgentCompleted";
			step: StepReference;
			role: "Developer" | "Reviewer";
			sessionRef?: RoleSessionReference;
	  }
	| {
			type: "AgentFailed";
			step: StepReference;
			role: "Developer" | "Reviewer";
			reason: string;
			sessionRef?: RoleSessionReference;
	  }
	| {
			type: "AgentSessionCreated";
			step: StepReference;
			role: "Developer" | "Reviewer";
			profile: "coding" | "reasoning";
			revision: number;
			sessionRef: RoleSessionReference;
	  }
	| { type: "ReviewRequested"; step: StepReference }
	| { type: "ReviewPassed" | "ReviewRevisionRequested" | "ReviewBlocked"; step: StepReference; review: Review }
	| { type: "VerificationStarted"; step: StepReference }
	| { type: "VerificationCompleted"; step: StepReference; diffDigest: string; checkIds: string[] }
	| { type: "VerificationFailed"; step: StepReference; reason: string }
	// Reserved for the action approval adapter; S1 never approves R3 execution.
	| { type: "ApprovalRequested"; step: StepReference; actionId: string }
	| { type: "ApprovalResolved"; step: StepReference; actionId: string; approved: boolean };

export type RuntimeEvent = EventIdentity & RuntimeEventDetail;

export interface RuntimeEventSink {
	emit(event: RuntimeEvent): void | Promise<void>;
}

export interface EventDeliveryFailure {
	sequence: number;
	type: RuntimeEvent["type"];
}

/** No global bus, replay or delivery retry. A missing sink is a no-op. */
export function createRuntimeEvent(run: Run, sequence: number, detail: RuntimeEventDetail): RuntimeEvent {
	return {
		...structuredClone(detail),
		schemaVersion: 1,
		runId: run.runId,
		taskId: run.currentTask,
		sequence,
		stateRevision: run.revision,
		timestamp: run.updatedAt,
	};
}
