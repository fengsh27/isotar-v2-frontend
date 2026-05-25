// Helpers for the optional "Select Target" filter (mir-target workflow).
// Targets are entered as free text — one per line or comma-separated — and are
// either gene symbols (e.g. TP53, HLA-A, C1orf43) or RefSeq IDs (e.g. NM_000546).

const REFSEQ_RE = /^[NX][MR]_\d+(\.\d+)?$/i;
const SYMBOL_RE = /^[A-Za-z0-9][A-Za-z0-9.\-]*$/;

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

/** Entries that match neither the gene-symbol nor RefSeq-ID shape — likely typos or wrong paste. */
export function findMalformedTargets(raw: string): string[] {
  return parseTargets(raw).filter((t) => !isValidTargetFormat(t));
}
