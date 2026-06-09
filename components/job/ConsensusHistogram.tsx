"use client";

import type { VennData } from "@/lib/types";
import { cumulativeAtLeast, deriveDegrees } from "@/lib/venn";

interface Props {
  venn: VennData;
}

/**
 * Consensus summary: how many targets are predicted by ≥k of the tools.
 * Higher agreement → higher-confidence targets. Shown for 4+ tools, where a
 * literal Venn diagram is unreadable.
 */
export function ConsensusHistogram({ venn }: Props) {
  const toolCount = Object.keys(venn.sets).length;
  const degrees = deriveDegrees(venn);
  const atLeast = cumulativeAtLeast(degrees, toolCount); // index 0 → ≥1 tool
  const max = Math.max(1, ...atLeast);

  // Nothing to derive (backend sent neither degrees nor combinations).
  if (!atLeast.some((n) => n > 0)) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Consensus — targets by tool agreement
      </p>

      <div className="space-y-1.5">
        {atLeast.map((count, i) => {
          const k = i + 1;
          const pct = (count / max) * 100;
          return (
            <div key={k} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-right text-xs text-zinc-600">
                {k === toolCount ? `all ${k}` : `≥ ${k}`} tool{k !== 1 ? "s" : ""}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-zinc-100">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-teal-500/80"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-xs font-medium text-zinc-700">
                {count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500">
        Counts targets predicted by at least <em>k</em> of the {toolCount} tools — a
        quick read on cross-tool agreement.
      </p>
    </div>
  );
}
