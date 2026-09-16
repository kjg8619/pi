import { awaitApproval, selectR3Scope } from "./approval.ts";
import { selectWorkflow } from "./classification.ts";
import {
	type ApprovalDecision,
	type ApprovalProposal,
	ApprovalRequestSchema,
	type CheckRequirement,
	CheckRequirementSchema,
	type Classification,
	ClassificationSchema,
	type ExecutorHandoff,
	ExecutorHandoffSchema,
	type Handoff,
	HandoffSchema,
	QUICK_STEP_IDS,
	type QuickScope,
	type Review,
	ReviewSchema,
	type Risk,
	type RoleSessionReference,
	RoleSessionReferenceSchema,
	type Run,
	RunSchema,
	STANDARD_STEP_IDS,
	STANDARD_STEP_PHASES,
	type StepId,
	type Task,
	TaskSchema,
	type VerificationResult,
	VerificationResultSchema,
	validateContract,
	type Workflow,
} from "./contracts.ts";
import { createRuntimeEvent, type EventDeliveryFailure, type RuntimeEventDetail } from "./events.ts";
import type { KernelPorts } from "./ports.ts";
import { assertQuickWorkspace, selectQuickScope } from "./quick.ts";

export interface CreateRunRequest {
	runId: string;
	task: Task;
	classification: Classification;
	workflow?: Workflow | "adaptive";
	maxRevisionCycles?: number;
	checks?: CheckRequirement[];
	approvalTimeoutMs?: number;
}

class BlockedError extends Error {}

function requireEvidence(condition: boolean, reason: string): void {
	if (!condition) throw new BlockedError(reason);
}

function assertIdentity(value: { runId: string; revision: number }, runId: string, revision: number): void {
	requireEvidence(
		value.runId === runId && value.revision === revision,
		"Result belongs to another run or code revision",
	);
}

function assertVerification(
	result: VerificationResult,
	runId: string,
	revision: number,
	checks: CheckRequirement[],
): void {
	validateContract(VerificationResultSchema, result);
	assertIdentity(result, runId, revision);
	requireEvidence(result.checks.length === checks.length, "Verification omitted or added checks");
	const ids = new Set<string>();
	for (const check of result.checks) {
		assertIdentity(check, runId, revision);
		requireEvidence(
			!check.step || (check.step.stepId === result.step.stepId && check.step.attempt === result.step.attempt),
			"Check step metadata is stale",
		);
		const expected = checks.find((item) => item.id === check.id);
		requireEvidence(
			!ids.has(check.id) && expected !== undefined,
			"Verification contains duplicate or unknown checks",
		);
		ids.add(check.id);
		requireEvidence(
			expected?.kind === check.kind && expected.required === check.required,
			"Verification changed the check contract",
		);
		requireEvidence(check.diffDigest === result.diffDigest, "Verification evidence is stale");
		requireEvidence(check.status !== "FAIL", "A verification check failed");
		requireEvidence(!check.required || check.status === "PASS", "A required verification check was not performed");
		if (check.status === "PASS") {
			requireEvidence(
				check.exitCode === 0 && check.evidenceRefs.length > 0,
				"PASS requires exit code zero and evidence",
			);
		} else {
			requireEvidence(check.exitCode === null, "Unexecuted checks cannot have an exit code");
		}
	}
}

function assertReview(review: Review, task: Task, verification: VerificationResult): void {
	validateContract(ReviewSchema, review);
	assertIdentity(review, verification.runId, verification.revision);
	requireEvidence(
		review.task === task.id && review.diffDigest === verification.diffDigest,
		"Review target or diff is stale",
	);
	const evidence = new Set([
		...verification.evidenceRefs,
		...verification.checks.flatMap((check) => check.evidenceRefs),
	]);
	requireEvidence(
		review.evidenceRefs.length > 0 && review.evidenceRefs.every((ref) => evidence.has(ref)),
		"Review references unknown or missing evidence",
	);
	const requirements = new Set(review.requirements.map((item) => item.requirement));
	requireEvidence(
		requirements.size === task.requirements.length &&
			review.requirements.length === task.requirements.length &&
			task.requirements.every((item) => requirements.has(item)),
		"Review did not cover the exact task requirements",
	);
	for (const item of review.requirements) {
		requireEvidence(
			item.evidenceRefs.every((ref) => evidence.has(ref)),
			"Requirement references unknown evidence",
		);
		if (review.result === "PASS")
			requireEvidence(
				item.status === "MET" && item.evidenceRefs.length > 0,
				"PASS requires evidence for every requirement",
			);
	}
	if (review.result === "PASS")
		requireEvidence(!review.issues.some((issue) => issue.severity === "blocker"), "PASS contains a blocking issue");
}

