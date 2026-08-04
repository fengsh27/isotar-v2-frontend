import type { NetworkPairInput } from "@/lib/types";

/** A pairs-textarea line that couldn't be parsed as a valid triple. Surfaced
 *  in the UI so bad data isn't silently dropped from submission. */
export interface MalformedPair {
  /** 1-based line number in the original textarea input. */
  line: number;
  /** Trimmed raw line text, for user context. */
  raw: string;
  reason: "missing_fields" | "invalid_score";
}

export interface ParsedPairs {
  pairs: NetworkPairInput[];
  malformed: MalformedPair[];
}

/** Parse a pasted pairs block: one "GENE<sep>LNCRNA<sep>SCORE" per line
 *  (tab/comma/space separated). Blank lines and a leading header row
 *  (`gene lncrna [score]`) are tolerated. Score is required — the backend
 *  rejects the payload if any pair omits it or if it isn't a finite number. */
export function parsePairs(text: string): ParsedPairs {
  const pairs: NetworkPairInput[] = [];
  const malformed: MalformedPair[] = [];
  const rawLines = text.split(/\r?\n/);
  let sawFirstDataLine = false;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx].trim();
    if (!line) continue;
    const parts = line.split(/[\t,]|\s{1,}/).filter(Boolean);

    // Header tolerance: only for the very first non-blank line, matching
    // `gene lncrna` or `gene lncrna score` case-insensitively.
    if (
      !sawFirstDataLine &&
      parts.length >= 2 &&
      /^gene$/i.test(parts[0]) &&
      /^lncrna$/i.test(parts[1]) &&
      (parts.length < 3 || /^score$/i.test(parts[2]))
    ) {
      sawFirstDataLine = true;
      continue;
    }
    sawFirstDataLine = true;

    if (parts.length < 3) {
      malformed.push({ line: idx + 1, raw: line, reason: "missing_fields" });
      continue;
    }
    const gene = parts[0].trim();
    const lncrna = parts[1].trim();
    const scoreStr = parts[2].trim();
    if (!gene || !lncrna) {
      malformed.push({ line: idx + 1, raw: line, reason: "missing_fields" });
      continue;
    }
    // Number() rejects "" (→ 0) which is fine here — parts is already filtered
    // for empties. `Number.isFinite` weeds out NaN and ±Infinity, matching the
    // backend's `int|float` (bool excluded) rule.
    const score = Number(scoreStr);
    if (!Number.isFinite(score)) {
      malformed.push({ line: idx + 1, raw: line, reason: "invalid_score" });
      continue;
    }
    pairs.push({ gene, lncrna, score });
  }
  return { pairs, malformed };
}
