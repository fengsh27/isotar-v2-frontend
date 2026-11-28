// Helpers for the optional "Select Target" filter.
//   mir-target:  gene symbols (TP53, HLA-A) or Ensembl / FlyBase / WormBase
//                gene or transcript ids (ENSG00000141510, ENST00000269305,
//                FBgn0039044, WBGene00000467). RefSeq accessions are refused
//                here even though the backend API still takes them (scripts
//                and the network pairs box use them).
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

/** RefSeq accession shape (NM_000546, XM_011523863.2). */
export function isRefSeqAccession(target: string): boolean {
  return REFSEQ_RE.test(target);
}

/** Cheap, frontend-only sanity check for a miR-Target entry: a gene symbol or
 *  an Ensembl / FlyBase / WormBase id. Those ids all fit SYMBOL_RE; RefSeq
 *  accessions do not (underscore), so they fail here. */
export function isValidTargetFormat(target: string): boolean {
  return SYMBOL_RE.test(target);
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

/** miR-Target entries given as RefSeq accessions, which the website no longer
 *  accepts (they also count as malformed). */
export function findRefSeqTargets(raw: string): string[] {
  return parseTargets(raw).filter(isRefSeqAccession);
}

/** Per-genome examples for the miR-Target card, all present in the backend's
 *  reference_mapping.db (gene id = every RefSeq isoform of the gene). */
const GENE_TARGET_EXAMPLES: Record<string, { symbol: string; geneId: string; transcriptId?: string }> = {
  hg38: { symbol: "TP53", geneId: "ENSG00000141510", transcriptId: "ENST00000269305" },
  hg19: { symbol: "TP53", geneId: "ENSG00000141510", transcriptId: "ENST00000269305" },
  mmu: { symbol: "Trp53", geneId: "ENSMUSG00000059552" },
  rno: { symbol: "Tp53", geneId: "ENSRNOG00000010756" },
  mml: { symbol: "TP53", geneId: "ENSMMUG00000008639" },
  ptr: { symbol: "TP53", geneId: "ENSPTRG00045046089" },
  mdo: { symbol: "TP53", geneId: "ENSMODG00000066781" },
  cfa: { symbol: "BRCA1", geneId: "ENSCAFG00000014600" },
  dre: { symbol: "tp53", geneId: "ENSDARG00180036740" },
  dme: { symbol: "p53", geneId: "FBgn0039044", transcriptId: "FBtr0084359" },
  cel: { symbol: "cep-1", geneId: "WBGene00000467", transcriptId: "F52B5.5a.1" },
};

export function geneTargetExamples(genome: string) {
  return GENE_TARGET_EXAMPLES[genome] ?? GENE_TARGET_EXAMPLES.hg38;
}
