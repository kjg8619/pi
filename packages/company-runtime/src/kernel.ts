import { selectWorkflow } from "./classification.ts";
import {
	type CheckRequirement,
	CheckRequirementSchema,
	type Classification,
	ClassificationSchema,
	type Handoff,
	HandoffSchema,
	type Review,
	ReviewSchema,
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

export interface CreateRunRequest {
	runId: string;
	task: Task;
	classification: Classification;
	workflow?: Workflow | "adaptive";
	maxRevisionCycles?: number;
	checks?: CheckRequirement[];
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
	handoff?: Handoff;
	review?: Review;
	selfCheck?: VerificationResult;
	finalCheck?: VerificationResult;
}

/** Independent guard: a phase label, natural-language success or schema-valid PASS is not sufficient. */
export function assertCanComplete(evidence: CompletionEvidence): void {
	const { runId, revision, task, checks, handoff, review, selfCheck, finalCheck } = evidence;
	if (!handoff || !review || !selfCheck || !finalCheck)
		throw new BlockedError("Completion requires handoff, review and both verification stages");
	validateContract(HandoffSchema, handoff);
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
	private busy = false;
	private storageFailed = false;
	private handoff?: Handoff;
	private review?: Review;
	private selfCheck?: VerificationResult;
	private finalCheck?: VerificationResult;
	private readonly eventFailures: EventDeliveryFailure[] = [];

	private constructor(state: Run, request: CreateRunRequest, ports: KernelPorts, now: () => number) {
		this.state = state;
		this.ports = ports;
		this.now = now;
		this.checks = structuredClone(request.checks ?? []);
		this.maxRevisionCycles = request.maxRevisionCycles ?? 1;
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
			classification: request.classification,
			risk: request.classification.risk,
			currentTask: request.task.id,
			tasks: [request.task],
			activeAgents: [],
			completed: [],
			next: ["implement"],
			roleSessionRefs: [],
			revisionCycle: 0,
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
			if (this.state.workflow !== "STANDARD" || this.state.risk === "R3") {
				await this.finish("BLOCKED", "S1 only models STANDARD execution and does not authorize R3 actions", []);
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

	/** One fixed STANDARD step per call. The caller cannot skip/reorder steps or inject a target status. */
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
		const task = structuredClone(this.state.tasks[0]);
		const revision = this.state.revisionCycle;
		const request = { runId: this.state.runId, revision, step: structuredClone(step), task };
		const startEvents: RuntimeEventDetail[] = [{ type: "StepStarted", step }];
		const role = expectedStep === "implement" ? "Developer" : expectedStep === "review" ? "Reviewer" : undefined;
		const onSessionCreated = async (reference: RoleSessionReference): Promise<void> => {
			if (!sessionRegistrationOpen) throw new Error("Worker session registration is closed");
			sessionRegistrationOpen = false;
			signal?.throwIfAborted();
			const ref = validateContract(RoleSessionReferenceSchema, structuredClone(reference));
			if (
				!role ||
				ref.role !== role ||
				sessionRef ||
				this.state.roleSessionRefs.some((item) => item.sessionId === ref.sessionId)
			)
				throw new Error("Invalid or reused worker session reference");
			await this.persist({ roleSessionRefs: [...this.state.roleSessionRefs, ref] }, [
				{
					type: "AgentSessionCreated",
					step,
					role,
					profile: role === "Developer" ? "coding" : "reasoning",
					revision,
					sessionRef: ref,
				},
			]);
			sessionRef = ref;
			signal?.throwIfAborted();
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
			const endEvents: RuntimeEventDetail[] = [];
			const patch: Partial<Run> = {};
			switch (expectedStep) {
				case "implement": {
					const result = await this.ports.agents.execute({
						...structuredClone(request),
						signal,
						role: "Developer",
						profile: "coding",
						onSessionCreated,
						previousReview: structuredClone(this.review),
					});
					signal?.throwIfAborted();
					if (result.role !== "Developer") throw new Error("Expected Developer result");
					const handoff = validateContract(HandoffSchema, structuredClone(result.handoff));
					assertIdentity(handoff, this.state.runId, revision);
					requireEvidence(handoff.task === task.id, "Handoff belongs to another task");
					this.handoff = handoff;
					this.review = undefined;
					this.selfCheck = undefined;
					this.finalCheck = undefined;
					patch.review = undefined;
					endEvents.push({
						type: "AgentCompleted",
						step,
						role: "Developer",
						...(sessionRef ? { sessionRef } : {}),
					});
					break;
				}
				case "self-check":
				case "test": {
					if (!this.handoff) throw new Error("Missing Developer handoff");
					const result = structuredClone(
						await this.ports.verifier.verify({
							...structuredClone(request),
							signal,
							handoff: structuredClone(this.handoff),
							checks: structuredClone(this.checks),
						}),
					);
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
					if (!this.handoff || !this.selfCheck) throw new Error("Review requires handoff and self-check evidence");
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
					if (result.role !== "Reviewer") throw new Error("Expected Reviewer result");
					const review = structuredClone(result.review);
					assertReview(review, task, this.selfCheck);
					this.review = review;
					patch.review = review;
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
						);
						return this.snapshot;
					}
					if (review.result === "REVISE") {
						await this.persist(
							{
								review,
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
			const nextStep = STANDARD_STEP_IDS[STANDARD_STEP_IDS.indexOf(expectedStep) + 1];
			await this.persist(
				{
					...patch,
					...(this.ports.verifier.inspect ? { workspace: await this.ports.verifier.inspect(signal) } : {}),
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
			if (this.ports.verifier.inspect) {
				try {
					await this.persist({ workspace: await this.ports.verifier.inspect() }, []);
				} catch {
					if (this.storageFailed) throw error;
				}
			}
			const cancelled = signal?.aborted === true;
			const reason = cancelled ? "Run cancelled" : error instanceof Error ? error.message : "Step execution failed";
			const failures: RuntimeEventDetail[] = [];
			if (started) {
				if (role) failures.push({ type: "AgentFailed", step, role, reason, ...(sessionRef ? { sessionRef } : {}) });
				if (expectedStep === "self-check" || expectedStep === "test")
					failures.push({ type: "VerificationFailed", step, reason });
				failures.push({ type: "StepFailed", step, reason });
			}
			await this.finish(
				cancelled ? "CANCELLED" : error instanceof BlockedError ? "BLOCKED" : "FAILED",
				reason,
				failures,
			);
			return this.snapshot;
		} finally {
			sessionRegistrationOpen = false;
			this.busy = false;
		}
	}
}