export interface CompletionEvidence {
	runId: string;
	revision: number;
	task: Task;
	checks: CheckRequirement[];
	handoff?: Handoff | ExecutorHandoff;
	workflow?: Workflow;
	risk?: Risk;
	r3Scope?: Run["r3Scope"];
	approvals?: Run["approvals"];
	developerSession?: RoleSessionReference;
	reviewerSession?: RoleSessionReference;
	quickScope?: QuickScope;
	executorDigest?: string;
	workspace?: Run["workspace"];
	review?: Review;
	selfCheck?: VerificationResult;
	finalCheck?: VerificationResult;
}

/** Independent guard: a phase label, natural-language success or schema-valid PASS is not sufficient. */
export function assertCanComplete(evidence: CompletionEvidence): void {
	const { runId, revision, task, checks, handoff, review, selfCheck, finalCheck } = evidence;
	if (evidence.risk === "R3") {
		const approval = evidence.approvals?.[0];
		requireEvidence(
			evidence.workflow === "STANDARD" &&
				revision === 0 &&
				!!evidence.r3Scope &&
				evidence.r3Scope.runId === runId &&
				evidence.approvals?.length === 1 &&
				approval?.status === "CONSUMED" &&
				approval.request.runId === runId &&
				approval.request.path === evidence.r3Scope.targetPath &&
				approval.request.operation === "delete-file" &&
				approval.request.revision === revision &&
				approval.request.step.stepId === "implement" &&
				approval.request.step.attempt === revision + 1 &&
				JSON.stringify(evidence.workspace?.changedFiles) === JSON.stringify([evidence.r3Scope.targetPath]) &&
				JSON.stringify(handoff?.changed_files) === JSON.stringify([evidence.r3Scope.targetPath]),
			"R3 completion requires consumed one-file approval and actual scoped deletion evidence",
		);
	}
	if (evidence.risk === "R2" || evidence.risk === "R3") {
		requireEvidence(evidence.workflow === "STANDARD", "R2 requires STANDARD independent review");
		const developer = evidence.developerSession;
		const reviewer = evidence.reviewerSession;
		if (!developer || !reviewer)
			throw new BlockedError("R2 requires current Developer and independent Reviewer sessions");
		validateContract(RoleSessionReferenceSchema, developer);
		validateContract(RoleSessionReferenceSchema, reviewer);
		requireEvidence(
			developer.role === "Developer" &&
				reviewer.role === "Reviewer" &&
				developer.sessionId !== reviewer.sessionId &&
				developer.sessionFile !== reviewer.sessionFile,
			"R2 requires different implementation/review sessions",
		);
		requireEvidence(
			checks.some((check) => check.required) &&
				evidence.workspace?.safe === true &&
				evidence.workspace.diffDigest === finalCheck?.diffDigest,
			"R2 requires required checks and live workspace evidence",
		);
	}
	const quick = evidence.workflow === "QUICK";
	if (!handoff || (!quick && !review) || !selfCheck || !finalCheck)
		throw new BlockedError("Completion requires handoff, required review and both verification stages");
	if (quick) validateContract(ExecutorHandoffSchema, handoff);
	else validateContract(HandoffSchema, handoff);
	assertIdentity(handoff, runId, revision);
	requireEvidence(
		handoff.task === task.id && handoff.unresolved.length === 0,
		"Handoff has the wrong task or unresolved work",
	);
	assertVerification(selfCheck, runId, revision, checks);
	assertVerification(finalCheck, runId, revision, checks);
	requireEvidence(
		selfCheck.step.stepId === "self-check" &&
			finalCheck.step.stepId === "test" &&
			selfCheck.step.attempt === revision + 1 &&
			finalCheck.step.attempt === revision + 1,
		"Completion verification belongs to another step attempt",
	);
	if (quick) {
		requireEvidence(
			revision === 0 && checks.some((check) => check.required) && !review,
			"QUICK requires required checks and no review/revision reuse",
		);
		if (!evidence.quickScope || !evidence.workspace || handoff.role !== "Executor")
			throw new BlockedError("QUICK completion requires trusted scope and live workspace evidence");
		try {
			assertQuickWorkspace(evidence.quickScope, evidence.workspace);
		} catch (error) {
			throw new BlockedError(error instanceof Error ? error.message : "Invalid QUICK scope");
		}
		requireEvidence(
			evidence.executorDigest === selfCheck.diffDigest &&
				selfCheck.diffDigest === finalCheck.diffDigest &&
				finalCheck.diffDigest === evidence.workspace.diffDigest,
			"QUICK digest changed after SELF_CHECK; verification is stale",
		);
		requireEvidence(
			// Read-only findings do not imply unfinished work; mutations still require risk resolution.
			(evidence.quickScope.risk === "R0" || handoff.known_risks.length === 0) &&
				handoff.requirements.length === task.requirements.length &&
				new Set(handoff.requirements.map((item) => item.requirement)).size === task.requirements.length &&
				task.requirements.every((requirement) =>
					handoff.requirements.some((item) => item.requirement === requirement && item.status === "MET"),
				),
			"QUICK requirements incomplete or risks unresolved; STANDARD required",
		);
		requireEvidence(
			new Set(handoff.changed_files).size === handoff.changed_files.length &&
				JSON.stringify([...handoff.changed_files].sort()) ===
					JSON.stringify([...evidence.workspace.changedFiles].sort()),
			"Executor result does not match actual changed files",
		);
		return;
	}
	if (!review) throw new BlockedError("Independent review missing");
	assertReview(review, task, selfCheck);
	requireEvidence(review.result === "PASS", "Completion requires an independent Reviewer PASS");
	requireEvidence(
		review.diffDigest === finalCheck.diffDigest,
		"Final verification changed the reviewed diff; another review is required",
	);
}

