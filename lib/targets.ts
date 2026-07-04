// Helpers for the optional "Select Target" filter.
//   mir-target:  gene symbols (TP53, HLA-A) or RefSeq IDs (NM_000546).
//   mir-lncrna:  Ensembl transcript/gene ids (ENST/ENSG/ENSMUST/…), FlyBase
//                (FBtr/FBgn), or WormBase names (Y51H4A.27, WBGene…).

const REFSEQ_RE = /^[NX][MR]_\d+(\.\d+)?$/i;
const SYMBOL_RE = /^[A-Za-z0-9][A-Za-z0-9.\-]*$/;

// Mirrors backend _LNCRNA_ID_RE in ../isoTar-v2/app_v1/lncrna_reference.py.
// Ensembl / FlyBase carry an optional .<version> suffix; WormBase names use
// the SYMBOL_RE shape (Y51H4A.27, WBGene00021944).
const ENSEMBL_FLYBASE_RE = /^(ENS[A-Z]{0,6}[TG]\d+|FB(?:tr|gn)\d+)(\.\d+)?$/;

export type TargetKind = "gene" | "lncrna";

/** Split raw textarea / file content into trimmed, non-empty target entries. */
export function parseTargets(raw: string): string[] {
  return raw
    .split(/[\r\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Cheap, frontend-only sanity check — does this entry look like a gene symbol or a RefSeq ID? */
export function isValidTargetFormat(target: string): boolean {
  return REFSEQ_RE.test(target) || SYMBOL_RE.test(target);
}

/** Cheap frontend-only sanity check for lncRNA target tokens. WormBase names
 *  (e.g. Y51H4A.27) satisfy SYMBOL_RE, so accept anything that matches either
 *  the Ensembl/FlyBase shape or the generic symbol shape. */
export function isValidLncrnaTargetFormat(target: string): boolean {
  return ENSEMBL_FLYBASE_RE.test(target) || SYMBOL_RE.test(target);
}

/** Entries that don't look like a plausible target id for the given kind. */
export function findMalformedTargets(raw: string, kind: TargetKind = "gene"): string[] {
  const check = kind === "lncrna" ? isValidLncrnaTargetFormat : isValidTargetFormat;
  return parseTargets(raw).filter((t) => !check(t));
}
