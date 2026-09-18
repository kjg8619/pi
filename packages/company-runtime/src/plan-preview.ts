import type { RuntimeConfig } from "./config.ts";
import type { AcceptanceCriterion, Risk, Workflow } from "./contracts.ts";
import type { ExecutionMode } from "./execution-contract.ts";

export interface PlanPreview {
	goal: string;
	workflow: Workflow;
	executionMode: ExecutionMode;
	risk: Risk;
	acceptanceCriteria: readonly AcceptanceCriterion[];
	allowedPaths: readonly string[];
	checks: RuntimeConfig["verification"]["checks"];
	projectInstructionPath: string | null;
	lspEnabled: boolean;
}

/** Host-side display only. Confirming this plan is neither an approval nor a permission token. */
export function formatPlanPreview(plan: PlanPreview): string {
	return [
		`Goal: ${plan.goal}`,
		`Workflow: ${plan.workflow}`,
		`Execution contract: ${plan.executionMode}`,
		`Risk: ${plan.risk}`,
		"Acceptance criteria (Host-assigned IDs; workers judge and report by ID, never by prose):",
		...plan.acceptanceCriteria.map(
			(criterion) =>
				`  ${criterion.id} ${criterion.statement} [checks: ${criterion.verification.checkIds.join(", ") || "none"}; review: ${criterion.verification.reviewRequired ? "required" : "not required"}]`,
		),
		`Allowed paths: ${plan.allowedPaths.length ? plan.allowedPaths.join(", ") : "(none configured)"}`,
		"Planned checks (trusted local programs; may mutate files; not sandboxed):",
		...plan.checks.map(
			(check) =>
				`  ${check.id} (${check.kind})${check.required ? " required" : " optional"}: ${check.executable} ${check.args.join(" ")}`,
		),
		`Roles: ${plan.workflow === "QUICK" ? "Executor" : "Developer -> independent Reviewer"}`,
		`Project instruction: ${plan.projectInstructionPath ? `${plan.projectInstructionPath} (configured; frozen prompt context, not readable by workers)` : "none"}`,
		`LSP: ${plan.lspEnabled ? "enabled (trusted local program, not sandboxed)" : "disabled"}`,
		"Plan confirmation is not an approval or permission token; R3 deletion still requires separate one-time human approval.",
		"No automatic rollback, commit, merge or cleanup.",
	].join("\n");
}