/** Sequential, host-independent control logic. No filesystem, Pi SDK, provider or UI calls. */
export class CompanyKernel {
	private state: Run;
	private readonly ports: KernelPorts;
	private readonly now: () => number;
	private readonly checks: CheckRequirement[];
	private readonly maxRevisionCycles: number;
	private readonly approvalTimeoutMs: number;
	private busy = false;
	private storageFailed = false;
	private handoff?: Handoff | ExecutorHandoff;
	private developerSession?: RoleSessionReference;
	private reviewerSession?: RoleSessionReference;
	private review?: Review;
	private selfCheck?: VerificationResult;
	private finalCheck?: VerificationResult;
	private readonly eventFailures: EventDeliveryFailure[] = [];

	private constructor(state: Run, request: CreateRunRequest, ports: KernelPorts, now: () => number) {
		this.state = state;
		this.ports = ports;
		this.now = now;
		this.checks = structuredClone(request.checks ?? []);
		this.maxRevisionCycles = state.maxRevisionCycles ?? 0;
		this.approvalTimeoutMs = request.approvalTimeoutMs ?? 30_000;
	}

	static async create(
		request: CreateRunRequest,
		ports: KernelPorts,
		now: () => number = Date.now,
	): Promise<CompanyKernel> {
		request = structuredClone(request);
		validateContract(TaskSchema, request.task);
		validateContract(ClassificationSchema, request.classification);
		if (
			request.task.status !== "pending" ||
			new Set(request.task.requirements).size !== request.task.requirements.length
		) {
			throw new Error("New runs require a pending task with unique requirements");
		}
		if (
			!Number.isInteger(request.approvalTimeoutMs ?? 30_000) ||
			(request.approvalTimeoutMs ?? 30_000) < 1 ||
			(request.approvalTimeoutMs ?? 30_000) > 60_000
		)
			throw new Error("Invalid approval timeout");
		const limit = request.maxRevisionCycles ?? 1;
		if (!Number.isInteger(limit) || limit < 0 || limit > 3)
			throw new Error("Revision limit must be an integer from 0 to 3");
		const ids = new Set<string>();
		for (const check of request.checks ?? []) {
			validateContract(CheckRequirementSchema, check);
			if (ids.has(check.id)) throw new Error("Duplicate check ID");
			ids.add(check.id);
		}
		const selection = selectWorkflow(request.classification, request.workflow);
		const timestamp = now();
		const state = validateContract(RunSchema, {
			schemaVersion: 1,
			revision: 0,
			eventSequence: 0,
			currentStep: null,
			runId: request.runId,
			goal: request.task.goal,
			status: "CREATED",
			phase: "PREFLIGHT",
			workflow: selection.workflow,
			...(request.classification.risk === "R3"
				? { r3Scope: selectR3Scope(request.task.goal, request.runId), approvals: [] }
				: {}),
			...(selection.workflow === "QUICK"
				? { quickScope: selectQuickScope(request.task.goal, request.classification) }
				: {}),
			classification: request.classification,
			risk: request.classification.risk,
			currentTask: request.task.id,
			tasks: [request.task],
			activeAgents: [],
			completed: [],
			next: ["implement"],
			roleSessionRefs: [],
			revisionCycle: 0,
			maxRevisionCycles: selection.workflow === "QUICK" || request.classification.risk === "R3" ? 0 : limit,
			reviewHistory: [],
			verification: [],
			lastError: null,
			createdAt: timestamp,
			updatedAt: timestamp,
		});
		if (await ports.store.load(request.runId))
			throw new Error("Run ID already exists; S1 does not resume or overwrite runs");
		const kernel = new CompanyKernel(state, request, ports, now);
		await kernel.persist({}, [{ type: "RunCreated" }]);
		return kernel;
	}

