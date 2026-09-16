import { createHash, randomUUID } from "node:crypto";
import {
	closeSync,
	constants,
	fstatSync,
	ftruncateSync,
	lstatSync,
	openSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { defineTool, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { parseRuntimeConfig, type RuntimeConfig } from "./config.ts";
import {
	ExecutorHandoffSchema,
	HandoffSchema,
	type Review,
	ReviewSchema,
	type VerificationResult,
	validateContract,
} from "./contracts.ts";
import {
	type ActionAudit,
	evaluatePolicy,
	executePolicyAction,
	type PolicyContext,
	type PolicyPathInspector,
} from "./policy.ts";
import type { AgentExecutionRequest, AgentExecutionResult } from "./ports.ts";

const text = Type.String({ minLength: 1, maxLength: 262144 });
const pathSchema = Type.String({ minLength: 1, maxLength: 4096 });
const strict = { additionalProperties: false } as const;
const MAX_BYTES = 262144;
export const WORKER_FILE_TOOLS = [
	{ id: "runtime_read", operation: "read" },
	{ id: "runtime_search", operation: "search" },
	{ id: "runtime_write", operation: "write" },
	{ id: "runtime_edit", operation: "edit" },
] as const;

/** Stable for the frozen JSON-shaped input constructed by this adapter. Never hashes credentials. */
export function workerDigest(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Exact verifier-owned references for this attempt; handoff prose and digests are not reference sources. */
export function trustedReviewEvidenceRefs(verification: VerificationResult): string[] {
	return [...new Set([...verification.evidenceRefs, ...verification.checks.flatMap((check) => check.evidenceRefs)])];
}

function readText(path: string): string {
	const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	try {
		const stat = fstatSync(fd);
		if (!stat.isFile() || stat.nlink !== 1 || stat.size > MAX_BYTES) throw new Error("Unsupported worker file");
		const content = readFileSync(fd, "utf8");
		if (content.includes("\0") || Buffer.byteLength(content) > MAX_BYTES) throw new Error("Unsupported worker text");
		return content;
	} finally {
		closeSync(fd);
	}
}

function deletionFingerprint(path: string): { preconditionDigest: string; bytes: number } {
	const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	try {
		const stat = fstatSync(fd);
		const current = lstatSync(path);
		if (
			!stat.isFile() ||
			stat.nlink !== 1 ||
			stat.size > MAX_BYTES ||
			current.ino !== stat.ino ||
			current.dev !== stat.dev ||
			current.isSymbolicLink()
		)
			throw new Error("Unsafe deletion target");
		const bytes = readFileSync(fd);
		if (bytes.length > MAX_BYTES || bytes.includes(0) || !Buffer.from(bytes.toString("utf8")).equals(bytes))
			throw new Error("Deletion supports bounded text files only");
		return {
			bytes: bytes.length,
			preconditionDigest: workerDigest({
				dev: stat.dev,
				ino: stat.ino,
				mode: stat.mode,
				size: stat.size,
				mtime: stat.mtimeMs,
				ctime: stat.ctimeMs,
				hash: createHash("sha256").update(bytes).digest("hex"),
			}),
		};
	} finally {
		closeSync(fd);
	}
}

function writeText(path: string, content: string, signal: AbortSignal): void {
	if (Buffer.byteLength(content) > MAX_BYTES) throw new Error("Worker write exceeds size limit");
	signal.throwIfAborted();
	const fd = openSync(
		path,
		constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW | constants.O_NONBLOCK,
		0o600,
	);
	try {
		const stat = fstatSync(fd);
		if (!stat.isFile() || stat.nlink !== 1) throw new Error("Unsupported worker target");
		signal.throwIfAborted();
		// Small synchronous I/O: no JS callback can start another action between this check and write.
		ftruncateSync(fd, 0);
		writeFileSync(fd, content, "utf8");
	} finally {
		closeSync(fd);
	}
}

export function createWorkerTools(options: {
	cwd: string;
	request: AgentExecutionRequest;
	config: RuntimeConfig;
	policy: PolicyContext;
	paths: PolicyPathInspector;
	audit: ActionAudit;
	signal: AbortSignal;
	assertActive: () => void;
}): {
	tools: ToolDefinition[];
	result: () => AgentExecutionResult | undefined;
	policyDenial: () => string | undefined;
	consumeReviewValidationError: (toolCallId: string) => boolean;
} {
	const { request, signal } = options;
	const evidenceRefs = request.role === "Reviewer" ? trustedReviewEvidenceRefs(request.verification) : [];
	const trustedEvidence = new Set(evidenceRefs);
	// Adapter-owned classification, never a model-supplied error label. Consumed once by the SDK event handler.
	const reviewValidationErrors = new Set<string>();
	let submitted: AgentExecutionResult | undefined;
	let policyDenial: string | undefined;
	const assertActive = () => {
		options.assertActive();
		signal.throwIfAborted();
		if (submitted) throw new Error("Worker already submitted its result");
	};
	const fileAction = async (tool: string, paths: string[], input: unknown, execute: () => string) => {
		assertActive();
		const frozenPaths = [...paths];
		const action = {
			runId: request.runId,
			actionId: randomUUID(),
			role: request.role,
			tool,
			risk:
				tool === "runtime_write" || tool === "runtime_edit"
					? options.policy.r2RunId
						? ("R2" as const)
						: ("R1" as const)
					: ("R0" as const),
			paths: frozenPaths,
			actionDigest: workerDigest({
				tool,
				paths: frozenPaths,
				input,
				step: request.step,
				revision: request.revision,
			}),
		};
		const result = await executePolicyAction(
			action,
			options.policy,
			{
				paths: options.paths,
				audit: options.audit,
				execute: async () => {
					assertActive();
					return execute();
				},
			},
			signal,
		);
		if (result.decision.decision !== "ALLOW") {
			policyDenial = `Policy ${result.decision.risk}/${result.decision.decision}: ${result.decision.reason}`;
			throw new Error(policyDenial);
		}
		return { content: [{ type: "text" as const, text: result.value ?? "" }], details: { actionId: action.actionId } };
	};
	const tools: ToolDefinition[] = [
		defineTool({
			name: "runtime_read",
			label: "Runtime read",
			description: "Read one allowed workspace text file (maximum 256 KiB).",
			executionMode: "sequential",
			parameters: Type.Object({ path: pathSchema }, strict),
			execute: async (_id, params) =>
				fileAction("runtime_read", [params.path], params, () => readText(join(options.cwd, params.path))),
		}),
		defineTool({
			name: "runtime_search",
			label: "Runtime search",
			description: "Literal text search in explicit allowed files. No recursive directory traversal or shell.",
			executionMode: "sequential",
			parameters: Type.Object(
				{ paths: Type.Array(pathSchema, { minItems: 1, maxItems: 32, uniqueItems: true }), query: text },
				strict,
			),
			execute: async (_id, params) =>
				fileAction("runtime_search", params.paths, params, () => {
					const matches: string[] = [];
					for (const path of params.paths) {
						assertActive();
						for (const [index, line] of readText(join(options.cwd, path)).split("\n").entries()) {
							if (line.includes(params.query)) matches.push(`${path}:${index + 1}:${line.slice(0, 512)}`);
							if (matches.length >= 100) return `${matches.join("\n")}\n[truncated at 100 matches]`;
						}
					}
					return matches.join("\n") || "No matches";
				}),
		}),
	];
	if (request.role !== "Reviewer") {
		tools.push(
			defineTool({
				name: "runtime_write",
				label: "Runtime write",
				description: "Write an allowed workspace text file. Parent directory must exist.",
				executionMode: "sequential",
				parameters: Type.Object({ path: pathSchema, content: Type.String({ maxLength: MAX_BYTES }) }, strict),
				execute: async (_id, params) =>
					fileAction("runtime_write", [params.path], params, () => {
						writeText(join(options.cwd, params.path), params.content, signal);
						return "File written";
					}),
			}),
			defineTool({
				name: "runtime_edit",
				label: "Runtime edit",
				description: "Replace one unique exact text occurrence in an allowed workspace file.",
				executionMode: "sequential",
				parameters: Type.Object(
					{ path: pathSchema, oldText: text, newText: Type.String({ maxLength: MAX_BYTES }) },
					strict,
				),
				execute: async (_id, params) =>
					fileAction("runtime_edit", [params.path], params, () => {
						const path = join(options.cwd, params.path);
						const content = readText(path);
						const index = content.indexOf(params.oldText);
						if (index < 0 || content.indexOf(params.oldText, index + 1) !== -1)
							throw new Error("Edit requires a unique exact match");
						writeText(
							path,
							content.slice(0, index) + params.newText + content.slice(index + params.oldText.length),
							signal,
						);
						return "File edited";
					}),
			}),
			defineTool({
				name: "runtime_request_check",
				label: "Request check",
				description:
					"Record a request for a registered check. Only Kernel verification stages execute checks; this tool produces no PASS evidence.",
				executionMode: "sequential",
				parameters: Type.Object({ id: pathSchema }, strict),
				execute: async (_id, params) => {
					assertActive();
					if (!options.config.verification.checks.some((check) => check.id === params.id))
						throw new Error("Unknown check ID");
					return {
						content: [
							{
								type: "text",
								text: "UNAVAILABLE: request recorded in Pi session; checks run only in Kernel verification stages. Do not claim PASS.",
							},
						],
						details: { id: params.id, status: "UNAVAILABLE" },
					};
				},
			}),
			defineTool({
				name: "submit_handoff",
				label: "Submit handoff",
				description: `Submit the sole structured ${request.role} result with requirements where requested. Call alone, with no other tool calls in the same turn.`,
				executionMode: "sequential",
				parameters: request.role === "Executor" ? ExecutorHandoffSchema : HandoffSchema,
				execute: async (_id, params) => {
					assertActive();
					const handoff = structuredClone(
						request.role === "Executor"
							? validateContract(ExecutorHandoffSchema, params)
							: validateContract(HandoffSchema, params),
					);
					if (
						handoff.runId !== request.runId ||
						handoff.revision !== request.revision ||
						handoff.task !== request.task.id
					)
						throw new Error("Handoff identity mismatch");
					submitted = handoff.role === "Executor" ? { role: "Executor", handoff } : { role: "Developer", handoff };
					return {
						content: [
							{ type: "text", text: "Handoff submitted for Kernel validation; not a completion approval." },
						],
						details: {},
						terminate: true,
					};
				},
			}),
		);
	} else {
		tools.push(
			defineTool({
				name: "submit_review",
				label: "Submit review",
				description:
					"Submit an independent PASS/REVISE/BLOCK review. Use only exact trustedEvidenceRefs strings in all evidenceRefs arrays. Correct evidence errors and resubmit in this session. Call alone.",
				executionMode: "sequential",
				parameters: ReviewSchema,
				execute: async (id, params) => {
					assertActive();
					const review: Review = structuredClone(validateContract(ReviewSchema, params));
					if (
						review.runId !== request.runId ||
						review.revision !== request.revision ||
						review.task !== request.task.id ||
						review.diffDigest !== request.verification.diffDigest
					)
						throw new Error("Review identity or diff mismatch");
					const invalidFields: string[] = [];
					if (!review.evidenceRefs.length || review.evidenceRefs.some((ref) => !trustedEvidence.has(ref)))
						invalidFields.push("evidenceRefs");
					for (const [index, item] of review.requirements.entries()) {
						if (
							item.evidenceRefs.some((ref) => !trustedEvidence.has(ref)) ||
							(review.result === "PASS" && !item.evidenceRefs.length)
						)
							invalidFields.push(`requirements[${index}].evidenceRefs`);
					}
					if (invalidFields.length) {
						reviewValidationErrors.add(id);
						throw new Error(
							`Review evidence validation failed: ${invalidFields.join(", ")}. ` +
								"Copy exact strings from trustedEvidenceRefs; filenames, diffDigest and descriptions are not references. " +
								"All verdicts require nonempty top-level evidenceRefs; PASS also requires evidence for every requirement. " +
								`Correct and resubmit submit_review alone in this session. trustedEvidenceRefs: ${JSON.stringify(evidenceRefs)}`,
						);
					}
					submitted = { role: "Reviewer", review };
					return {
						content: [{ type: "text", text: "Review submitted for Kernel validation." }],
						details: {},
						terminate: true,
					};
				},
			}),
		);
	}
	if (options.policy.r3Scope && request.role === "Developer") {
		const assertConfig = () => {
			if (
				workerDigest(parseRuntimeConfig(readText(join(options.cwd, ".ai/config.yaml")))) !==
				workerDigest(options.config)
			) {
				policyDenial = "Runtime configuration changed; approval is stale";
				throw new Error(policyDenial);
			}
		};
		tools.push(
			defineTool({
				name: "runtime_delete",
				label: "Request file deletion",
				description:
					"Delete only the preselected tracked text file after explicit human approval. No directories, globs or other mutations.",
				executionMode: "sequential",
				parameters: Type.Object({ path: pathSchema }, strict),
				execute: async (_id, params) => {
					assertActive();
					const action = {
						runId: request.runId,
						actionId: randomUUID(),
						role: "Developer" as const,
						tool: "runtime_delete",
						risk: "R3" as const,
						paths: [params.path],
						actionDigest: workerDigest({ path: params.path, step: request.step }),
					};
					const initial = evaluatePolicy(action, options.policy, await options.paths.inspect(action.paths));
					if (initial.decision !== "APPROVAL_REQUIRED") {
						await options.audit.prepare(initial);
						policyDenial = `Policy ${initial.risk}/${initial.decision}: ${initial.reason}`;
						throw new Error(policyDenial);
					}
					await options.audit.assertWritable();
					assertConfig();
					const path = join(options.cwd, params.path);
					const fingerprint = deletionFingerprint(path);
					action.actionDigest = workerDigest({
						operation: "delete-file",
						path: params.path,
						...fingerprint,
						step: request.step,
						revision: request.revision,
					});
					if (!request.onApprovalRequested || !request.onApprovalConsumed)
						throw new Error("Human approval callbacks unavailable");
					const grant = await request.onApprovalRequested(
						{
							runId: request.runId,
							actionId: action.actionId,
							actionDigest: action.actionDigest,
							configDigest: options.policy.configDigest,
							role: "Developer",
							operation: "delete-file",
							path: params.path,
							...fingerprint,
							step: request.step,
							revision: request.revision,
							reason: "Delete one preselected Git-tracked workspace text file; no automatic rollback",
						},
						signal,
					);
					assertActive();
					if (!grant.approved) {
						policyDenial = "Human approval refused; deletion was not executed";
						throw new Error(policyDenial);
					}
					const result = await executePolicyAction(
						action,
						{ ...options.policy, r3Approval: grant },
						{
							paths: options.paths,
							audit: options.audit,
							execute: async () => {
								assertActive();
								assertConfig();
								if (
									deletionFingerprint(path).preconditionDigest !== fingerprint.preconditionDigest ||
									Date.now() >= grant.expiresAt
								) {
									policyDenial = "Deletion target changed or approval expired; action was not executed";
									throw new Error(policyDenial);
								}
								// No JS yield between the final fingerprint/expiry check and unlink. External TOCTOU is not sandboxed.
								unlinkSync(path);
								return "Approved file deleted";
							},
						},
						signal,
					);
					if (result.decision.decision !== "ALLOW") {
						policyDenial = "Approval expired or mismatched before execution";
						throw new Error(policyDenial);
					}
					await request.onApprovalConsumed(action.actionId);
					return {
						content: [
							{ type: "text", text: "Approved file deleted; independent review and checks are still required." },
						],
						details: { actionId: action.actionId },
					};
				},
			}),
		);
	}
	return {
		tools:
			options.policy.r3Scope || (request.role === "Executor" && request.scope.risk === "R0")
				? tools.filter((tool) => !["runtime_write", "runtime_edit"].includes(tool.name))
				: tools,
		result: () => structuredClone(submitted),
		policyDenial: () => policyDenial,
		consumeReviewValidationError: (toolCallId) => reviewValidationErrors.delete(toolCallId),
	};
}
