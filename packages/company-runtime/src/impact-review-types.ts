import type { LspLocation } from "./lsp/types.ts";

export interface ImpactSymbol {
	id: string;
	path: string;
	name: string;
	kind: number;
	range: Omit<LspLocation, "path">;
	selection: { line: number; column: number };
	sourceDigest: string;
}
export interface ImpactRelation extends LspLocation {
	symbolId: string;
	sourceDigest: string;
}
export interface ImpactReviewPack {
	version: 1;
	runId: string;
	revision: number;
	taskContractDigest: string;
	diffDigest: string;
	/** Observation time only; excluded from the content digest. */
	generatedAt: number;
	changedFiles: string[];
	changedSymbols: ImpactSymbol[];
	/** References, not a complete call graph or a proof that a location is a call. */
	callers: ImpactRelation[];
	declarations: ImpactRelation[];
	relatedTests: Array<{
		path: string;
		reason: "lsp-reference" | "same-stem" | "same-directory" | "c01-heuristic";
		sourceDigest: string;
	}>;
	unknowns: string[];
	truncated: boolean;
	digest: string;
}