	get snapshot(): Run {
		return structuredClone(this.state);
	}
	get deliveryFailures(): EventDeliveryFailure[] {
		return structuredClone(this.eventFailures);
	}

	private assertTransition(status: Run["status"]): void {
		if (this.storageFailed || this.busy || this.state.status !== status)
			throw new Error("Invalid transition for the current run state");
	}

	private async persist(patch: Partial<Run>, details: RuntimeEventDetail[]): Promise<void> {
		const previousSequence = this.state.eventSequence;
		const next = validateContract(RunSchema, {
			...this.state,
			...structuredClone(patch),
			revision: this.state.revision + 1,
			eventSequence: previousSequence + details.length,
			updatedAt: this.now(),
		});
		try {
			await this.ports.store.save(structuredClone(next));
		} catch (error) {
			// No further actions on this instance. The durable state may be older; never emit completion.
			this.storageFailed = true;
			this.state = {
				...this.state,
				status: "FAILED",
				activeAgents: [],
				next: [],
				lastError: "State persistence failed",
				tasks: this.state.tasks.map((task) => ({ ...task, status: "blocked" })),
			};
			throw error;
		}
		this.state = next;
		for (const [index, detail] of details.entries()) {
			const event = createRuntimeEvent(next, previousSequence + index + 1, detail);
			try {
				await this.ports.events?.emit(structuredClone(event));
			} catch {
				// Observer failure is not an execution result. Keep diagnostics separate and do not retry.
				this.eventFailures.push({ sequence: event.sequence, type: event.type });
			}
		}
	}

	async start(): Promise<Run> {
		this.assertTransition("CREATED");
		this.busy = true;
		try {
			if (
				this.state.workflow === "COMPLEX" ||
				(this.state.risk === "R3" && (!this.state.r3Scope || !this.ports.approval)) ||
				((this.state.risk === "R2" || this.state.risk === "R3") &&
					(!this.ports.verifier.inspect || !this.checks.some((check) => check.required))) ||
				(this.state.workflow === "QUICK" &&
					(this.state.risk === "R2" ||
						!this.ports.verifier.inspect ||
						!this.checks.some((check) => check.required)))
			) {
				await this.finish(
					"BLOCKED",
					"Unsupported workflow/risk or missing QUICK/R2 live verification/required checks",
					[],
				);
			} else {
				await this.persist(
					{
						status: "RUNNING",
						phase: "IMPLEMENT",
						currentStep: { stepId: "implement", attempt: 1 },
						tasks: this.state.tasks.map((task) => ({ ...task, status: "inProgress" })),
					},
					[{ type: "RunStarted" }],
				);
			}
			return this.snapshot;
		} finally {
			this.busy = false;
		}
	}

