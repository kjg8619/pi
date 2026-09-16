import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	discoverAndLoadExtensions,
	type ExtensionCommandContext,
	type ExtensionContext,
	type RegisteredCommand,
	type SessionStartEvent,
} from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerCompanyRuntime } from "../src/extension.ts";

let cwd: string;
const config = `schemaVersion: 1
models:
  profiles:
    coding: { provider: faux, model: coding }
    reasoning: { provider: faux, model: review }
`;
const notify = vi.fn();
const confirm = vi.fn(async () => false);
const context = () =>
	({
		cwd,
		hasUI: true,
		isIdle: () => true,
		isProjectTrusted: () => true,
		ui: { notify, confirm },
	}) as unknown as ExtensionCommandContext;
function commands() {
	const registered = new Map<string, Omit<RegisteredCommand, "name" | "sourceInfo">>();
	const on = vi.fn<(event: string, handler: unknown) => void>();
	const models = vi.fn(async () => {
		throw new Error("Must not load a provider in command-only tests");
	});
	registerCompanyRuntime(
		{
			registerCommand: (name, command) => {
				registered.set(name, command);
			},
			on,
		},
		{ createModels: models },
	);
	return {
		registered,
		on,
		models,
		call: (name: string, args = "", ctx = context()) => registered.get(name)!.handler(args, ctx),
	};
}
beforeEach(async () => {
	cwd = await mkdtemp(join(tmpdir(), "company-extension-"));
	notify.mockReset();
	confirm.mockClear();
});
afterEach(async () => {
	await rm(cwd, { recursive: true, force: true });
});

