"use client";

import { useMemo } from "react";

import { resolvePrecursor, type MirnaRecord } from "@/lib/mirnaData";
import type { ModificationInput } from "@/lib/operation";
import { buildCaretLine, parseShiftInt, resolveShiftedMature } from "@/lib/shift";

interface PrecursorPreviewProps {
  record: MirnaRecord | null;
  /** Shift fields; empty strings render the WT (unshifted) mature window. */
  shiftLeft: string;
  shiftRight: string;
  title?: string;
}

/** Precursor sequence with the (optionally shifted) mature window highlighted
 *  and a caret line beneath it. Shared by the single-miRNA Operation step and
 *  the mir-network variant editor. */
export function PrecursorPreview({
  record,
  shiftLeft,
  shiftRight,
  title = "Extended precursor sequence reference",
}: PrecursorPreviewProps) {
  const view = useMemo(() => {
    if (!record) return null;
    const rp = resolvePrecursor(record);
    const length = rp.seq.length;
    const left = parseShiftInt(shiftLeft) ?? 0;
    const right = parseShiftInt(shiftRight) ?? 0;
    const clampedStart = Math.min(Math.max(1, rp.matureStart + left), length);
    const clampedEnd = Math.min(Math.max(1, rp.matureEnd + right), length);
    const highlightStart = Math.min(clampedStart, clampedEnd);
    const highlightEnd = clampedStart >= clampedEnd ? clampedStart : clampedEnd;
    return {
      prefix: rp.seq.slice(0, highlightStart - 1),
      mature: rp.seq.slice(highlightStart - 1, highlightEnd),
      suffix: rp.seq.slice(highlightEnd),
      caretLine: buildCaretLine(length, clampedStart, clampedEnd),
    };
  }, [record, shiftLeft, shiftRight]);

  if (!view) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-zinc-800">
        {view.prefix}
        <span className="rounded bg-emerald-100/80 px-0.5 font-extrabold text-emerald-900">
          {view.mature}
        </span>
        {view.suffix}
        {"\n"}
        {view.caretLine}
      </pre>
    </div>
  );
}

interface VariantMaturePreviewProps {
  record: MirnaRecord | null;
  shiftLeft: string;
  shiftRight: string;
  rows: ModificationInput[];
}

/** Compact "resulting mature sequence" for one variant: the mature sequence
 *  after the shift, with each modified position shown as its replacement base
 *  and highlighted. Gives the mir-network variant editor the sequence
 *  visibility the single-miRNA shift step already has. */
export function VariantMaturePreview({
  record,
  shiftLeft,
  shiftRight,
  rows,
}: VariantMaturePreviewProps) {
  const shifted = resolveShiftedMature(record, shiftLeft, shiftRight);
  const shiftFullyTyped = shiftLeft.trim() !== "" && shiftRight.trim() !== "";

  if (!record) return null;

  // A fully-typed but out-of-range shift yields no sequence; show a muted note
  // rather than the WT sequence, which would misrepresent the variant.
  if (shiftFullyTyped && !shifted) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-2 text-xs text-zinc-500">
        Resulting sequence unavailable — shift is out of range.
      </div>
    );
  }

  const baseSeq = shifted?.seq ?? record.mature_seq ?? "";

  // index -> replacement base, for valid modification rows only (position in
  // range and replacement differing from the current base).
  const mods = new Map<number, string>();
  for (const row of rows) {
    const trimmed = row.position.trim();
    if (!/^\d+$/.test(trimmed) || !row.replacement) continue;
    const idx = parseInt(trimmed, 10) - 1;
    if (idx < 0 || idx >= baseSeq.length) continue;
    if (row.replacement === baseSeq[idx]?.toUpperCase()) continue;
    mods.set(idx, row.replacement);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-2">
      <p className="text-xs font-medium text-zinc-700">
        Resulting mature sequence{" "}
        <span className="text-zinc-500">
          {shifted ? `(${shifted.start}–${shifted.end})` : "(WT)"} · {baseSeq.length} nt
        </span>
      </p>
      <pre className="mt-1 overflow-x-auto text-xs leading-5">
        {baseSeq.split("").map((char, i) => {
          const replacement = mods.get(i);
          return replacement ? (
            <span
              key={i}
              title={`pos ${i + 1}: ${char}→${replacement}`}
              className="rounded bg-amber-200/80 px-px font-bold text-amber-900"
            >
              {replacement}
            </span>
          ) : (
            <span key={i} className="text-zinc-800">
              {char}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
