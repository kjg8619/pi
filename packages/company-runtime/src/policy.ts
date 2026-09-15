import { type PolicyDecision, PolicyDecisionSchema, type Risk, type Role, validateContract } from "./contracts.ts";

/** Trusted adapter metadata, never a worker-supplied tool registration or risk override. */
export interface RegisteredActionTool {
	id: string;
	operation: "read" | "search" | "write" | "edit";
}
export interface PolicyContext {
	tools: readonly RegisteredActionTool[];
	allowedPaths: readonly string[];
	configDigest: string;
	/** Additional protected literal workspace-relative paths; cannot relax built-in protection. */
	protectedPaths?: readonly string[];
}
export interface PolicyAction {
	runId: string;
	actionId: string;
	role: Role;
	tool: string;
	/** Lower bound assessed by the trusted adapter, not by the model. */
	risk: Risk | "UNKNOWN";
	paths: readonly string[];
	/** Adapter-generated digest binds the complete input, including write contents/search parameters. */
	actionDigest: string;
}
export interface InspectedPath {
	path: string;
	safe: boolean;
	kind: "file" | "missing" | "directory";
}
export interface PolicyPathInspector {
	inspect(paths: readonly string[]): Promise<InspectedPath[]>;
}
export type ActionOutcome = "SUCCEEDED" | "FAILED" | "INTERRUPTED";

/** Immutable trusted command registration; never supplied by a worker tool call. */
export interface RegisteredCheck {
	id: string;
	executable: string;
	argv: readonly string[];
	cwd: string;
	timeoutMs: number;
	env: Readonly<Record<string, string>>;
}

export function evaluateRegisteredCheck(
	identity: { runId: string; actionId: string; actionDigest: string },
	request: RegisteredCheck,
	registered: RegisteredCheck,
	context: PolicyContext,
	cwdSafe: boolean,
): PolicyDecision {
	const shell =
		/(?:^|\/)(?:bash|sh|zsh|dash|ksh|fish|csh|cmd(?:\.exe)?|powershell(?:\.exe)?|pwsh|env|xargs|sudo|su|nohup|setsid|eval)$/i.test(
			request.executable,
		);
	const inline = request.argv.some((arg) =>
		/^(?:-[cep].*|--(?:eval|print|command)(?:=.*)?|\/c.*|-command)$/i.test(arg),
	);
	const allow =
		cwdSafe &&
		request.executable.startsWith("/") &&
		!shell &&
		!inline &&
		(request.cwd === "." ||
			(isPolicyPath(request.cwd) && !protectedPath(request.cwd, context.protectedPaths ?? []))) &&
		JSON.stringify(request) === JSON.stringify(registered);
	return validateContract(PolicyDecisionSchema, {
		...identity,
		role: "Verifier",
		risk: "R1",
		decision: allow ? "ALLOW" : "DENY",
		reason: allow ? "Exact trusted check registration" : "Unregistered or unsafe check execution",
		configDigest: context.configDigest,
	});
}
export interface ActionAudit {
	prepare(decision: PolicyDecision): Promise<void>;
	finish(runId: string, actionId: string, outcome: ActionOutcome): Promise<void>;
	assertWritable(): Promise<void>;
}

/** Literal portable paths only. Do not normalize away traversal or alternate separators. */
export function isPolicyPath(path: string): boolean {
	return (
		path.length > 0 &&
		!/[\\:\x00-\x1f\x7f*?[\]{}]/.test(path) &&
		!path.startsWith("/") &&
		path.split("/").every((part) => part.length > 0 && part !== "." && part !== ".." && part.trim() === part)
	);
}
function within(path: string, root: string): boolean {
	return path === root || path.startsWith(`${root}/`);
}
function protectedPath(path: string, additional: readonly string[]): boolean {
	const lower = path.toLowerCase();
	return (
		lower
			.split("/")
			.some(
				(part) =>
					/^(?:\.git|\.ai|\.pi|\.ssh|\.aws|\.azure|\.config|secrets?|credentials?)(?:\..*)?$/.test(part) ||
					/^\.env(?:\..*)?$/.test(part) ||
					/^(?:auth\.json|\.npmrc|\.netrc|id_rsa|id_ed25519|policy(?:-paths)?\.[^/]+|config\.[^/]+)$/.test(part) ||
					/\.(?:pem|key|p12|pfx)$/.test(part),
			) || additional.some((root) => within(lower, root.toLowerCase()))
	);
}

