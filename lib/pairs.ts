import type { NetworkPairInput, PairCorrelations } from "@/lib/types";

/** The three correlation columns, in the order they appear on a pasted line. */
export const CORR_COLUMNS = [
  "mirna_gene",
  "mirna_lncrna",
  "gene_lncrna",
] as const;

export type CorrKey = (typeof CORR_COLUMNS)[number];

export const CORR_LABELS: Record<CorrKey, string> = {
  mirna_gene: "corr(miRNA, gene)",
  mirna_lncrna: "corr(miRNA, lncRNA)",
  gene_lncrna: "corr(gene, lncRNA)",
};

/** Value used for a correlation the user left blank. 1 is the multiplicative
 *  identity, so an unsupplied column leaves the score to the remaining
 *  evidence instead of zeroing it. Mirrors the backend's DEFAULT_CORR. */
export const DEFAULT_CORR = 1;

/** A pairs-textarea line that couldn't be parsed. Surfaced in the UI so bad
 *  data isn't silently dropped from submission. */
export interface MalformedPair {
  /** 1-based line number in the original textarea input. */
  line: number;
  /** Trimmed raw line text, for user context. */
  raw: string;
  reason:
    | "missing_fields"
    | "too_many_fields"
    | "invalid_score"
    | "out_of_range";
  /** Which correlation column triggered a score reason, for the message. */
  column?: CorrKey;
}

/** One successfully parsed line, with enough provenance for the preview table
 *  to show what will actually be submitted and why. */
export interface ParsedPair {
  line: number;
  gene: string;
  lncrna: string;
  /** Only the correlations the user supplied — blanks are omitted so the
   *  backend can record them as defaulted rather than seeing an assumed 1. */
  corr: PairCorrelations;
  /** Columns left blank, which will score as DEFAULT_CORR. */
  defaulted: CorrKey[];
  /** Columns given as a negative number and read as a magnitude. */
  negated: CorrKey[];
}

export interface ParsedPairs {
  pairs: ParsedPair[];
  malformed: MalformedPair[];
}

/** Split one line into up to 5 positional fields.
 *
 *  A blank correlation only exists if the delimiter is explicit, so a line
 *  containing a comma or tab is split on those alone — collapsing runs of
 *  whitespace there would silently shift `TP53, ENST…, , 0.87, 1` left by a
 *  column. A line with neither is split on whitespace, where an empty field
 *  cannot be expressed in the first place. */
function splitFields(line: string): string[] {
  if (/[,\t]/.test(line)) {
    return line.split(/[,\t]/).map((field) => field.trim());
  }
  return line.trim().split(/\s+/).map((field) => field.trim());
}

function isHeaderRow(fields: string[]): boolean {
  return (
    fields.length >= 2 &&
    /^gene$/i.test(fields[0]) &&
    /^lncrna$/i.test(fields[1])
  );
}

/** Parse a pasted pairs block: one
 *  `GENE,LNCRNA,CORR(miRNA-gene),CORR(miRNA-lncRNA),CORR(gene-lncRNA)` per
 *  line. Only the first two columns are required; any correlation may be left
 *  empty (`TP53, ENST00000610542, , 0.87, 1`) and defaults to DEFAULT_CORR.
 *
 *  Correlations are magnitudes: a negative is read as `abs(x)` and reported in
 *  `negated` so the preview can show the conversion rather than silently
 *  rewriting the user's input. A magnitude above 1 is a data error and fails
 *  the line — clamping it would let a broken row outrank a sound one.
 *
 *  Blank lines and a leading header row are tolerated. */
export function parsePairs(text: string): ParsedPairs {
  const pairs: ParsedPair[] = [];
  const malformed: MalformedPair[] = [];
  const rawLines = text.split(/\r?\n/);
  let sawFirstDataLine = false;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx].trim();
    if (!line) continue;
    const lineNumber = idx + 1;
    const fields = splitFields(line);

    // Header tolerance: only for the very first non-blank line.
    if (!sawFirstDataLine && isHeaderRow(fields)) {
      sawFirstDataLine = true;
      continue;
    }
    sawFirstDataLine = true;

    if (fields.length > 2 + CORR_COLUMNS.length) {
      malformed.push({ line: lineNumber, raw: line, reason: "too_many_fields" });
      continue;
    }
    const gene = fields[0] ?? "";
    const lncrna = fields[1] ?? "";
    if (!gene || !lncrna) {
      malformed.push({ line: lineNumber, raw: line, reason: "missing_fields" });
      continue;
    }

    const corr: PairCorrelations = {};
    const defaulted: CorrKey[] = [];
    const negated: CorrKey[] = [];
    let failed: MalformedPair | null = null;

    CORR_COLUMNS.forEach((key, offset) => {
      if (failed) return;
      const raw = fields[2 + offset] ?? "";
      if (!raw) {
        defaulted.push(key);
        return;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        failed = {
          line: lineNumber,
          raw: line,
          reason: "invalid_score",
          column: key,
        };
        return;
      }
      if (Math.abs(value) > 1) {
        failed = {
          line: lineNumber,
          raw: line,
          reason: "out_of_range",
          column: key,
        };
        return;
      }
      if (value < 0) negated.push(key);
      corr[key] = Math.abs(value);
    });

    if (failed) {
      malformed.push(failed);
      continue;
    }
    pairs.push({ line: lineNumber, gene, lncrna, corr, defaulted, negated });
  }
  return { pairs, malformed };
}

/** The value a correlation will actually score with — the user's magnitude, or
 *  DEFAULT_CORR when they left it blank. */
export function effectiveCorr(pair: ParsedPair, key: CorrKey): number {
  return pair.corr[key] ?? DEFAULT_CORR;
}

/** Strip the UI-only provenance fields down to the submitted shape. Blank
 *  correlations stay absent so the backend records them in `corr_defaulted`. */
export function toPairPayload(pair: ParsedPair): NetworkPairInput {
  const payload: NetworkPairInput = { gene: pair.gene, lncrna: pair.lncrna };
  if (Object.keys(pair.corr).length) payload.corr = { ...pair.corr };
  return payload;
}
