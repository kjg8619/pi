import { spawnSync } from "node:child_process";
import {
	chmod,
	copyFile,
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	realpath,
	rename,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const gitPath = spawnSync("which", ["git"], { encoding: "utf8" }).stdout.trim();
let root: string;
let source: string;
let cwd: string;
let launcher: string;
let cli: string;
let extension: string;
let bin: string;
let head: string;
let index: Buffer;
let env: NodeJS.ProcessEnv;

function git(args: string[], directory = source) {
	const result = spawnSync(gitPath, ["-C", directory, ...args], { env, encoding: "utf8" });
	expect(result.status, result.stderr).toBe(0);
	return result.stdout.trim();
}
function target(name = "fix-login") {
	return join(dirname(source), ".weavra-worktrees", basename(source), name);
}
function run(args = ["--worktree", "fix-login"], extraEnv: NodeJS.ProcessEnv = {}, input?: string) {
	return spawnSync(launcher, args, {
		cwd,
		env: { ...env, ...extraEnv },
		encoding: "utf8",
		input,
		timeout: 10_000,
	});
}
async function absent(path: string) {
	await expect(lstat(path)).rejects.toMatchObject({ code: "ENOENT" });
}
async function sourceUnchanged() {
	expect(git(["rev-parse", "HEAD"])).toBe(head);
	expect(git(["symbolic-ref", "HEAD"])).toBe("refs/heads/main");
	expect(await readFile(join(source, "app.txt"), "utf8")).toBe("original\n");
	expect(await readFile(join(source, ".git/index"))).toEqual(index);
	expect(git(["status", "--porcelain=v1", "--untracked-files=all"])).toBe("");
	await absent(join(source, ".ai"));
	await absent(join(source, ".weavra"));
	await absent(join(source, ".weavra-worktrees"));
}
async function noCreation() {
	await absent(target());
	expect(git(["for-each-ref", "--format=%(refname)", "refs/heads/weavra/"])).toBe("");
}

beforeEach(async () => {
	root = await realpath(await mkdtemp(join(tmpdir(), "weavra worktree ")));
	source = join(root, "user project");
	cwd = source;
	const checkout = join(root, "weavra source checkout");
	launcher = join(checkout, "packages/company-runtime/bin/weavra");
	extension = join(checkout, "packages/company-runtime/src/extension.ts");
	cli = join(checkout, "packages/coding-agent/dist/bundle/cli.js");
	bin = join(root, "bin");
	for (const path of [source, bin, dirname(launcher), dirname(extension), dirname(cli)]) {
		await mkdir(path, { recursive: true });
	}
	env = {
		PATH: `${bin}:/usr/bin:/bin`,
		HOME: root,
		GIT_CONFIG_NOSYSTEM: "1",
		GIT_CONFIG_GLOBAL: "/dev/null",
		GIT_TERMINAL_PROMPT: "0",
		PI_CODING_AGENT_DIR: join(root, "agent directory"),
		WEAVRA_MARKER: "unchanged environment",
	};
	await symlink(process.execPath, join(bin, "node"));
	await copyFile(join(packageRoot, "bin/weavra"), launcher);
	await chmod(launcher, 0o755);
	await writeFile(extension, "// Launcher path fixture; Runtime behavior uses the existing faux suites.\n");
	// This executable checks the process boundary, not actual Pi/Provider behavior.
	await writeFile(
		cli,
		`#!/usr/bin/env node
const fs = require('node:fs');
fs.writeFileSync(${JSON.stringify(join(root, "pi-started"))}, 'started');
if (process.env.WRITE_STATE) {
  fs.mkdirSync('.ai');
  fs.writeFileSync('.ai/state.json', JSON.stringify({status: process.env.OUTCOME}));
}
console.log(JSON.stringify({cli: process.argv[1], cwd: process.cwd(), args: process.argv.slice(2),
  marker: process.env.WEAVRA_MARKER, home: process.env.HOME, agentDir: process.env.PI_CODING_AGENT_DIR}));
if (process.env.ECHO_STDIN) { process.stdout.write(fs.readFileSync(0)); process.stderr.write('Pi stderr\\n'); }
if (process.env.SIGNAL_EXIT) process.kill(process.pid, process.env.SIGNAL_EXIT);
process.exit(Number(process.env.PI_EXIT || 0));
`,
		{ mode: 0o755 },
	);
	await writeFile(
		join(bin, "pi"),
		`#!${process.execPath}
require('node:fs').writeFileSync(${JSON.stringify(join(root, "global-called"))}, 'called');
process.exit(99);
`,
		{ mode: 0o755 },
	);
	git(["init", "-b", "main"]);
	git(["config", "user.name", "Weavra Test"]);
	git(["config", "user.email", "weavra@example.invalid"]);
	await writeFile(join(source, "app.txt"), "original\n");
	git(["add", "app.txt"]);
	git(["-c", "commit.gpgsign=false", "commit", "-m", "fixture baseline"]);
	head = git(["rev-parse", "HEAD"]);
	index = await readFile(join(source, ".git/index"));
	// Audit every launcher Git argv and inject failures without real providers or user files.
	await writeFile(
		join(bin, "git"),
		`#!${process.execPath}
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const args = process.argv.slice(2);
const log = ${JSON.stringify(join(root, "git-calls.jsonl"))};
const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\\n').map(JSON.parse) : [];
fs.appendFileSync(log, JSON.stringify(args) + '\\n');
const command = args.filter((arg, i) => arg !== '-c' && arg !== '-C' && args[i - 1] !== '-c' && args[i - 1] !== '-C')[0];
const added = calls.some(call => call.includes('worktree') && call.includes('add'));
const fault = process.env.GIT_FAULT;
if ((fault === 'status' && command === 'status') ||
    (fault === 'root' && args.includes('--show-toplevel')) ||
    (fault === 'head' && args.includes('HEAD^{commit}')) ||
    (fault === 'branch' && args.includes('--symbolic-full-name')) ||
    (fault === 'refs' && command === 'show-ref') ||
    (fault === 'add' && command === 'worktree') ||
    (fault === 'post-status' && added && command === 'status') ||
    (fault === 'post-head' && added && args.includes('HEAD^{commit}'))) {
  console.error('injected Git failure: ' + fault); process.exit(128);
}
if (fault === 'pre-branch-change' && command === 'show-ref') {
  spawnSync(${JSON.stringify(gitPath)}, ['-C', ${JSON.stringify(source)}, 'symbolic-ref', 'HEAD', 'refs/heads/other']);
}
const result = spawnSync(${JSON.stringify(gitPath)}, args, {stdio: 'inherit'});
if (command === 'worktree' && result.status === 0) {
  if (fault === 'post-branch-change') spawnSync(${JSON.stringify(gitPath)}, ['-C', ${JSON.stringify(source)}, 'symbolic-ref', 'HEAD', 'refs/heads/other']);
  if (fault === 'post-head-change') spawnSync(${JSON.stringify(gitPath)}, ['-C', ${JSON.stringify(source)}, 'update-ref', 'refs/heads/main', process.env.OTHER_HEAD]);
  if (fault === 'target-dirty') fs.writeFileSync(${JSON.stringify(join(target(), "unexpected"))}, 'external change');
  if (fault === 'partial-add') process.exit(128);
}
process.exit(result.status === null ? 128 : result.status);
`,
		{ mode: 0o755 },
	);
});
afterEach(async () => {
	await absent(join(root, "global-called"));
	try {
		const calls = (await readFile(join(root, "git-calls.jsonl"), "utf8"))
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line) as string[]);
		for (const args of calls) {
			const command = args.filter(
				(arg, i) => arg !== "-c" && arg !== "-C" && args[i - 1] !== "-c" && args[i - 1] !== "-C",
			)[0];
			expect(["check-ref-format", "rev-parse", "status", "show-ref", "worktree", "symbolic-ref"]).toContain(command);
			if (command === "worktree")
				expect(args.slice(args.indexOf("worktree") + 1, args.indexOf("worktree") + 3)).toEqual(["add", "-b"]);
		}
	} catch (error) {
		if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
	}
	// Only the disposable test-owned root is removed, after preservation assertions.
	await rm(root, { recursive: true, force: true });
});

