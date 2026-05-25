// Shared helpers for the results-page overlap views (circle Venn, UpSet, consensus).

import type { VennData } from "@/lib/types";

// Palette large enough for 6+ tools; index wraps for safety.
export const VENN_COLORS = [
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#0ea5e9", // sky
  "#ec4899", // pink
  "#10b981", // emerald
];

export function colorForIndex(i: number): string {
  return VENN_COLORS[i % VENN_COLORS.length];
}

/**
 * Consensus distribution keyed by degree: how many targets are predicted by
 * *exactly* k tools. Prefers the backend-supplied `degrees`; otherwise derives
 * it from the exclusive `combinations` by grouping on how many tools each spans.
 */
export function deriveDegrees(venn: VennData): Record<number, number> {
  const out: Record<number, number> = {};

  if (venn.degrees) {
    for (const [k, v] of Object.entries(venn.degrees)) {
      const n = Number(k);
      if (Number.isFinite(n) && n > 0) out[n] = (out[n] ?? 0) + v;
    }
    return out;
  }

  if (venn.combinations) {
    for (const combo of venn.combinations) {
      const k = combo.tools.length;
      if (k > 0) out[k] = (out[k] ?? 0) + combo.size;
    }
  }

  return out;
}

/** Cumulative "predicted by at least k tools", for k = 1..maxK (index 0 → ≥1). */
export function cumulativeAtLeast(
  degrees: Record<number, number>,
  maxK: number,
): number[] {
  const result: number[] = [];
  for (let k = 1; k <= maxK; k++) {
    let sum = 0;
    for (let j = k; j <= maxK; j++) sum += degrees[j] ?? 0;
    result.push(sum);
  }
  return result;
}