	private async finish(
		status: "BLOCKED" | "FAILED" | "CANCELLED" | "INTERRUPTED",
		reason: string,
		events: RuntimeEventDetail[],
		reviewHistory?: Review[],
	): Promise<void> {
		const eventType = {
			BLOCKED: "RunBlocked",
			FAILED: "RunFailed",
			CANCELLED: "RunCancelled",
			INTERRUPTED: "RunInterrupted",
		} as const;
		await this.persist(
			{
				status,
				...(reviewHistory ? { reviewHistory } : {}),
				...(this.state.approvals
					? {
							approvals: this.state.approvals.map((record) =>
								record.status === "PENDING" || record.status === "APPROVED"
									? {
											...record,
											status: status === "CANCELLED" ? ("CANCELLED" as const) : ("INTERRUPTED" as const),
										}
									: record,
							),
						}
					: {}),
				lastError: reason,
				...(this.review ? { review: this.review } : {}),
				activeAgents: [],
				next: [],
				tasks: this.state.tasks.map((task) => ({ ...task, status: "blocked" })),
			},
			[...events, { type: eventType[status], reason }],
		);
	}

	/** Step-boundary stop only. In-flight cancellation is supplied via advance's AbortSignal. */
	async stop(status: "CANCELLED" | "INTERRUPTED", reason: string): Promise<Run> {
		this.assertTransition("RUNNING");
		if (status !== "CANCELLED" && status !== "INTERRUPTED") throw new Error("Invalid stop status");
		if (!reason.trim()) throw new Error("A stop reason is required");
		this.busy = true;
		try {
			await this.finish(status, reason, []);
			return this.snapshot;
		} finally {
			this.busy = false;
		}
	}

	private assertQuickScope(workspace: NonNullable<Run["workspace"]>): void {
		if (!this.state.quickScope) return;
		requireEvidence(
			!this.state.executorDigest || workspace.diffDigest === this.state.executorDigest,
			"QUICK digest changed after Executor result; verification is stale, rerun as STANDARD",
		);
		try {
			assertQuickWorkspace(this.state.quickScope, workspace);
		} catch (error) {
			throw new BlockedError(error instanceof Error ? error.message : "QUICK scope exceeded");
		}
	}

