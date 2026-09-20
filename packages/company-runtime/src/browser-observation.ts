import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Static, Type } from "typebox";
import { Check } from "typebox/value";
import { JEV_READER_DIGEST, JEV_READER_REVISION, JEV_SNAPSHOT_SOURCE } from "./browser-snapshot.ts";
import { ProcessCleanupError, resolveExecutable, runProcess, verificationEnvironment } from "./process-runner.ts";

const boundedText = (maxLength: number) => Type.String({ maxLength });
export const BrowserObservationSchema = Type.Object(
	{
		url: boundedText(2048),
		title: boundedText(256),
		text: boundedText(6000),
		markerDigest: Type.String({ pattern: "^[a-f0-9]{64}$" }),
		elements: Type.Array(
			Type.Object(
				{
					id: boundedText(16),
					role: boundedText(32),
					label: boundedText(256),
					kind: Type.Union([Type.Literal("click"), Type.Literal("fill"), Type.Literal("select")]),
				},
				{ additionalProperties: false },
			),
			{ maxItems: 64 },
		),
		omittedElements: Type.Integer({ minimum: 0 }),
	},
	{ additionalProperties: false },
);
export type BrowserObservation = Static<typeof BrowserObservationSchema>;
export const BrowserCaptureSchema = Type.Object(
	{
		first: BrowserObservationSchema,
		second: BrowserObservationSchema,
		startedAt: Type.Integer({ minimum: 0 }),
		finishedAt: Type.Integer({ minimum: 0 }),
		browserVersion: boundedText(128),
	},
	{ additionalProperties: false },
);

export interface BrowserObservationRequest {
	url: string;
	executable: string;
	/** Explicit Host acknowledgement, not a Kernel approval or a network-sandbox claim. */
	localTestApp: true;
	signal?: AbortSignal;
}
export interface BrowserObservationCandidate {
	schemaVersion: 1;
	kind: "BROWSER_OBSERVATION_CANDIDATE";
	captureId: string;
	authority: "CANDIDATE_ONLY";
	scope: "LOCAL_STATIC_DOCUMENT";
	readerRevision: string;
	readerDigest: string;
	browserVersion: string;
	startedAt: number;
	finishedAt: number;
	observationDigest: string;
	observation: BrowserObservation;
	cleanup: "CONFIRMED";
}

export class BrowserObservationError extends Error {
	constructor() {
		super("Browser observation unavailable or denied; no check registration, PASS, or COMPLETE was produced.");
		this.name = "BrowserObservationError";
	}
}

function localDocumentUrl(request: BrowserObservationRequest): string {
	if (request.localTestApp !== true || !isAbsolute(request.executable)) throw new BrowserObservationError();
	let url: URL;
	try {
		url = new URL(request.url);
	} catch {
		throw new BrowserObservationError();
	}
	if (
		request.url.length > 2048 ||
		url.href.length > 2048 ||
		url.protocol !== "http:" ||
		url.hostname !== "127.0.0.1" ||
		Number(url.port) < 1024 ||
		!url.port ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	)
		throw new BrowserObservationError();
	return url.href;
}

export function parseBrowserObservationArguments(args: readonly string[]): BrowserObservationRequest {
	if (args[0] !== "observe") throw new BrowserObservationError();
	let url: string | undefined;
	let executable: string | undefined;
	let localTestApp = false;
	let json = false;
	for (let index = 1; index < args.length; index++) {
		const argument = args[index];
		if (argument === "--local-test-app" && !localTestApp) localTestApp = true;
		else if (argument === "--json" && !json) json = true;
		else if (argument === "--url" && url === undefined && args[index + 1]) url = args[++index];
		else if (argument === "--executable" && executable === undefined && args[index + 1]) executable = args[++index];
		else throw new BrowserObservationError();
	}
	if (!url || !executable || !localTestApp || !json) throw new BrowserObservationError();
	const request: BrowserObservationRequest = { url, executable, localTestApp: true };
	request.url = localDocumentUrl(request);
	return request;
}

/**
 * Host-only observation of an explicitly reviewed local static document. No ambient browser,
 * model, action, screenshot, registration or Kernel mutation. A candidate is never CheckResult.
 * Host review must separately establish a real registered oracle; its fresh independent execution
 * and the existing Kernel guards remain mandatory. Capture-time agreement is not future freshness.
 */
export async function observeLocalBrowser(request: BrowserObservationRequest): Promise<BrowserObservationCandidate> {
	const url = localDocumentUrl(request);
	request.signal?.throwIfAborted();
	if (process.platform === "win32") throw new BrowserObservationError();
	if (createHash("sha256").update(JEV_SNAPSHOT_SOURCE).digest("hex") !== JEV_READER_DIGEST)
		throw new BrowserObservationError();
	const executable = await resolveExecutable(request.executable, "");
	const directory = await mkdtemp(join(tmpdir(), "weavra-browser-"));
	let cleanupConfirmed = true;
	try {
		const home = join(directory, "home");
		await mkdir(home, { mode: 0o700 });
		const result = await runProcess({
			executable: process.execPath,
			argv: [fileURLToPath(new URL("./browser-driver.ts", import.meta.url)), executable, url],
			cwd: directory,
			env: { ...verificationEnvironment(), HOME: home, TMPDIR: directory },
			timeoutMs: 15000,
			// Two bounded projections can exceed 256 KiB after JSON control-character escaping.
			maxOutputBytes: 524288,
			signal: request.signal,
		});
		cleanupConfirmed = result.cleanupConfirmed;
		if (!cleanupConfirmed) throw new ProcessCleanupError();
		if (result.reason !== "exited" || result.exitCode !== 0) throw new BrowserObservationError();
		let capture: unknown;
		try {
			capture = JSON.parse(result.stdout);
		} catch {
			throw new BrowserObservationError();
		}
		if (
			!Check(BrowserCaptureSchema, capture) ||
			capture.first.url !== url ||
			capture.startedAt < result.startedAt ||
			capture.finishedAt > result.finishedAt ||
			capture.finishedAt < capture.startedAt ||
			JSON.stringify(capture.first) !== JSON.stringify(capture.second)
		)
			throw new BrowserObservationError();
		return {
			schemaVersion: 1,
			kind: "BROWSER_OBSERVATION_CANDIDATE",
			captureId: randomUUID(),
			authority: "CANDIDATE_ONLY",
			scope: "LOCAL_STATIC_DOCUMENT",
			readerRevision: JEV_READER_REVISION,
			readerDigest: JEV_READER_DIGEST,
			browserVersion: capture.browserVersion,
			startedAt: capture.startedAt,
			finishedAt: capture.finishedAt,
			observationDigest: createHash("sha256").update(JSON.stringify(capture.first)).digest("hex"),
			observation: capture.first,
			cleanup: "CONFIRMED",
		};
	} finally {
		if (cleanupConfirmed) await rm(directory, { recursive: true, force: true });
	}
}
