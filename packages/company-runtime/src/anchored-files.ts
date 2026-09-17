import {
	closeSync,
	constants,
	fstatSync,
	ftruncateSync,
	lstatSync,
	openSync,
	readSync,
	realpathSync,
	writeSync,
} from "node:fs";
import { join } from "node:path";
import {
	ANCHORED_MAX_BYTES,
	type AnchoredReplacement,
	applyAnchoredReplacement,
	decodeAnchoredText,
	StaleAnchorError,
	snapshotText,
} from "./anchored-edit.ts";
import { isPolicyPath } from "./policy.ts";

/** Repeat path safety synchronously after the asynchronous Policy/audit boundary. */
function assertPath(cwd: string, path: string): string {
	if (!isPolicyPath(path) || realpathSync(cwd) !== cwd || !lstatSync(cwd).isDirectory())
		throw new Error("Unsafe anchored path");
	let current = cwd;
	const parts = path.split("/");
	for (const [index, part] of parts.entries()) {
		current = join(current, part);
		const stat = lstatSync(current);
		if (stat.isSymbolicLink() || (index < parts.length - 1 && !stat.isDirectory()))
			throw new Error("Unsafe anchored path");
	}
	return current;
}

function readBounded(fd: number): Buffer {
	const stat = fstatSync(fd);
	if (!stat.isFile() || stat.nlink !== 1 || stat.size > ANCHORED_MAX_BYTES)
		throw new Error("Unsupported anchored file");
	const buffer = Buffer.alloc(ANCHORED_MAX_BYTES + 1);
	let length = 0;
	while (length < buffer.length) {
		const count = readSync(fd, buffer, length, buffer.length - length, length);
		if (!count) break;
		length += count;
	}
	if (length > ANCHORED_MAX_BYTES) throw new Error("Anchored file exceeds size limit");
	return buffer.subarray(0, length);
}

export function readAnchoredFile(cwd: string, path: string): string {
	const identity = assertPath(cwd, path);
	const fd = openSync(identity, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	try {
		return snapshotText(identity, decodeAnchoredText(readBounded(fd)));
	} finally {
		closeSync(fd);
	}
}

/** Called only after Policy ALLOW. No create, truncate-on-open, async gap, or reopen for writing. */
export function editAnchoredFile(cwd: string, path: string, input: AnchoredReplacement, signal: AbortSignal): void {
	signal.throwIfAborted();
	const identity = assertPath(cwd, path);
	const fd = openSync(identity, constants.O_RDWR | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	try {
		const before = fstatSync(fd, { bigint: true });
		const bytes = readBounded(fd);
		const replacement = Buffer.from(applyAnchoredReplacement(identity, decodeAnchoredText(bytes), input));
		// Detect changes during computation, including an external rename replacing the path.
		if (!readBounded(fd).equals(bytes)) throw new StaleAnchorError("file changed before apply");
		assertPath(cwd, path);
		const current = lstatSync(identity, { bigint: true });
		const after = fstatSync(fd, { bigint: true });
		if (
			current.dev !== before.dev ||
			current.ino !== before.ino ||
			current.isSymbolicLink() ||
			after.nlink !== 1n ||
			after.size !== before.size ||
			after.mode !== before.mode ||
			after.mtimeNs !== before.mtimeNs ||
			after.ctimeNs !== before.ctimeNs
		)
			throw new StaleAnchorError("file identity changed before apply");
		signal.throwIfAborted();
		// No JS yield from validation to effect. POSIX does not provide CAS against uncooperative external writers.
		let written = 0;
		while (written < replacement.length) {
			const count = writeSync(fd, replacement, written, replacement.length - written, written);
			if (!count) throw new Error("Anchored write made no progress");
			written += count;
		}
		ftruncateSync(fd, replacement.length);
	} finally {
		closeSync(fd);
	}
}
