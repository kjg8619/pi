import {
	closeSync,
	constants,
	fstatSync,
	ftruncateSync,
	lstatSync,
	openSync,
	readSync,
	realpathSync,
	unlinkSync,
	writeSync,
} from "node:fs";
import { join } from "node:path";
import {
	ANCHORED_MAX_BYTES,
	type AnchoredReplacement,
	applyAnchoredReplacement,
	decodeAnchoredText,
	fileDigest,
	StaleAnchorError,
	StaleMutationError,
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
		const pathStat = lstatSync(identity, { bigint: true });
		const after = fstatSync(fd, { bigint: true });
		if (
			pathStat.dev !== before.dev ||
			pathStat.ino !== before.ino ||
			pathStat.isSymbolicLink() ||
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

function assertTextContent(content: string): Buffer {
	const bytes = Buffer.from(content, "utf8");
	if (bytes.length > ANCHORED_MAX_BYTES) throw new Error("Anchored content exceeds size limit");
	if (bytes.toString("utf8") !== content) throw new Error("Anchored content must be strict UTF-8");
	return bytes;
}

/** Parent chain only: the target may not exist yet. No mkdir; every parent must already be a real directory. */
function assertParentPath(cwd: string, path: string): string {
	if (!isPolicyPath(path) || realpathSync(cwd) !== cwd || !lstatSync(cwd).isDirectory())
		throw new Error("Unsafe anchored path");
	const parts = path.split("/");
	let current = cwd;
	for (const [index, part] of parts.entries()) {
		if (index === parts.length - 1) return join(current, part);
		current = join(current, part);
		const stat = lstatSync(current);
		if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Unsafe anchored path");
	}
	throw new Error("Unsafe anchored path");
}

/** Strict create: OS exclusive create only. No overwrite, truncate, append or mkdir; an existing target fails. */
export function createAnchoredFile(cwd: string, path: string, content: string, signal: AbortSignal): void {
	signal.throwIfAborted();
	const bytes = assertTextContent(content);
	const identity = assertParentPath(cwd, path);
	let fd: number;
	try {
		fd = openSync(
			identity,
			constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW | constants.O_NONBLOCK,
			0o600,
		);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST")
			throw new StaleMutationError("target already exists; strict create never overwrites");
		throw error;
	}
	try {
		const stat = fstatSync(fd);
		if (!stat.isFile() || stat.nlink !== 1) throw new Error("Unsupported anchored target");
		signal.throwIfAborted();
		let written = 0;
		while (written < bytes.length) {
			const count = writeSync(fd, bytes, written, bytes.length - written, written);
			if (!count) throw new Error("Anchored write made no progress");
			written += count;
		}
	} catch (error) {
		// Never leave a partial file behind for a failed create of a file this process just created.
		closeSync(fd);
		try {
			unlinkSync(identity);
		} catch {
			// Best effort only; the failure below is the authoritative outcome.
		}
		throw error;
	}
	closeSync(fd);
}

/** Strict replace: an existing regular file only. No create fallback and no truncate-on-open. */
export function replaceAnchoredFile(
	cwd: string,
	path: string,
	content: string,
	expectedDigest: string,
	signal: AbortSignal,
): void {
	signal.throwIfAborted();
	const bytes = assertTextContent(content);
	const identity = assertPath(cwd, path);
	let fd: number;
	try {
		fd = openSync(identity, constants.O_RDWR | constants.O_NOFOLLOW | constants.O_NONBLOCK);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT")
			throw new StaleMutationError("replace target is missing; strict replace never creates");
		throw error;
	}
	try {
		const before = fstatSync(fd, { bigint: true });
		// Existing source must still be a bounded, strict UTF-8, single-link regular file at the exact read generation.
		const source = decodeAnchoredText(readBounded(fd));
		if (fileDigest(source) !== expectedDigest)
			throw new StaleMutationError("file changed since the read receipt; re-read before replacing");
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
			throw new StaleMutationError("file identity changed before replace");
		signal.throwIfAborted();
		// No JS yield from validation to effect. POSIX does not provide CAS against uncooperative external writers.
		let written = 0;
		while (written < bytes.length) {
			const count = writeSync(fd, bytes, written, bytes.length - written, written);
			if (!count) throw new Error("Anchored write made no progress");
			written += count;
		}
		ftruncateSync(fd, bytes.length);
	} finally {
		closeSync(fd);
	}
}
