import { SPECIES_OPTIONS } from "@/lib/constants";

export interface MirnaRecord {
  pre_id: string;
  pre_seq: string;
  mature_seq: string;
  mature_loc_start: number;
  mature_loc_end: number;
  ext_pre_seq: string;
  ext_mature_loc_start: number;
  ext_mature_loc_end: number;
  mature_acc: string;
  pre_acc: string;
}

export type MirnaDataset = Record<string, MirnaRecord[]>;

/**
 * Per-species miRNA reference loaders.
 *
 * The mature/precursor catalog is split into one JSON file per species. Homo
 * sapiens uses the original unprefixed file; every other species uses a file
 * prefixed with its genome code (e.g. `mmu_mature_pre_mirna_ext.json`), which
 * matches the `genome` field in `SPECIES_OPTIONS`.
 *
 * Each loader is a static `import()` so the bundler can resolve and code-split
 * the (large) JSON files — a single templated dynamic import would not.
 */
const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  "9606": () => import("@/data/mature_pre_mirna_ext.json"),
  "6239": () => import("@/data/cel_mature_pre_mirna_ext.json"),
  "9615": () => import("@/data/cfa_mature_pre_mirna_ext.json"),
  "7227": () => import("@/data/dme_mature_pre_mirna_ext.json"),
  "7955": () => import("@/data/dre_mature_pre_mirna_ext.json"),
  "13616": () => import("@/data/mdo_mature_pre_mirna_ext.json"),
  "9544": () => import("@/data/mml_mature_pre_mirna_ext.json"),
  "10090": () => import("@/data/mmu_mature_pre_mirna_ext.json"),
  "9598": () => import("@/data/ptr_mature_pre_mirna_ext.json"),
  "10116": () => import("@/data/rno_mature_pre_mirna_ext.json"),
};

/** True when a miRNA reference catalog is bundled for the given species. */
export function hasMirnaDataset(species: string): boolean {
  return species in LOADERS;
}

export interface ResolvedPrecursor {
  /** The sequence to display / operate on. */
  seq: string;
  /** 1-based start of the mature region within `seq`. */
  matureStart: number;
  /** 1-based end of the mature region within `seq`. */
  matureEnd: number;
  /** Which field `seq` was taken from. */
  source: "ext_pre_seq" | "pre_seq" | "mature_seq";
}

/**
 * Resolve the precursor sequence to use for a record, with its paired mature
 * coordinates. Some species records omit `ext_pre_seq` and/or `pre_seq`, so the
 * fallback chain is: `ext_pre_seq` → `pre_seq` → `mature_seq`. The mature
 * location is paired to the chosen sequence (the extended coordinates only apply
 * to `ext_pre_seq`); for the `mature_seq` fallback the whole sequence is mature.
 */
export function resolvePrecursor(record: MirnaRecord): ResolvedPrecursor {
  if (record.ext_pre_seq?.trim()) {
    return {
      seq: record.ext_pre_seq,
      matureStart: record.ext_mature_loc_start,
      matureEnd: record.ext_mature_loc_end,
      source: "ext_pre_seq",
    };
  }
  if (record.pre_seq?.trim()) {
    return {
      seq: record.pre_seq,
      matureStart: record.mature_loc_start,
      matureEnd: record.mature_loc_end,
      source: "pre_seq",
    };
  }
  return {
    seq: record.mature_seq,
    matureStart: 1,
    matureEnd: record.mature_seq.length,
    source: "mature_seq",
  };
}

/** Display name for a species value, used in error/empty-state messaging. */
export function speciesLabel(species: string): string {
  return SPECIES_OPTIONS.find((s) => s.value === species)?.label ?? species;
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Coerce a raw record into a `MirnaRecord`. Across species files the location
 * fields are inconsistently typed (some encode `ext_mature_loc_*` as strings),
 * so the numeric fields are normalized here to keep downstream arithmetic and
 * highlighting correct regardless of source species.
 */
function normalizeRecord(raw: Record<string, unknown>): MirnaRecord {
  return {
    pre_id: String(raw.pre_id ?? ""),
    pre_seq: String(raw.pre_seq ?? ""),
    mature_seq: String(raw.mature_seq ?? ""),
    mature_loc_start: toNumber(raw.mature_loc_start),
    mature_loc_end: toNumber(raw.mature_loc_end),
    ext_pre_seq: String(raw.ext_pre_seq ?? ""),
    ext_mature_loc_start: toNumber(raw.ext_mature_loc_start),
    ext_mature_loc_end: toNumber(raw.ext_mature_loc_end),
    mature_acc: String(raw.mature_acc ?? ""),
    pre_acc: String(raw.pre_acc ?? ""),
  };
}

/**
 * Load the mature/precursor miRNA dataset for a species. Resolves to `null`
 * when no catalog is bundled for that species (caller renders an empty state).
 */
export async function loadMirnaDataset(
  species: string,
): Promise<MirnaDataset | null> {
  const loader = LOADERS[species];
  if (!loader) {
    return null;
  }

  const raw = (await loader()).default as Record<
    string,
    Record<string, unknown>[]
  >;
  const dataset: MirnaDataset = {};
  for (const [id, records] of Object.entries(raw)) {
    dataset[id] = records.map(normalizeRecord);
  }
  return dataset;
}
