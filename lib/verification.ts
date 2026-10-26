import type {
  ArmTier,
  TripletTier,
  VerdictValue,
  VerificationArm,
  VerificationResult,
  VerificationRow,
  VerificationStep,
  VerificationVerdict,
} from "@/lib/types";

/** The three arms of a triplet, in the order the backend reports them. */
export const ARMS: { key: VerificationArm; label: string }[] = [
  { key: "mir_gene", label: "miRNA–gene" },
  { key: "mir_lnc", label: "miRNA–lncRNA" },
  { key: "gene_lnc", label: "gene–lncRNA" },
];

export const ARM_LABELS: Record<string, string> = Object.fromEntries(
  ARMS.map((a) => [a.key, a.label]),
);

/** Short tier labels. Tier numbers record disease context, not strength:
 *  tier 1 = both symbols with the tissue's cancer terms, 2 = with any cancer
 *  term, 3 = the two symbols alone. */
export const ARM_TIER_LABELS: Record<ArmTier, string> = {
  "1": "tier 1",
  "2": "tier 2",
  "3": "tier 3",
  none: "none",
  unsearchable: "unsearchable",
};

export const TRIPLET_TIER_LABELS: Record<TripletTier, string> = {
  tier1: "tier 1",
  tier2: "tier 2",
  tier3: "tier 3",
  partial: "partial",
  none: "none",
};

type ChipColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";

export const TRIPLET_TIER_COLOR: Record<TripletTier, ChipColor> = {
  tier1: "success",
  tier2: "primary",
  tier3: "secondary",
  partial: "warning",
  none: "default",
};

export const ARM_TIER_COLOR: Record<ArmTier, ChipColor> = {
  "1": "success",
  "2": "primary",
  "3": "secondary",
  none: "default",
  unsearchable: "default",
};

export const VERDICT_LABELS: Record<VerdictValue, string> = {
  reported_interaction: "reported interaction",
  opposite_arm: "opposite arm",
  co_mention: "co-mention only",
  look_alike: "look-alike symbol",
  editorial_notice: "editorial notice",
  not_accessible: "not accessible",
};

export const VERDICT_COLOR: Record<VerdictValue, ChipColor> = {
  reported_interaction: "success",
  opposite_arm: "warning",
  co_mention: "default",
  look_alike: "danger",
  editorial_notice: "danger",
  not_accessible: "default",
};

/** One line per verdict class, for the legend and the detail view. */
export const VERDICT_HELP: Record<VerdictValue, string> = {
  reported_interaction:
    "The paper reports the interaction between the two partners, with the arm (-3p/-5p) matching when stated.",
  opposite_arm:
    "The paper reports the interaction for the other arm of the same miRNA. Searches run at family level, so this is common.",
  co_mention: "Both symbols appear, but no interaction between them is reported.",
  look_alike: "A hit on a different entity with a similar symbol, not the predicted partner.",
  editorial_notice: "The record is a retraction, correction or expression of concern.",
  not_accessible: "The text could not be fetched or read, so nothing can be concluded.",
};

export const STEP_LABELS: Record<VerificationStep, string> = {
  queued: "Waiting for the verification worker",
  triplets: "Listing triplets",
  search_arms: "Searching PubMed for each arm",
  same_paper: "Searching for same-paper records",
  summaries: "Fetching record titles",
  rollup: "Rolling up tiers",
  review: "Model is reading the queued papers",
  done: "Done",
  failed: "Failed",
};

const TRIPLET_RANK: Record<TripletTier, number> = {
  tier1: 4,
  tier2: 3,
  tier3: 2,
  partial: 1,
  none: 0,
};

export function tripletTierRank(tier: TripletTier): number {
  return TRIPLET_RANK[tier] ?? 0;
}

/** Key matching a verification row to a `NetworkPair` (RefSeq gene id and
 *  Ensembl transcript id, the same ids the network uses). */
export function pairKey(geneId: string, lncrnaId: string): string {
  return `${geneId}\u0000${lncrnaId}`;
}

/** Edge id as `NetworkGraph` builds it, so highlighted triplets map onto the
 *  drawn graph without a second id scheme. */
export function geneEdgeId(geneId: string, mirnaNode: string): string {
  return `${geneId}__${mirnaNode}__gene`;
}

export function lncrnaEdgeId(mirnaNode: string, lncrnaId: string): string {
  return `${mirnaNode}__${lncrnaId}__lncrna`;
}

/** `https://pubmed.ncbi.nlm.nih.gov/31837602/` → `31837602`. */
export function pmidOf(url: string): string {
  const m = /\/(\d+)\/?$/.exec((url ?? "").trim());
  return m ? m[1] : "";
}

export function pubmedUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

