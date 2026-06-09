"use client";

import type { VennData, VennCombination } from "@/lib/types";
import { colorForIndex } from "@/lib/venn";

interface Props {
  venn: VennData;
}

// Layout constants (px).
const MAX_COLS = 20; // cap visible intersections — keeps the plot readable
const BAR_AREA_H = 130;
const BAR_MAX_H = BAR_AREA_H - 18; // leave headroom for the count label
const DOT_ROW_H = 28;
const COL_W = 38;

/**
 * UpSet plot for 4+ tools, where a circle Venn breaks down.
 *  - Top: a bar per intersection, height ∝ number of targets in that exact combo.
 *  - Bottom: a dot matrix showing which tools each intersection belongs to.
 * Reads the exclusive `combinations` from VennData (caller guarantees presence).
 */
export function UpSetPlot({ venn }: Props) {
  // Tools ordered by total predictions (most prolific on top), keeping a stable
  // color index by original key order so it matches the legend.
  const colorByTool = new Map(
    Object.keys(venn.sets).map((name, i) => [name, colorForIndex(i)] as const),
  );
  const tools = Object.keys(venn.sets).sort(
    (a, b) => (venn.sets[b] ?? 0) - (venn.sets[a] ?? 0),
  );

  const all: VennCombination[] = venn.combinations ?? [];
  const sorted = [...all].sort((a, b) => b.size - a.size);
  const cols = sorted.slice(0, MAX_COLS);
  const hidden = sorted.length - cols.length;
  const maxSize = Math.max(1, ...cols.map((c) => c.size));

  const matrixH = tools.length * DOT_ROW_H;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Tool overlap (UpSet)
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="flex w-max">
          {/* Left axis: tool labels aligned to the matrix rows */}
          <div className="shrink-0 pr-3">
            <div style={{ height: BAR_AREA_H }} />
            {tools.map((tool) => (
              <div
                key={tool}
                className="flex items-center justify-end gap-1.5"
                style={{ height: DOT_ROW_H }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colorByTool.get(tool) }}
                />
                <span className="text-xs text-zinc-700">{tool}</span>
                <span className="text-[10px] text-zinc-400">
                  ({(venn.sets[tool] ?? 0).toLocaleString()})
                </span>
              </div>
            ))}
          </div>

          {/* One column per intersection: bar on top, dot matrix below */}
          <div className="flex">
            {cols.map((combo, ci) => {
              const filledIdx = tools
                .map((t, i) => (combo.tools.includes(t) ? i : -1))
                .filter((i) => i >= 0);
              const first = filledIdx.length ? Math.min(...filledIdx) : 0;
              const last = filledIdx.length ? Math.max(...filledIdx) : 0;
              const barH = (combo.size / maxSize) * BAR_MAX_H;
              const label = combo.tools.join(" ∩ ");

              return (
                <div
                  key={ci}
                  className="group flex flex-col items-center"
                  style={{ width: COL_W }}
                  title={`${label}: ${combo.size.toLocaleString()} targets`}
                >
                  {/* Bar */}
                  <div
                    className="flex w-full flex-col items-center justify-end"
                    style={{ height: BAR_AREA_H }}
                  >
                    <span className="mb-0.5 text-[10px] tabular-nums text-zinc-600">
                      {combo.size.toLocaleString()}
                    </span>
                    <div
                      className="w-5 rounded-t bg-zinc-700 transition-colors group-hover:bg-teal-600"
                      style={{ height: Math.max(2, barH) }}
                    />
                  </div>

                  {/* Dot matrix column */}
                  <div
                    className="relative w-full"
                    style={{ height: matrixH }}
                  >
                    {filledIdx.length > 1 ? (
                      <div
                        className="absolute left-1/2 w-0.5 -translate-x-1/2 bg-zinc-400"
                        style={{
                          top: first * DOT_ROW_H + DOT_ROW_H / 2,
                          height: (last - first) * DOT_ROW_H,
                        }}
                      />
                    ) : null}
                    {tools.map((tool) => {
                      const on = combo.tools.includes(tool);
                      return (
                        <div
                          key={tool}
                          className="flex items-center justify-center"
                          style={{ height: DOT_ROW_H }}
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: on
                                ? colorByTool.get(tool)
                                : "#e4e4e7",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hidden > 0 ? (
        <p className="text-xs text-zinc-500">
          Showing the {cols.length} largest of {sorted.length} intersections
          ({hidden} smaller {hidden === 1 ? "combination" : "combinations"} hidden).
        </p>
      ) : null}
    </div>
  );
}
