import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverAndLoadExtensions } from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const launcher = fileURLToPath(new URL("../bin/weavra", import.meta.url));
const extension = fileURLToPath(new URL("../src/extension.ts", import.meta.url));
let root: string;
let cwd: string;
let bin: string;

beforeEach(async () => {
	root = await realpath(await mkdtemp(join(tmpdir(), "weavra launcher ")));
	cwd = join(root, "my project");
	bin = join(root, "bin");
	await mkdir(cwd);
	await mkdir(bin);
	await writeFile(
		join(bin, "pi"),
		`#!${process.execPath}\nprocess.stdout.write(JSON.stringify({cwd: process.cwd(), args: process.argv.slice(2), marker: process.env.WEAVRA_TEST_MARKER})); process.exit(Number(process.env.WEAVRA_TEST_EXIT || 0));\n`,
		{ mode: 0o755 },
	);
});
afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});
function run(args: string[] = [], executable = launcher, path = `${bin}:/usr/bin:/bin`, exit = "0") {
	return spawnSync(executable, args, {
		cwd,
		env: { PATH: path, HOME: root, WEAVRA_TEST_MARKER: "unchanged", WEAVRA_TEST_EXIT: exit },
		encoding: "utf8",
		timeout: 10_000,
	});
}

describe("Weavra launcher (POSIX)", () => {
	it.each([
		{ args: [] },
		{ args: ["--help"] },
		{ args: ["--version"] },
		{ args: ["--model", "example/provider model", "--thinking", "high"] },
		{
			args: [
				"--no-extensions",
				"-e",
				"./other extension.ts",
				"--",
				"",
				"@file with spaces.ts",
				"$(touch marker); *",
			],
		},
	])("preserves cwd, environment and exact Pi arguments: $args", ({ args }) => {
		const result = run(args);
		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(result.stderr).toBe("");
		expect(JSON.parse(result.stdout)).toEqual({ cwd, args: ["-e", extension, ...args], marker: "unchanged" });
	});
	it("resolves npm-style relative and chained symlinks, including paths with spaces", async () => {
		const first = join(root, "linked launcher");
		await symlink(launcher, first);
		const linked = join(bin, "weavra");
		await symlink("../linked launcher", linked);
		const result = run([], linked);
		expect(result.status).toBe(0);
		expect(JSON.parse(result.stdout).args).toEqual(["-e", extension]);
	});
	it("registers the four commands through the public Pi loader using the injected absolute path", async () => {
		const result = run();
		expect(result.status).toBe(0);
		const { args } = JSON.parse(result.stdout) as { args: string[] };
		const loaded = await discoverAndLoadExtensions([args[1]], cwd, join(root, "agent"));
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions).toHaveLength(1);
		expect([...loaded.extensions[0].commands.keys()].sort()).toEqual(["risk", "state", "team", "workflow"]);
		for (const command of loaded.extensions[0].commands.values()) expect(command.description).toContain("Weavra");
	});
	it("returns the Pi exit code", () => {
		expect(run([], launcher, `${bin}:/usr/bin:/bin`, "23").status).toBe(23);
	});
	it("replaces the launcher process so Pi receives signals directly", async () => {
		await writeFile(join(bin, "pi"), `#!${process.execPath}\nprocess.kill(process.pid, 'SIGTERM');\n`);
		const result = run();
		expect(result.signal).toBe("SIGTERM");
	});
	it("reports a missing Pi executable without searching relative project extension paths", () => {
		const result = run([], launcher, "/usr/bin:/bin");
		expect(result.status).toBe(127);
		expect(result.stderr).toContain("Weavra: pi executable not found on PATH");
		expect(result.stdout).toBe("");
	});
	it("reports an incomplete or relocated checkout before starting Pi", async () => {
		const relocated = join(bin, "weavra");
		await copyFile(launcher, relocated);
		await chmod(relocated, 0o755);
		const result = run([], relocated);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Weavra: extension not found or unreadable");
		expect(result.stderr).toContain("npm link");
		expect(result.stdout).toBe("");
	});
	it("reports a non-executable Pi path clearly", async () => {
		await chmod(join(bin, "pi"), 0o644);
		const result = run();
		expect([126, 127]).toContain(result.status);
		expect(result.stderr).toMatch(/Weavra: (Pi executable is not executable|pi executable not found)/);
	});
	it("declares only weavra in the existing private package, without replacing pi", async () => {
		const metadata = JSON.parse(await readFile(join(dirname(launcher), "../package.json"), "utf8"));
		expect(metadata.bin).toEqual({ weavra: "bin/weavra" });
		expect(metadata.private).toBe(true);
	});
});
