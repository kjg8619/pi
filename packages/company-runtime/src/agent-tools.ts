import { createHash, randomUUID } from "node:crypto";
import { closeSync, constants, fstatSync, ftruncateSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineTool, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { RuntimeConfig } from "./config.ts";
import { type Handoff, HandoffSchema, type Review, ReviewSchema, validateContract } from "./contracts.ts";
import { type ActionAudit, executePolicyAction, type PolicyContext, type PolicyPathInspector } from "./policy.ts";
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

function readText(path: string): string {
	const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
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

function writeText(path: string, content: string, signal: AbortSignal): void {
	if (Buffer.byteLength(content) > MAX_BYTES) throw new Error("Worker write exceeds size limit");
	signal.throwIfAborted();
	const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW, 0o600);
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
}): { tools: ToolDefinition[]; result: () => AgentExecutionResult | undefined } {
	const { request, signal } = options;
	let submitted: AgentExecutionResult | undefined;
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
			risk: tool === "runtime_write" || tool === "runtime_edit" ? ("R1" as const) : ("R0" as const),
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
		if (result.decision.decision !== "ALLOW") throw new Error("Worker action denied by policy");
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
	if (request.role === "Developer") {
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
					"Record a request for a registered check. S3 does not execute checks and produces no PASS evidence.",
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
								text: "UNAVAILABLE: request recorded in Pi session; check execution is not connected in S3. Do not claim PASS.",
							},
						],
						details: { id: params.id, status: "UNAVAILABLE" },
					};
				},
			}),
			defineTool({
				name: "submit_handoff",
				label: "Submit handoff",
				description:
					"Submit the sole structured Developer result. Call alone, with no other tool calls in the same turn.",
				executionMode: "sequential",
				parameters: HandoffSchema,
				execute: async (_id, params) => {
					assertActive();
					const handoff: Handoff = structuredClone(validateContract(HandoffSchema, params));
					if (
						handoff.runId !== request.runId ||
						handoff.revision !== request.revision ||
						handoff.task !== request.task.id
					)
						throw new Error("Handoff identity mismatch");
					submitted = { role: "Developer", handoff };
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
				description: "Submit an independent PASS/REVISE/BLOCK review of the supplied evidence. Call alone.",
				executionMode: "sequential",
				parameters: ReviewSchema,
				execute: async (_id, params) => {
					assertActive();
					const review: Review = structuredClone(validateContract(ReviewSchema, params));
					if (
						review.runId !== request.runId ||
						review.revision !== request.revision ||
						review.task !== request.task.id ||
						review.diffDigest !== request.verification.diffDigest
					)
						throw new Error("Review identity or diff mismatch");
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
	return { tools, result: () => structuredClone(submitted) };
}
