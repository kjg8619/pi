import type {
	ApprovalDecision,
	ApprovalProposal,
	ApprovalRequest,
	CheckRequirement,
	ExecutorHandoff,
	Handoff,
	QuickScope,
	Review,
	RoleSessionReference,
	Run,
	StepReference,
	Task,
	VerificationResult,
} from "./contracts.ts";
import type { RuntimeEventSink } from "./events.ts";
import type { ExecutionMode } from "./execution-contract.ts";
import type { LspPort } from "./lsp/types.ts";
import type { ProjectInstructionMetadata } from "./project-instruction-types.ts";

export type { LspPort } from "./lsp/types.ts";

interface StepRequest {
	runId: string;
	/** Code revision cycle, not the monotonically increasing Run.revision used by StateStore. */
	revision: number;
	step: StepReference;
	task: Task;
	signal?: AbortSignal;
}

export type AgentExecutionRequest = StepRequest & {
	executionMode: ExecutionMode;
	projectInstruction?: ProjectInstructionMetadata | null;
	/** Trusted run-owned code intelligence; excluded from worker prompts and data clones. */
	lsp?: LspPort;
	/** Adapter calls once, before prompting. Rejection prevents worker execution. No Pi types cross this boundary. */
	onSessionCreated?: (reference: RoleSessionReference) => Promise<void>;
	onApprovalRequested?: (proposal: ApprovalProposal, signal?: AbortSignal) => Promise<ApprovalDecision>;
	onApprovalConsumed?: (actionId: string) => Promise<void>;
} & (
		| { role: "Developer"; profile: "coding"; previousReview?: Review }
		| { role: "Executor"; profile: "coding"; scope: QuickScope }
		| { role: "Reviewer"; profile: "reasoning"; handoff: Handoff; verification: VerificationResult }
	);
export type AgentExecutionResult =
	| { role: "Developer"; handoff: Handoff }
	| { role: "Executor"; handoff: ExecutorHandoff }
	| { role: "Reviewer"; review: Review };

export interface AgentExecutor {
	/** False while resources are live or cleanup is unconfirmed. A settled call alone is not termination proof. */
	readonly safeToRelease?: boolean;
	execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
}

export interface VerificationRequest extends StepRequest {
	handoff: Handoff | ExecutorHandoff;
	checks: CheckRequirement[];
}
export interface Verifier {
	readonly safeToRelease?: boolean;
	verify(request: VerificationRequest): Promise<VerificationResult>;
	/** Live workspace evidence, without executing checks. Required by the S4 adapter, optional for pure fakes. */
	inspect?(signal?: AbortSignal): Promise<NonNullable<Run["workspace"]>>;
}

/** One run snapshot at a time. Files, locks and durable storage are S2 adapter responsibilities. */
export interface StateStore {
	load(runId: string): Promise<Run | undefined>;
	save(run: Run): Promise<void>;
}

export type { ApprovalDecision, ApprovalRequest } from "./contracts.ts";
export interface ApprovalPort {
	requestApproval(request: ApprovalRequest, signal?: AbortSignal): Promise<ApprovalDecision>;
}

export interface KernelPorts {
	agents: AgentExecutor;
	verifier: Verifier;
	store: StateStore;
	events?: RuntimeEventSink;
	/** Human authority for explicitly supported R3 actions, not a general execution permission. */
	approval?: ApprovalPort;
}