/** Pure decision function. Inspection facts and registrations must come from trusted adapters. */
export function evaluatePolicy(
	action: PolicyAction,
	context: PolicyContext,
	inspected: readonly InspectedPath[],
): PolicyDecision {
	let risk = action.risk;
	let decision: PolicyDecision["decision"] = "DENY";
	let reason = "Action is not authorized";
	const tool = context.tools.find((item) => item.id === action.tool);
	const mutation = tool?.operation === "write" || tool?.operation === "edit";
	if (mutation && risk === "R0") risk = "R1";
	const invalidConfig =
		!context.configDigest.trim() ||
		new Set(context.tools.map((item) => item.id)).size !== context.tools.length ||
		context.allowedPaths.some((path) => !isPolicyPath(path)) ||
		(context.protectedPaths ?? []).some((path) => !isPolicyPath(path));
	if (invalidConfig) reason = "Invalid policy configuration";
	else if (
		!tool ||
		!["read", "search", "write", "edit"].includes(tool.operation) ||
		/^(?:bash|sh|shell|exec)$/i.test(tool.id)
	)
		reason = "Unregistered tool or arbitrary execution is unsupported";
	else if (!["Developer", "Reviewer", "Executor", "Lead"].includes(action.role)) reason = "Unknown role";
	else if (mutation && action.role !== "Developer" && action.role !== "Executor") reason = "Role cannot mutate files";
	else if (
		action.paths.length === 0 ||
		new Set(action.paths).size !== action.paths.length ||
		action.paths.some((path) => !isPolicyPath(path))
	)
		reason = "Invalid or missing literal target paths";
	else if (action.paths.some((path) => protectedPath(path, context.protectedPaths ?? []))) reason = "Protected target";
	else if (action.paths.some((path) => !context.allowedPaths.some((root) => within(path, root))))
		reason = "Target outside allowed paths";
	else if (
		inspected.length !== action.paths.length ||
		inspected.some(
			(item, index) =>
				item.path !== action.paths[index] ||
				!item.safe ||
				item.kind === "directory" ||
				(!mutation && item.kind !== "file"),
		)
	)
		reason = "Unsafe, unresolved or non-file target";
	else {
		// Dependency changes cannot be disguised as an ordinary R1 edit.
		if (
			mutation &&
			(risk === "R0" || risk === "R1") &&
			action.paths.some((path) =>
				/(?:^|\/)(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.(?:toml|lock)|requirements[^/]*\.txt|pyproject\.toml|go\.(?:mod|sum))$/i.test(
					path,
				),
			)
		)
			risk = "R2";
		if (risk === "R0" || risk === "R1") {
			decision = "ALLOW";
			reason = mutation ? "Registered ordinary file mutation" : "Registered file read/search";
		} else if (risk === "R2") {
			decision = "REVIEW_REQUIRED";
			reason = "R2 execution is disabled in S2";
		} else if (risk === "R3") {
			decision = "APPROVAL_REQUIRED";
			reason = "R3 execution is disabled in S2";
		} else reason = "Unknown action risk";
	}
	return validateContract(PolicyDecisionSchema, {
		runId: action.runId,
		actionId: action.actionId,
		role: action.role,
		risk,
		decision,
		reason,
		actionDigest: action.actionDigest,
		configDigest: context.configDigest,
	});
}

/** No production tools installed here. S3 adapters must bind the executor to the exact frozen input. */
export async function executePolicyAction<T>(
	action: PolicyAction,
	context: PolicyContext,
	ports: { paths: PolicyPathInspector; audit: ActionAudit; execute: (action: PolicyAction) => Promise<T> },
	signal?: AbortSignal,
): Promise<{ decision: PolicyDecision; value?: T }> {
	action = structuredClone(action);
	context = structuredClone(context);
	signal?.throwIfAborted();
	const decision = evaluatePolicy(action, context, await ports.paths.inspect(action.paths));
	await ports.audit.prepare(structuredClone(decision));
	if (decision.decision !== "ALLOW") return { decision };
	let value: T;
	try {
		// Persistence can yield to other code. Reinspect after the intent is durable, immediately before execution.
		const fresh = evaluatePolicy(action, context, await ports.paths.inspect(action.paths));
		if (fresh.decision !== "ALLOW") throw new Error("Target changed after policy evaluation");
		await ports.audit.assertWritable();
		signal?.throwIfAborted();
		value = await ports.execute(structuredClone(action));
		signal?.throwIfAborted();
	} catch (error) {
		await ports.audit.finish(action.runId, action.actionId, signal?.aborted ? "INTERRUPTED" : "FAILED");
		throw error;
	}
	// A result-save failure is not an executor failure; never try to overwrite a partial commit.
	await ports.audit.finish(action.runId, action.actionId, "SUCCEEDED");
	return { decision, value };
}