describe("S4 extension and S0 loader/trust regression", () => {
	it("registers four commands and lifecycle/input guards without starting anything", async () => {
		const host = commands();
		expect([...host.registered.keys()]).toEqual(["team", "state", "workflow", "risk"]);
		expect(host.on.mock.calls.map(([name]) => name)).toEqual([
			"session_start",
			"input",
			"tool_call",
			"user_bash",
			"session_before_switch",
			"session_before_fork",
			"session_before_tree",
			"session_shutdown",
		]);
		expect(host.models).not.toHaveBeenCalled();
		expect(await readdir(cwd)).toEqual([]);
	});
	it.each(["../src/extension.ts", "../"])("loads through the public Pi loader: %s", async (relativePath) => {
		const result = await discoverAndLoadExtensions(
			[fileURLToPath(new URL(relativePath, import.meta.url))],
			cwd,
			join(cwd, "agent"),
		);
		expect(result.errors).toEqual([]);
		expect(result.extensions).toHaveLength(1);
		const extension = result.extensions[0];
		expect([...extension.commands.keys()]).toEqual(["team", "state", "workflow", "risk"]);
		expect(extension.tools.size).toBe(0);
		expect(extension.handlers.size).toBe(8);
		expect(result.runtime.pendingProviderRegistrations).toEqual([]);
		expect(result.runtime.pendingNativeProviderRegistrations).toEqual([]);
		expect(await readdir(cwd)).toEqual([]);
	});
	it.each(["tui", "rpc", "print", "json"] as const)("startup branding is TUI-only: %s", async (mode) => {
		const host = commands();
		const start = host.on.mock.calls.find(([name]) => name === "session_start")![1] as (
			event: SessionStartEvent,
			ctx: ExtensionContext,
		) => void;
		start({ type: "session_start", reason: "startup" }, { ...context(), mode });
		if (mode === "tui") {
			expect(notify).toHaveBeenCalledTimes(1);
			expect(notify).toHaveBeenCalledWith(expect.stringContaining("Weavra Runtime loaded — v0.1 RC1"), "info");
		} else expect(notify).not.toHaveBeenCalled();
		expect(host.models).not.toHaveBeenCalled();
		expect(await readdir(cwd)).toEqual([]);
	});
	it.each(["workflow", "state", "team", "risk"])("provides Weavra help without config or state: %s", async (name) => {
		const host = commands();
		await host.call(name, "help");
		const text = notify.mock.calls.at(-1)![0] as string;
		expect(text).toContain("Weavra v0.1 RC1");
		expect(text).toContain(`/${name}`);
		expect(text).not.toMatch(/Company runtime|Personal AI Runtime/);
		if (name === "workflow") {
			for (const term of [
				"QUICK",
				"STANDARD",
				"R0",
				"R1",
				"R2",
				"scoped R3",
				"independent Reviewer",
				"Human Approval",
				"No automatic commit/rollback",
			])
				expect(text).toContain(term);
		}
		expect(host.registered.get(name)!.description).toContain("Weavra");
		expect(host.models).not.toHaveBeenCalled();
		expect(await readdir(cwd)).toEqual([]);
	});
	it("does not auto-discover the package", async () => {
		const result = await discoverAndLoadExtensions([], cwd, join(cwd, "agent"));
		expect(result.extensions).toEqual([]);
		expect(result.errors).toEqual([]);
	});
	it("missing config leaves the project untouched", async () => {
		await commands().call("state");
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("missing"), "warning");
		expect(await readdir(cwd)).toEqual([]);
	});
	it("reads current persisted status without interpreting corrupt state as success", async () => {
		await mkdir(join(cwd, ".ai"));
		await writeFile(join(cwd, ".ai/config.yaml"), config);
		await writeFile(join(cwd, ".ai/state.json"), "corrupt state");
		const host = commands();
		for (const name of ["team", "state", "workflow", "risk"]) {
			await host.call(name);
			expect(notify).toHaveBeenLastCalledWith(expect.stringContaining("integrity"), "error");
		}
		expect(await readFile(join(cwd, ".ai/state.json"), "utf8")).toBe("corrupt state");
		expect(await readFile(join(cwd, ".ai/config.yaml"), "utf8")).toBe(config);
	});
	it("requires project trust and explicit command approval before providers", async () => {
		await mkdir(join(cwd, ".ai"));
		await writeFile(join(cwd, ".ai/config.yaml"), config);
		const host = commands();
		await host.call("workflow", "run Fix login", { ...context(), isProjectTrusted: () => false });
		expect(notify).toHaveBeenLastCalledWith(expect.stringContaining("not trusted"), "warning");
		await host.call("workflow", "run Fix login");
		await vi.waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining("declined"), "error"));
		expect(host.models).not.toHaveBeenCalled();
		await host.call("workflow", "cancel");
		expect(notify).toHaveBeenLastCalledWith(expect.stringContaining("No rollback"), "warning");
	});
	it("cancels a pending confirmation through its signal before loading models", async () => {
		await mkdir(join(cwd, ".ai"));
		await writeFile(join(cwd, ".ai/config.yaml"), config);
		const host = commands();
		let entered = false;
		const ctx = context();
		ctx.ui.confirm = async (_title, _message, options) => {
			entered = true;
			return new Promise<boolean>((resolve) => {
				if (options?.signal?.aborted) resolve(false);
				else options?.signal?.addEventListener("abort", () => resolve(false), { once: true });
			});
		};
		await host.call("workflow", "run Fix bug", ctx);
		await vi.waitFor(() => expect(entered).toBe(true));
		await host.call("workflow", "cancel", ctx);
		expect(host.models).not.toHaveBeenCalled();
		expect(notify).toHaveBeenLastCalledWith(expect.stringContaining("Preflight cancelled"), "warning");
	});
	it("shows the effective worker timeout without starting a worker", async () => {
		await mkdir(join(cwd, ".ai"));
		await writeFile(join(cwd, ".ai/config.yaml"), `${config}agents: { worker_timeout_ms: 240000 }\n`);
		const host = commands();
		await host.call("workflow", "config");
		expect(notify).toHaveBeenLastCalledWith(
			expect.stringContaining("Worker timeout: 240000ms per role invocation"),
			"info",
		);
		expect(host.models).not.toHaveBeenCalled();
	});
	it("invalid worker timeout fails before confirmation, models or writer acquisition", async () => {
		await mkdir(join(cwd, ".ai"));
		await writeFile(join(cwd, ".ai/config.yaml"), `${config}agents: { worker_timeout_ms: 600001 }\n`);
		const host = commands();
		await host.call("workflow", "run Fix bug");
		await vi.waitFor(() =>
			expect(notify).toHaveBeenCalledWith(expect.stringContaining("Invalid runtime config"), "error"),
		);
		expect(confirm).not.toHaveBeenCalled();
		expect(host.models).not.toHaveBeenCalled();
		expect(await readdir(join(cwd, ".ai"))).toEqual(["config.yaml"]);
	});

	it("rejects non-UI modes and a busy parent", async () => {
		const host = commands();
		await expect(host.call("state", "", { ...context(), hasUI: false })).rejects.toThrow("notification-capable UI");
		await host.call("workflow", "run Fix login", { ...context(), isIdle: () => false });
		expect(notify).toHaveBeenLastCalledWith(expect.stringContaining("parent agent"), "warning");
		expect(host.models).not.toHaveBeenCalled();
	});
});