/** `n=12; 2019 Oncol Lett: Title` → `{ count: 12, citation: "2019 Oncol Lett: Title" }`. */
export function parseNote(note: string): { count: number | null; citation: string } {
  const m = /^n=(\d+);\s*([\s\S]*)$/.exec(note ?? "");
  if (!m) return { count: null, citation: note ?? "" };
  return { count: parseInt(m[1], 10), citation: m[2] };
}

/** Rows and verdicts carry the rank as a number or a string; compare as text. */
export function tripletId(row: { id: number | string }): string {
  return String(row.id);
}

export function armsSupported(row: VerificationRow): number {
  const n = Number(row.arms_supported);
  return Number.isFinite(n) ? n : 0;
}

export function isSamePaperHit(row: VerificationRow): boolean {
  return row.same_paper_hit === 1 || row.same_paper_hit === "1";
}

export function isVariantBridge(row: VerificationRow): boolean {
  return row.bridge_is_variant === true || /^(1|true)$/i.test(String(row.bridge_is_variant));
}

export function formatRowScore(value: number | string): string {
  if (value === "" || value === null || value === undefined) return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(3) : String(value);
}

/** Key matching a verification row to one bridge of a `NetworkPair`. */
export function tripletKey(geneId: string, mirnaNode: string, lncrnaId: string): string {
  return `${geneId}\u0000${mirnaNode}\u0000${lncrnaId}`;
}

export function rowsByTripletKey(result: VerificationResult): Map<string, VerificationRow> {
  return new Map(result.rows.map((r) => [tripletKey(r.gene_id, r.mirna_node, r.lncrna_id), r]));
}

/** Literature summary of one ceRNA pair across its bridge miRNAs, for the
 *  network table's Literature column. */
export interface PairLiterature {
  /** Best triplet tier over the pair's bridges. */
  bestTier: TripletTier;
  /** Some bridge of this pair has a record naming all three symbols. */
  samePaper: boolean;
  /** Some verdict on this pair is `reported_interaction`. */
  reported: boolean;
  /** Some verdict on this pair is `opposite_arm`. */
  oppositeArm: boolean;
  /** Triplet ids of the pair, in rank order. */
  rowIds: string[];
}

export function verdictsByTriplet(result: VerificationResult): Map<string, VerificationVerdict[]> {
  const out = new Map<string, VerificationVerdict[]>();
  for (const v of result.review?.verdicts ?? []) {
    const id = tripletId(v);
    const list = out.get(id);
    if (list) list.push(v);
    else out.set(id, [v]);
  }
  return out;
}

export function rowsByTriplet(result: VerificationResult): Map<string, VerificationRow> {
  return new Map(result.rows.map((r) => [tripletId(r), r]));
}

export function indexByPair(result: VerificationResult): Map<string, PairLiterature> {
  const verdicts = verdictsByTriplet(result);
  const out = new Map<string, PairLiterature>();
  for (const row of result.rows) {
    const key = pairKey(row.gene_id, row.lncrna_id);
    const entry: PairLiterature = out.get(key) ?? {
      bestTier: "none",
      samePaper: false,
      reported: false,
      oppositeArm: false,
      rowIds: [],
    };
    if (tripletTierRank(row.triplet_tier) > tripletTierRank(entry.bestTier)) {
      entry.bestTier = row.triplet_tier;
    }
    entry.samePaper = entry.samePaper || isSamePaperHit(row);
    for (const v of verdicts.get(tripletId(row)) ?? []) {
      if (v.verdict === "reported_interaction") entry.reported = true;
      if (v.verdict === "opposite_arm") entry.oppositeArm = true;
    }
    entry.rowIds.push(tripletId(row));
    out.set(key, entry);
  }
  return out;
}

/** Edge ids of the triplets a reader would want to see on the graph: a
 *  same-paper record, or a verdict that the interaction is reported. */
export function supportedEdgeIds(result: VerificationResult): Set<string> {
  const verdicts = verdictsByTriplet(result);
  const out = new Set<string>();
  for (const row of result.rows) {
    const reported = (verdicts.get(tripletId(row)) ?? []).some(
      (v) => v.verdict === "reported_interaction",
    );
    if (!isSamePaperHit(row) && !reported) continue;
    out.add(geneEdgeId(row.gene_id, row.mirna_node));
    out.add(lncrnaEdgeId(row.mirna_node, row.lncrna_id));
  }
  return out;
}

/** True when the tissue value is a raw PubMed boolean rather than a preset. */
export function isCustomTissue(value: string, presets: string[]): boolean {
  const v = value.trim().toLowerCase();
  return v !== "none" && !presets.includes(v);
}

export function looksLikePubmedBoolean(value: string): boolean {
  return value.includes("[") && value.includes("]");
}
