import { BASE_OPTIONS, type NucleotideBase } from "@/lib/operation";
import { resolvePrecursor, type MirnaRecord } from "@/lib/mirnaData";

/** Parse a shift field to an integer, or null when empty / not an integer. */
export function parseShiftInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

export interface ShiftedMature {
  seq: string;
  start: number;
  end: number;
  length: number;
}

/** Shifted mature sequence for a variant, mirroring backend `apply_shift`
 *  semantics. Empty shift fields are treated as 0 (WT boundaries). Returns null
 *  when the resulting boundaries fall outside the precursor (an invalid shift),
 *  so callers can both validate and avoid showing a wrong sequence.
 *
 *  Shared by the single-miRNA Operation step and the mir-network variant editor
 *  so the two cannot drift from each other or from the backend. */
export function resolveShiftedMature(
  record: MirnaRecord | null,
  shiftLeft: string,
  shiftRight: string,
): ShiftedMature | null {
  if (!record) return null;
  const rp = resolvePrecursor(record);
  const left = parseShiftInt(shiftLeft) ?? 0;
  const right = parseShiftInt(shiftRight) ?? 0;
  const start = rp.matureStart + left;
  const end = rp.matureEnd + right;
  if (start < 1 || end > rp.seq.length || end < start) return null;
  const seq = rp.seq.slice(start - 1, end);
  return { seq, start, end, length: seq.length };
}

/** Uppercased nucleotide at a 1-based position, or "" when the position is not
 *  a valid in-range base. */
export function baseAtPosition(seq: string, position: string): NucleotideBase | "" {
  const trimmed = position.trim();
  if (!/^\d+$/.test(trimmed)) return "";
  const idx = parseInt(trimmed, 10) - 1;
  if (idx < 0 || idx >= seq.length) return "";
  const base = seq[idx]?.toUpperCase() ?? "";
  return (BASE_OPTIONS as readonly string[]).includes(base)
    ? (base as NucleotideBase)
    : "";
}

/** A caret line marking the [start, end] window (1-based, clamped to length)
 *  beneath a sequence — one caret when the window collapses to a point. */
export function buildCaretLine(length: number, start: number, end: number): string {
  const safeStart = Math.min(Math.max(1, start), length);
  const safeEnd = Math.min(Math.max(1, end), length);
  if (safeStart >= safeEnd) {
    return `${" ".repeat(safeStart - 1)}^`;
  }
  return `${" ".repeat(safeStart - 1)}^${" ".repeat(safeEnd - safeStart - 1)}^`;
}
