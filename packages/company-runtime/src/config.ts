import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { dirname, resolve, win32 } from "node:path";
import { type Static, Type } from "typebox";
import { Check } from "typebox/value";
import { parseDocument } from "yaml";
import { CheckKindSchema, WorkflowSchema } from "./contracts.ts";

const text = Type.String({ minLength: 1, pattern: "\\S" });
const strict = { additionalProperties: false } as const;
const profile = Type.Object({ provider: text, model: text }, strict);

export const RuntimeConfigSchema = Type.Object(
	{
		schemaVersion: Type.Literal(1),
		models: Type.Object(
			{
				profiles: Type.Object(
					{
						coding: profile,
						reasoning: profile,
						fast: Type.Optional(profile),
						creative: Type.Optional(profile),
					},
					strict,
				),
			},
			strict,
		),
		runtime: Type.Optional(
			Type.Object(
				{
					workflow: Type.Optional(Type.Union([Type.Literal("adaptive"), WorkflowSchema])),
				},
				strict,
			),
		),
		agents: Type.Optional(
			Type.Object(
				{
					max_parallel: Type.Optional(Type.Literal(1)),
					max_revision_cycles: Type.Optional(Type.Integer({ minimum: 0, maximum: 3 })),
				},
				strict,
			),
		),
		review: Type.Optional(Type.Object({ enabled: Type.Optional(Type.Literal(true)) }, strict)),
		state: Type.Optional(
			Type.Object(
				{
					enabled: Type.Optional(Type.Literal(true)),
					directory: Type.Optional(Type.Literal(".ai")),
				},
				strict,
			),
		),
		risk: Type.Optional(
			Type.Object(
				{
					approval_required: Type.Optional(Type.Tuple([Type.Literal("R3")])),
				},
				strict,
			),
		),
		files: Type.Optional(
			Type.Object(
				{
					// Literal workspace-relative file/directory roots, not shell or glob patterns.
					allowed_paths: Type.Optional(Type.Array(text, { uniqueItems: true })),
				},
				strict,
			),
		),
		verification: Type.Optional(
			Type.Object(
				{
					checks: Type.Optional(
						Type.Array(
							Type.Object(
								{
									id: text,
									kind: CheckKindSchema,
									executable: text,
									args: Type.Array(Type.String()),
									cwd: Type.Optional(text),
									timeout_ms: Type.Optional(Type.Integer({ minimum: 1, maximum: 3_600_000 })),
									required: Type.Optional(Type.Boolean()),
								},
								strict,
							),
						),
					),
				},
				strict,
			),
		),
	},
	strict,
);

export type RuntimeConfigInput = Static<typeof RuntimeConfigSchema>;
export type RuntimeConfig = ReturnType<typeof parseRuntimeConfig>;
export type LoadedConfig =
	| { status: "missing"; path: string }
	| { status: "configured"; path: string; config: RuntimeConfig };

function validateRelativePath(path: string): void {
	if (
		path.startsWith("/") ||
		win32.isAbsolute(path) ||
		path.includes("\\") ||
		path.includes(":") ||
		path.split("/").includes("..") ||
		/[\x00-\x1f*?[\]{}]/.test(path)
	) {
		throw new Error("Config paths must be literal workspace-relative paths without parent traversal");
	}
}

/** Strict data parsing only: no interpolation, command execution, credential lookup or file writes. */
export function parseRuntimeConfig(source: string) {
	if (Buffer.byteLength(source, "utf8") > 65_536) throw new Error("Runtime config exceeds 64 KiB");
	let value: unknown;
	try {
		const document = parseDocument(source, {
			version: "1.2",
			schema: "core",
			merge: false,
			uniqueKeys: true,
			resolveKnownTags: false,
			prettyErrors: false,
			logLevel: "silent",
		});
		if (document.errors.length || document.warnings.length) throw new Error("Invalid YAML");
		value = document.toJS({ maxAliasCount: 0 });
	} catch {
		// Do not echo YAML snippets: malformed settings can contain credentials.
		throw new Error("Invalid runtime YAML: expected one document without aliases or unknown tags");
	}
	if (!Check(RuntimeConfigSchema, value)) {
		throw new Error(
			"Invalid runtime config: check schemaVersion, model profiles, supported fields and policy limits",
		);
	}
	const allowedPaths = value.files?.allowed_paths ?? [];
	for (const path of allowedPaths) validateRelativePath(path);
	const ids = new Set<string>();
	const checks = (value.verification?.checks ?? []).map((check) => {
		if (ids.has(check.id)) throw new Error("Duplicate verification check ID");
		ids.add(check.id);
		validateRelativePath(check.cwd ?? ".");
		return {
			...check,
			cwd: check.cwd ?? ".",
			timeout_ms: check.timeout_ms ?? 60_000,
			required: check.required ?? true,
		};
	});
	return {
		schemaVersion: value.schemaVersion,
		models: value.models,
		runtime: { workflow: value.runtime?.workflow ?? "adaptive" },
		agents: { max_parallel: 1 as const, max_revision_cycles: value.agents?.max_revision_cycles ?? 1 },
		review: { enabled: true as const },
		state: { enabled: true as const, directory: ".ai" as const },
		risk: { approval_required: ["R3"] as ["R3"] },
		files: { allowed_paths: allowedPaths },
		verification: { checks },
	};
}

/** The caller must establish project trust before reading this project-local configuration. */
export async function loadRuntimeConfig(cwd: string): Promise<LoadedConfig> {
	const path = resolve(cwd, ".ai", "config.yaml");
	let source: string;
	try {
		const directory = await lstat(dirname(path));
		if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error("Unsafe config directory");
		const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
		try {
			const stat = await handle.stat();
			if (!stat.isFile() || stat.nlink !== 1 || stat.size > 65_536)
				throw new Error("Unsafe or oversized config file");
			source = await handle.readFile("utf8");
			const current = await lstat(dirname(path));
			if (
				!current.isDirectory() ||
				current.isSymbolicLink() ||
				current.dev !== directory.dev ||
				current.ino !== directory.ino
			)
				throw new Error("Config directory changed");
		} finally {
			await handle.close();
		}
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") return { status: "missing", path };
		throw new Error("Unable to read .ai/config.yaml");
	}
	return { status: "configured", path, config: parseRuntimeConfig(source) };
}