	/** One fixed sequential workflow step per call. The caller cannot skip/reorder steps or inject a target status. */
	async advance(expectedStep: StepId, signal?: AbortSignal): Promise<Run> {
		this.assertTransition("RUNNING");
		const step = this.state.currentStep;
		if (!step || step.stepId !== expectedStep || this.state.phase !== STANDARD_STEP_PHASES[expectedStep]) {
			throw new Error("Invalid transition: unexpected workflow step");
		}
		this.busy = true;
		let started = false;
		let sessionRef: RoleSessionReference | undefined;
		let sessionRegistrationOpen = true;
		let approvalCallbacksOpen = true;
		let approvalInFlight = false;
		let approvalFailure: string | undefined;
		const task = structuredClone(this.state.tasks[0]);
		const revision = this.state.revisionCycle;
		const request = { runId: this.state.runId, revision, step: structuredClone(step), task };
		const startEvents: RuntimeEventDetail[] = [{ type: "StepStarted", step }];
		const role =
			expectedStep === "implement"
				? this.state.workflow === "QUICK"
					? "Executor"
					: "Developer"
				: expectedStep === "review"
					? "Reviewer"
					: undefined;
		const onSessionCreated = async (reference: RoleSessionReference): Promise<void> => {
			if (!sessionRegistrationOpen) throw new Error("Worker session registration is closed");
			sessionRegistrationOpen = false;
			signal?.throwIfAborted();
			const ref = validateContract(RoleSessionReferenceSchema, structuredClone(reference));
			if (
				!role ||
				ref.role !== role ||
				sessionRef ||
				this.state.roleSessionRefs.some(
					(item) => item.sessionId === ref.sessionId || item.sessionFile === ref.sessionFile,
				)
			)
				throw new Error("Invalid or reused worker session reference");
			await this.persist({ roleSessionRefs: [...this.state.roleSessionRefs, ref] }, [
				{
					type: "AgentSessionCreated",
					step,
					role,
					profile: role === "Reviewer" ? "reasoning" : "coding",
					revision,
					sessionRef: ref,
				},
			]);
			sessionRef = ref;
			signal?.throwIfAborted();
		};
		const onApprovalRequested = async (
			proposal: ApprovalProposal,
			workerSignal?: AbortSignal,
		): Promise<ApprovalDecision> => {
			if (
				!approvalCallbacksOpen ||
				approvalInFlight ||
				this.state.status !== "RUNNING" ||
				this.state.risk !== "R3" ||
				!this.state.r3Scope ||
				!this.ports.approval ||
				role !== "Developer" ||
				!sessionRef ||
				expectedStep !== "implement"
			)
				throw new Error("Approval is not available for this action/role");
			const request = validateContract(ApprovalRequestSchema, {
				...structuredClone(proposal),
				expiresAt: this.now() + this.approvalTimeoutMs,
			});
			if (
				request.runId !== this.state.runId ||
				request.path !== this.state.r3Scope.targetPath ||
				request.step.stepId !== "implement" ||
				request.step.attempt !== step.attempt ||
				request.revision !== revision ||
				this.state.approvals?.some((record) => record.request.actionId === request.actionId)
			)
				throw new Error("Approval proposal identity mismatch or replay");
			approvalInFlight = true;
			try {
				await this.persist(
					{
						status: "WAITING_APPROVAL",
						approvals: [...(this.state.approvals ?? []), { request, status: "PENDING" }],
					},
					[{ type: "ApprovalRequested", step, actionId: request.actionId }],
				);
				const combined =
					workerSignal && signal ? AbortSignal.any([workerSignal, signal]) : (workerSignal ?? signal);
				const outcome = await awaitApproval(request, this.ports.approval, combined, this.now);
				await this.persist(
					{
						status: "RUNNING",
						approvals: this.state.approvals!.map((record) =>
							record.request.actionId === request.actionId ? { ...record, status: outcome.status } : record,
						),
					},
					[
						{
							type: "ApprovalResolved",
							step,
							actionId: request.actionId,
							approved: outcome.decision.approved,
							outcome: outcome.status,
						},
					],
				);
				if (!outcome.decision.approved)
					approvalFailure = `Human approval ${outcome.status.toLowerCase()}; action was not executed`;
				return outcome.decision;
			} finally {
				approvalInFlight = false;
			}
		};
		const onApprovalConsumed = async (actionId: string): Promise<void> => {
			if (
				!approvalCallbacksOpen ||
				this.state.risk !== "R3" ||
				role !== "Developer" ||
				!this.state.approvals?.some(
					(record) => record.request.actionId === actionId && record.status === "APPROVED",
				)
			)
				throw new Error("Approval consumption is invalid or late");
			await this.persist(
				{
					approvals: this.state.approvals.map((record) =>
						record.request.actionId === actionId ? { ...record, status: "CONSUMED" as const } : record,
					),
				},
				[{ type: "ApprovalConsumed", step, actionId }],
			);
		};
		if (expectedStep === "review") startEvents.push({ type: "ReviewRequested", step });
		if (role) startEvents.push({ type: "AgentStarted", step, role });
		if (expectedStep === "self-check" || expectedStep === "test")
			startEvents.push({ type: "VerificationStarted", step });
		try {
			signal?.throwIfAborted();
			await this.persist({ activeAgents: role ? [role] : [] }, startEvents);
			started = true;
			signal?.throwIfAborted();
			if (this.state.quickScope && this.ports.verifier.inspect) {
				const workspace = await this.ports.verifier.inspect(signal);
				await this.persist({ workspace }, []);
				this.assertQuickScope(workspace);
				signal?.throwIfAborted();
			}
			const endEvents: RuntimeEventDetail[] = [];
			const patch: Partial<Run> = {};
			switch (expectedStep) {
				case "implement": {
					const result = await this.ports.agents.execute({
						...structuredClone(request),
						signal,
						profile: "coding",
						onSessionCreated,
						...(this.state.workflow === "QUICK"
							? { role: "Executor", scope: this.state.quickScope! }
							: {
									role: "Developer",
									previousReview: structuredClone(this.review),
									...(this.state.risk === "R3" ? { onApprovalRequested, onApprovalConsumed } : {}),
								}),
					});
					signal?.throwIfAborted();
					requireEvidence(this.ports.agents.safeToRelease !== false, "Worker cleanup is unconfirmed");
					approvalCallbacksOpen = false;
					if (result.role === "Reviewer" || result.role !== role)
						throw new Error("Expected matching implementation role result");
					const handoff = structuredClone(
						result.role === "Executor"
							? validateContract(ExecutorHandoffSchema, result.handoff)
							: validateContract(HandoffSchema, result.handoff),
					);
					assertIdentity(handoff, this.state.runId, revision);
					requireEvidence(handoff.task === task.id, "Handoff belongs to another task");
					if (this.state.risk === "R2" || this.state.risk === "R3")
						requireEvidence(sessionRef?.role === "Developer", "R2 Developer session reference is required");
					this.developerSession = sessionRef;
					this.reviewerSession = undefined;
					this.handoff = handoff;
					this.review = undefined;
					this.selfCheck = undefined;
					this.finalCheck = undefined;
					patch.review = undefined;
					if (handoff.role === "Executor") patch.executorResult = handoff;
					else patch.handoff = handoff;
					endEvents.push({
						type: "AgentCompleted",
						step,
						role: result.role,
						...(sessionRef ? { sessionRef } : {}),
					});
					break;
				}
				case "self-check":
				case "test": {
					if (this.state.risk === "R3")
						requireEvidence(
							this.state.approvals?.some((record) => record.status === "CONSUMED") === true,
							"R3 checks require the approved deletion to have been executed and recorded first",
						);
					if (!this.handoff) throw new Error("Missing Developer handoff");
					const result = structuredClone(
						await this.ports.verifier.verify({
							...structuredClone(request),
							signal,
							handoff: structuredClone(this.handoff),
							checks: structuredClone(this.checks),
						}),
					);
					requireEvidence(this.ports.verifier.safeToRelease !== false, "Verification cleanup is unconfirmed");
					// Persist actual outcomes even when cancellation or later diff collection fails.
					validateContract(VerificationResultSchema, result);
					assertIdentity(result, this.state.runId, revision);
					requireEvidence(
						result.step.stepId === step.stepId && result.step.attempt === step.attempt,
						"Verification belongs to another step attempt",
					);
					await this.persist({ verification: [...this.state.verification, ...result.checks] }, []);
					if (this.ports.verifier.inspect)
						await this.persist({ workspace: await this.ports.verifier.inspect() }, []);
					signal?.throwIfAborted();
					assertVerification(result, this.state.runId, revision, this.checks);
					if (expectedStep === "self-check") this.selfCheck = result;
					else this.finalCheck = result;
					endEvents.push({
						type: "VerificationCompleted",
						step,
						diffDigest: result.diffDigest,
						checkIds: result.checks.map((check) => check.id),
					});
					break;
				}
				case "review": {
					if (!this.handoff || this.handoff.role !== "Developer" || !this.selfCheck)
						throw new Error("Review requires Developer handoff and self-check evidence");
					const result = await this.ports.agents.execute({
						...structuredClone(request),
						signal,
						role: "Reviewer",
						profile: "reasoning",
						onSessionCreated,
						handoff: structuredClone(this.handoff),
						verification: structuredClone(this.selfCheck),
					});
					signal?.throwIfAborted();
					requireEvidence(this.ports.agents.safeToRelease !== false, "Worker cleanup is unconfirmed");
					if (result.role !== "Reviewer") throw new Error("Expected Reviewer result");
					if (this.state.risk === "R2" || this.state.risk === "R3")
						requireEvidence(
							sessionRef?.role === "Reviewer",
							"R2 independent Reviewer session reference is required",
						);
					this.reviewerSession = sessionRef;
					const review = structuredClone(result.review);
					assertReview(review, task, this.selfCheck);
					this.review = review;
					patch.review = review;
					const reviewHistory = [...(this.state.reviewHistory ?? []), review];
					patch.reviewHistory = reviewHistory;
					const type = {
						PASS: "ReviewPassed",
						REVISE: "ReviewRevisionRequested",
						BLOCK: "ReviewBlocked",
					} as const;
					endEvents.push(
						{ type: "AgentCompleted", step, role: "Reviewer", ...(sessionRef ? { sessionRef } : {}) },
						{ type: type[review.result], step, review },
						{ type: "StepCompleted", step },
					);
					if (review.result === "BLOCK" || (review.result === "REVISE" && revision >= this.maxRevisionCycles)) {
						await this.finish(
							"BLOCKED",
							review.result === "BLOCK" ? "Reviewer blocked the task" : "Revision limit reached",
							endEvents,
							reviewHistory,
						);
						return this.snapshot;
					}
					if (review.result === "REVISE") {
						await this.persist(
							{
								review,
								reviewHistory,
								revisionCycle: revision + 1,
								phase: "IMPLEMENT",
								currentStep: { stepId: "implement", attempt: revision + 2 },
								activeAgents: [],
								next: ["implement"],
							},
							endEvents,
						);
						return this.snapshot;
					}
					// Common path appends StepCompleted once.
					endEvents.pop();
					break;
				}
				case "complete": {
					requireEvidence(
						this.ports.agents.safeToRelease !== false && this.ports.verifier.safeToRelease !== false,
						"Completion requires confirmed resource cleanup",
					);
					if (this.ports.verifier.inspect) {
						const workspace = await this.ports.verifier.inspect(signal);
						await this.persist({ workspace }, []);
						signal?.throwIfAborted();
						requireEvidence(
							workspace.safe && workspace.diffDigest === this.finalCheck?.diffDigest,
							"Workspace changed after final checks; review is stale",
						);
					}
					assertCanComplete({
						...request,
						checks: this.checks,
						workflow: this.state.workflow,
						risk: this.state.risk,
						r3Scope: this.state.r3Scope,
						approvals: this.state.approvals,
						developerSession: this.developerSession,
						reviewerSession: this.reviewerSession,
						quickScope: this.state.quickScope,
						executorDigest: this.state.executorDigest,
						workspace: this.state.workspace,
						handoff: this.handoff,
						review: this.review,
						selfCheck: this.selfCheck,
						finalCheck: this.finalCheck,
					});
					await this.persist(
						{
							status: "COMPLETED",
							activeAgents: [],
							completed: [task.id],
							next: [],
							tasks: [{ ...task, status: "completed" }],
							lastError: null,
						},
						[{ type: "StepCompleted", step }, { type: "RunCompleted" }],
					);
					return this.snapshot;
				}
			}
			const steps: readonly StepId[] = this.state.workflow === "QUICK" ? QUICK_STEP_IDS : STANDARD_STEP_IDS;
			const nextStep = steps[steps.indexOf(expectedStep) + 1];
			const workspace = this.ports.verifier.inspect ? await this.ports.verifier.inspect(signal) : undefined;
			if (workspace) this.assertQuickScope(workspace);
			if (this.state.workflow === "QUICK" && expectedStep === "implement" && workspace)
				patch.executorDigest = workspace.diffDigest;
			await this.persist(
				{
					...patch,
					...(workspace ? { workspace } : {}),
					phase: STANDARD_STEP_PHASES[nextStep],
					currentStep: { stepId: nextStep, attempt: revision + 1 },
					activeAgents: [],
					next: [nextStep],
				},
				[...endEvents, { type: "StepCompleted", step }],
			);
			return this.snapshot;
		} catch (error) {
			if (this.storageFailed) throw error;
			if (
				this.ports.verifier.inspect &&
				this.ports.agents.safeToRelease !== false &&
				this.ports.verifier.safeToRelease !== false
			) {
				try {
					await this.persist({ workspace: await this.ports.verifier.inspect() }, []);
				} catch {
					if (this.storageFailed) throw error;
				}
			}
			const cancelled = signal?.aborted === true;
			const reason = cancelled
				? "Run cancelled"
				: (approvalFailure ?? (error instanceof Error ? error.message : "Step execution failed"));
			const failures: RuntimeEventDetail[] = [];
			if (started) {
				if (role) failures.push({ type: "AgentFailed", step, role, reason, ...(sessionRef ? { sessionRef } : {}) });
				if (expectedStep === "self-check" || expectedStep === "test")
					failures.push({ type: "VerificationFailed", step, reason });
				failures.push({ type: "StepFailed", step, reason });
			}
			await this.finish(
				cancelled ? "CANCELLED" : error instanceof BlockedError || approvalFailure ? "BLOCKED" : "FAILED",
				reason,
				failures,
			);
			return this.snapshot;
		} finally {
			sessionRegistrationOpen = false;
			approvalCallbacksOpen = false;
			this.busy = false;
		}
	}
}