describe("Weavra isolated worktree launcher (POSIX)", () => {
	it("creates a clean branch at frozen HEAD outside the source and execs only fork-local Pi with exact argv/env/stdio", async () => {
		const args = [
			"--model",
			"provider/model with spaces",
			"--worktree",
			"fix-login",
			"--",
			"",
			"$(touch marker); *",
			"--worktree",
			"literal prompt",
		];
		const result = run(args, { ECHO_STDIN: "1" }, "unchanged input\n");
		expect(result.error).toBeUndefined();
		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout.split("\n")[0])).toEqual({
			cli,
			cwd: target(),
			args: ["-e", extension, ...args.slice(0, 2), ...args.slice(4)],
			marker: env.WEAVRA_MARKER,
			home: root,
			agentDir: env.PI_CODING_AGENT_DIR,
		});
		expect(result.stdout.endsWith("unchanged input\n")).toBe(true);
		expect(result.stderr).toContain(
			`Weavra worktree created\nBranch: weavra/fix-login\nPath: ${target()}\nBase: ${head}\n`,
		);
		expect(result.stderr).toContain("Pi stderr");
		expect(git(["rev-parse", "HEAD"], target())).toBe(head);
		expect(git(["symbolic-ref", "HEAD"], target())).toBe("refs/heads/weavra/fix-login");
		expect(git(["status", "--porcelain"], target())).toBe("");
		expect(await readFile(join(target(), "app.txt"), "utf8")).toBe("original\n");
		const calls = (await readFile(join(root, "git-calls.jsonl"), "utf8"))
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line) as string[]);
		expect(
			calls.filter((args) => args.includes("worktree")).map((args) => args.slice(args.indexOf("worktree"))),
		).toEqual([["worktree", "add", "-b", "weavra/fix-login", target(), head]]);
		await sourceUnchanged();
	});
	it("resolves the canonical source root from a symlinked subdirectory and npm-style launcher link", async () => {
		await mkdir(join(source, "subdirectory"));
		await symlink(source, join(root, "project alias"));
		cwd = join(root, "project alias/subdirectory");
		const linked = join(bin, "weavra");
		await symlink(launcher, linked);
		launcher = linked;
		const result = run(["--worktree", "Fix_1.2-login"], { CDPATH: root });
		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout)).toMatchObject({ cli, cwd: target("Fix_1.2-login") });
		await sourceUnchanged();
	});
	it("also accepts a clean linked worktree as the source without changing its checkout", async () => {
		const linked = join(root, "existing worktree");
		git(["worktree", "add", "-b", "existing", linked, head]);
		cwd = linked;
		const result = run();
		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout).cwd).toBe(join(root, ".weavra-worktrees/existing worktree/fix-login"));
		expect(git(["symbolic-ref", "HEAD"], linked)).toBe("refs/heads/existing");
		expect(git(["rev-parse", "HEAD"], linked)).toBe(head);
		await sourceUnchanged();
	});
	it.each([".weavra-worktrees", "user project\n"])(
		"rejects a source path that would nest or ambiguously resolve the target: %s",
		async (name) => {
			const renamed = join(root, name);
			await rename(source, renamed);
			source = renamed;
			cwd = renamed;
			const result = run();
			expect(result.status).toBe(1);
			expect(result.stderr).toMatch(/outside the source repository|must not contain line breaks/);
			await noCreation();
			await sourceUnchanged();
		},
	);
	it("supports a detached source HEAD without attaching or moving it", () => {
		git(["checkout", "--detach", head]);
		const result = run();
		expect(result.status, result.stderr).toBe(0);
		expect(git(["rev-parse", "--symbolic-full-name", "HEAD"])).toBe("HEAD");
		expect(git(["rev-parse", "HEAD"])).toBe(head);
	});
	it.each(["tracked", "staged", "untracked"])("rejects a %s dirty source without altering changes", async (kind) => {
		const path = join(source, kind === "untracked" ? "new file" : "app.txt");
		await writeFile(path, "user changes\n");
		if (kind === "staged") git(["add", "app.txt"]);
		const before = await readFile(join(source, ".git/index"));
		const result = run();
		expect(result.status).toBe(1);
		expect(result.stderr).toContain(
			"Weavra: source workspace has uncommitted changes.\nCommit or clean them before creating an isolated worktree.\nNo stash/reset was performed.",
		);
		expect(await readFile(path, "utf8")).toBe("user changes\n");
		expect(await readFile(join(source, ".git/index"))).toEqual(before);
		expect(git(["rev-parse", "HEAD"])).toBe(head);
		expect(git(["symbolic-ref", "HEAD"])).toBe("refs/heads/main");
		await noCreation();
		await absent(join(root, "pi-started"));
	});
	it("refuses an existing branch without reuse or deletion", async () => {
		git(["branch", "weavra/fix-login"]);
		expect(run().stderr).toContain("branch already exists");
		expect(git(["rev-parse", "weavra/fix-login"])).toBe(head);
		await absent(target());
		await sourceUnchanged();
	});
	it.each(["empty directory", "nonempty directory", "file", "dangling symlink"])(
		"preserves an existing target %s",
		async (kind) => {
			await mkdir(dirname(target()), { recursive: true });
			if (kind.includes("directory")) {
				await mkdir(target());
				if (kind === "nonempty directory") await writeFile(join(target(), "user-data"), "keep");
			} else if (kind === "file") await writeFile(target(), "keep");
			else await symlink(join(root, "absent"), target());
			const before = await lstat(target());
			const result = run();
			expect(result.status).toBe(1);
			expect(result.stderr).toContain("target already exists");
			expect((await lstat(target())).ino).toBe(before.ino);
			if (kind === "nonempty directory") expect(await readFile(join(target(), "user-data"), "utf8")).toBe("keep");
			if (kind === "file") expect(await readFile(target(), "utf8")).toBe("keep");
			expect(git(["for-each-ref", "refs/heads/weavra/"])).toBe("");
			await sourceUnchanged();
		},
	);
	it.each(["../escape", "a/b", "a b", "a;touch-marker", "한글", ".", "..", "a..b", "a.lock", "trailing.", ".hidden"])(
		"rejects unsafe or Git-invalid name %s",
		async (name) => {
			expect(run(["--worktree", name]).status).toBe(1);
			await absent(join(root, ".weavra-worktrees"));
			await absent(join(root, "pi-started"));
			await sourceUnchanged();
		},
	);
	it.each([
		{ args: ["--worktree"] },
		{ args: ["--worktree", ""] },
		{ args: ["--worktree", "--model", "x"] },
		{ args: ["--worktree", "a", "--worktree", "b"] },
	])("rejects missing/duplicate worktree names: $args", async ({ args }) => {
		expect(run(args).status).toBe(1);
		await noCreation();
	});
	it.each([
		"root",
		"head",
		"branch",
		"status",
		"refs",
		"add",
		"post-status",
		"post-head",
		"partial-add",
		"target-dirty",
	])("fails closed on Git failure or invalid postcondition: %s", async (fault) => {
		const result = run(undefined, { GIT_FAULT: fault });
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).not.toContain("Weavra worktree created");
		await absent(join(root, "pi-started"));
		if (["post-status", "post-head", "partial-add", "target-dirty"].includes(fault)) {
			expect(git(["rev-parse", "weavra/fix-login"])).toBe(head);
			expect((await lstat(target())).isDirectory()).toBe(true);
		} else if (fault === "add") expect((await lstat(target())).isDirectory()).toBe(true);
		else await noCreation();
		await sourceUnchanged();
	});
	it.each(["pre-branch-change", "post-branch-change", "post-head-change"])(
		"detects external source checkout changes without trying to restore them: %s",
		async (fault) => {
			const other = git([
				"-c",
				"commit.gpgsign=false",
				"commit-tree",
				`${head}^{tree}`,
				"-p",
				head,
				"-m",
				"other commit",
			]);
			git(["branch", "other", head]);
			const result = run(undefined, { GIT_FAULT: fault, OTHER_HEAD: other });
			expect(result.status).toBe(1);
			expect(result.stderr).toContain("source HEAD or branch changed");
			expect(result.stderr).not.toContain("Weavra worktree created");
			await absent(join(root, "pi-started"));
			if (fault === "post-head-change") expect(git(["rev-parse", "HEAD"])).toBe(other);
			else expect(git(["symbolic-ref", "HEAD"])).toBe("refs/heads/other");
			if (fault.startsWith("post")) expect(git(["rev-parse", "HEAD"], target())).toBe(head);
			else await noCreation();
		},
	);
	it.each(["non-Git", "unborn"])("rejects a %s source", async (kind) => {
		cwd = join(root, "not initialized");
		await mkdir(cwd);
		if (kind === "unborn") git(["init", "-b", "main"], cwd);
		expect(run().status).toBe(1);
		await absent(join(root, "pi-started"));
		await absent(join(root, ".weavra-worktrees"));
	});
	it("rejects symlinked worktree parents pointing into the source", async () => {
		await symlink(source, join(root, ".weavra-worktrees"));
		expect(run().stderr).toContain("must not be a symlink");
		await absent(join(source, basename(source)));
		await sourceUnchanged();
	});
	it("preserves a non-directory worktree parent", async () => {
		const parent = join(root, ".weavra-worktrees");
		await writeFile(parent, "user data");
		expect(run().status).toBe(1);
		expect(await readFile(parent, "utf8")).toBe("user data");
		expect(git(["for-each-ref", "refs/heads/weavra/"])).toBe("");
		await sourceUnchanged();
	});
	it("rejects Git directory redirection without touching either repository", async () => {
		expect(run(undefined, { GIT_WORK_TREE: root }).stderr).toContain("unset GIT_WORK_TREE");
		await noCreation();
		await sourceUnchanged();
	});
	it("does not execute checkout hooks or rewrite the source index", async () => {
		await writeFile(
			join(source, ".git/hooks/post-checkout"),
			`#!/bin/sh\nprintf changed > '${join(source, "app.txt")}'\n`,
			{ mode: 0o755 },
		);
		expect(run().status).toBe(0);
		await sourceUnchanged();
	});
	it("fails before creating anything if the local Pi build is missing", async () => {
		await rm(cli);
		const result = run();
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("fork-local Pi build is missing");
		expect(result.stderr).toContain("No global Pi fallback");
		await noCreation();
		await sourceUnchanged();
	});
	it.each([
		{ outcome: "COMPLETED", code: "0" },
		{ outcome: "BLOCKED", code: "0" },
		{ outcome: "CANCELLED", code: "0" },
		{ outcome: "FAILED", code: "23" },
		{ outcome: "CANCELLED", code: "0", signal: "SIGTERM" },
		{ outcome: "CANCELLED", code: "0", signal: "SIGINT" },
	])(
		"leaves branch/worktree and worktree-local .ai intact after CLI outcome $outcome/$code/$signal",
		async ({ outcome, code, signal }) => {
			const result = run(undefined, { OUTCOME: outcome, WRITE_STATE: "1", PI_EXIT: code, SIGNAL_EXIT: signal });
			if (signal) expect(result.signal).toBe(signal);
			else expect(result.status).toBe(Number(code));
			expect(git(["rev-parse", "weavra/fix-login"])).toBe(head);
			expect(git(["worktree", "list", "--porcelain"])).toContain(`worktree ${target()}\n`);
			expect(JSON.parse(await readFile(join(target(), ".ai/state.json"), "utf8"))).toEqual({ status: outcome });
			await sourceUnchanged();
		},
	);
});
