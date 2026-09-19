import { type LspFiles, safeLspText } from "./files.ts";
import { LspConnectionError, object } from "./protocol.ts";
import type { LspDiagnostic, LspLocation, LspSymbol } from "./types.ts";

function range(value: unknown): Omit<LspLocation, "path"> {
	const raw = object(value);
	const start = object(raw.start);
	const end = object(raw.end);
	for (const number of [start.line, start.character, end.line, end.character])
		if (typeof number !== "number" || !Number.isSafeInteger(number) || number < 0 || number >= 1_000_000)
			throw new LspConnectionError("PROTOCOL");
	const line = (start.line as number) + 1,
		column = (start.character as number) + 1;
	const endLine = (end.line as number) + 1,
		endColumn = (end.character as number) + 1;
	if (endLine < line || (endLine === line && endColumn < column)) throw new LspConnectionError("PROTOCOL");
	return { line, column, endLine, endColumn };
}
export async function normalizeLsp(
	kind: "diagnostics" | "definition" | "references" | "symbols",
	value: unknown,
	path: string,
	files: LspFiles,
): Promise<{
	diagnostics: LspDiagnostic[];
	locations: LspLocation[];
	symbols: LspSymbol[];
	withheld: number;
	truncated: number;
}> {
	const result = {
		diagnostics: [] as LspDiagnostic[],
		locations: [] as LspLocation[],
		symbols: [] as LspSymbol[],
		withheld: 0,
		truncated: 0,
	};
	const entries = value === null ? [] : Array.isArray(value) ? value : kind === "definition" ? [value] : undefined;
	if (!entries) throw new LspConnectionError("PROTOCOL");
	const queue = entries.slice(0, 128).map((item) => ({ item, depth: 0 }));
	result.truncated += Math.max(0, entries.length - queue.length);
	let bytes = 0;
	for (let index = 0; index < queue.length; index++) {
		const { item, depth } = queue[index];
		const raw = object(item);
		if (kind === "diagnostics") {
			if (typeof raw.message !== "string") throw new LspConnectionError("PROTOCOL");
			const severity: LspDiagnostic["severity"] =
				raw.severity === 1
					? "error"
					: raw.severity === 2
						? "warning"
						: raw.severity === 3
							? "info"
							: raw.severity === 4
								? "hint"
								: "unknown";
			const diagnostic: LspDiagnostic = {
				path,
				...range(raw.range),
				severity,
				message: safeLspText(raw.message),
				...(typeof raw.code === "string" || typeof raw.code === "number"
					? { code: safeLspText(String(raw.code), 32) }
					: {}),
				...(typeof raw.source === "string" ? { source: safeLspText(raw.source, 64) } : {}),
			};
			if (bytes + Buffer.byteLength(JSON.stringify(diagnostic)) > 8192) {
				result.truncated++;
				continue;
			}
			bytes += Buffer.byteLength(JSON.stringify(diagnostic));
			result.diagnostics.push(diagnostic);
		} else {
			let location: LspLocation;
			if (kind === "symbols" && raw.location === undefined) {
				location = { path, ...range(raw.selectionRange ?? raw.range) };
			} else {
				const target = kind === "symbols" ? object(raw.location) : raw;
				const allowed = await files.fromUri(target.targetUri ?? target.uri);
				// Filter the entire item, including its name and raw URI. Do not read target contents.
				if (!allowed || (kind === "symbols" && allowed !== path)) {
					result.withheld++;
					continue;
				}
				location = { path: allowed, ...range(target.targetSelectionRange ?? target.range ?? target.targetRange) };
			}
			if (kind === "symbols") {
				if (
					typeof raw.name !== "string" ||
					typeof raw.kind !== "number" ||
					!Number.isInteger(raw.kind) ||
					raw.kind < 1 ||
					raw.kind > 26
				)
					throw new LspConnectionError("PROTOCOL");
				const symbol: LspSymbol = {
					...location,
					name: safeLspText(raw.name, 128),
					kind: raw.kind,
					depth,
					range: raw.location === undefined ? range(raw.range) : range(object(raw.location).range),
				};
				const size = Buffer.byteLength(JSON.stringify(symbol));
				if (bytes + size > 8192) {
					result.truncated++;
					continue;
				}
				bytes += size;
				result.symbols.push(symbol);
				if (raw.children !== undefined) {
					if (!Array.isArray(raw.children)) throw new LspConnectionError("PROTOCOL");
					const count = depth < 16 ? Math.min(raw.children.length, 128 - queue.length) : 0;
					queue.push(...raw.children.slice(0, count).map((child) => ({ item: child, depth: depth + 1 })));
					result.truncated += raw.children.length - count;
				}
			} else {
				const size = Buffer.byteLength(JSON.stringify(location));
				if (bytes + size > 8192) {
					result.truncated++;
					continue;
				}
				bytes += size;
				result.locations.push(location);
			}
		}
	}
	const order = (a: LspLocation, b: LspLocation) =>
		a.path < b.path
			? -1
			: a.path > b.path
				? 1
				: a.line - b.line ||
					a.column - b.column ||
					(JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
	result.diagnostics.sort(order);
	result.locations.sort(order);
	result.symbols.sort(order);
	return result;
}
