"use client";

import type { VennData } from "@/lib/types";

interface Props {
  venn: VennData;
}

const COLORS = ["#14b8a6", "#6366f1", "#f59e0b"];

// ── helpers ────────────────────────────────────────────────────────────────

function getInt(ints: Record<string, number>, a: string, b: string): number {
  return ints[`${a}&${b}`] ?? ints[`${b}&${a}`] ?? 0;
}

function getTriple(
  ints: Record<string, number>,
  a: string,
  b: string,
  c: string,
): number {
  const keys = [
    `${a}&${b}&${c}`, `${a}&${c}&${b}`,
    `${b}&${a}&${c}`, `${b}&${c}&${a}`,
    `${c}&${a}&${b}`, `${c}&${b}&${a}`,
  ];
  for (const k of keys) if (ints[k] !== undefined) return ints[k];
  return 0;
}

function fmt(n: number): string {
  return n < 0 ? "0" : n.toLocaleString();
}

// ── 2-set layout ──────────────────────────────────────────────────────────

function Venn2({ sets, ints }: { sets: string[]; ints: Record<string, number> }) {
  const [a, b] = sets;
  const ab = getInt(ints, a, b);
  const aOnly = (ints[a] ?? 0) - ab;  // sets stored by name in original data
  const bOnly = (ints[b] ?? 0) - ab;

  // circles: slight overlap at cx=175 and cx=325, r=130
  return (
    <svg viewBox="0 0 500 320" className="w-full max-w-lg mx-auto select-none">
      <circle cx={175} cy={160} r={130} fill={COLORS[0]} fillOpacity={0.3} stroke={COLORS[0]} strokeWidth={1.5} />
      <circle cx={325} cy={160} r={130} fill={COLORS[1]} fillOpacity={0.3} stroke={COLORS[1]} strokeWidth={1.5} />

      {/* set labels */}
      <text x={105} y={40} textAnchor="middle" className="text-sm font-semibold" fill={COLORS[0]} fontSize={14} fontWeight={600}>{a}</text>
      <text x={395} y={40} textAnchor="middle" fill={COLORS[1]} fontSize={14} fontWeight={600}>{b}</text>

      {/* region counts */}
      <text x={110} y={165} textAnchor="middle" fill="#374151" fontSize={15} fontWeight={700}>{fmt(aOnly)}</text>
      <text x={390} y={165} textAnchor="middle" fill="#374151" fontSize={15} fontWeight={700}>{fmt(bOnly)}</text>
      <text x={250} y={165} textAnchor="middle" fill="#374151" fontSize={15} fontWeight={700}>{fmt(ab)}</text>

      {/* total labels below */}
      <text x={110} y={185} textAnchor="middle" fill="#6b7280" fontSize={11}>only</text>
      <text x={390} y={185} textAnchor="middle" fill="#6b7280" fontSize={11}>only</text>
      <text x={250} y={185} textAnchor="middle" fill="#6b7280" fontSize={11}>shared</text>
    </svg>
  );
}

// ── 3-set layout ──────────────────────────────────────────────────────────

function Venn3({ sets, ints }: { sets: string[]; ints: Record<string, number> }) {
  const [a, b, c] = sets;
  const sA = ints[a] ?? 0;
  const sB = ints[b] ?? 0;
  const sC = ints[c] ?? 0;

  const ab = getInt(ints, a, b);
  const ac = getInt(ints, a, c);
  const bc = getInt(ints, b, c);
  const abc = getTriple(ints, a, b, c);

  const aOnly = sA - ab - ac + abc;
  const bOnly = sB - ab - bc + abc;
  const cOnly = sC - ac - bc + abc;
  const abOnly = ab - abc;
  const acOnly = ac - abc;
  const bcOnly = bc - abc;

  // three circles in triangle arrangement
  // A: top-left (185,175) B: top-right (315,175) C: bottom-center (250,295) r=115
  return (
    <svg viewBox="0 0 500 430" className="w-full max-w-lg mx-auto select-none">
      <circle cx={185} cy={175} r={115} fill={COLORS[0]} fillOpacity={0.3} stroke={COLORS[0]} strokeWidth={1.5} />
      <circle cx={315} cy={175} r={115} fill={COLORS[1]} fillOpacity={0.3} stroke={COLORS[1]} strokeWidth={1.5} />
      <circle cx={250} cy={295} r={115} fill={COLORS[2]} fillOpacity={0.3} stroke={COLORS[2]} strokeWidth={1.5} />

      {/* set labels */}
      <text x={130} y={48} textAnchor="middle" fill={COLORS[0]} fontSize={13} fontWeight={600}>{a}</text>
      <text x={370} y={48} textAnchor="middle" fill={COLORS[1]} fontSize={13} fontWeight={600}>{b}</text>
      <text x={250} y={426} textAnchor="middle" fill={COLORS[2]} fontSize={13} fontWeight={600}>{c}</text>

      {/* region counts */}
      <text x={155} y={155} textAnchor="middle" fill="#374151" fontSize={13} fontWeight={700}>{fmt(aOnly)}</text>
      <text x={345} y={155} textAnchor="middle" fill="#374151" fontSize={13} fontWeight={700}>{fmt(bOnly)}</text>
      <text x={250} y={370} textAnchor="middle" fill="#374151" fontSize={13} fontWeight={700}>{fmt(cOnly)}</text>

      <text x={250} y={148} textAnchor="middle" fill="#374151" fontSize={13} fontWeight={700}>{fmt(abOnly)}</text>
      <text x={175} y={272} textAnchor="middle" fill="#374151" fontSize={13} fontWeight={700}>{fmt(acOnly)}</text>
      <text x={325} y={272} textAnchor="middle" fill="#374151" fontSize={13} fontWeight={700}>{fmt(bcOnly)}</text>

      <text x={250} y={228} textAnchor="middle" fill="#374151" fontSize={14} fontWeight={800}>{fmt(abc)}</text>
    </svg>
  );
}

// ── public component ──────────────────────────────────────────────────────

export function VennDiagram({ venn }: Props) {
  // Merge sets + intersections into one lookup for region arithmetic
  const combined: Record<string, number> = { ...venn.sets, ...venn.intersections };
  const setNames = Object.keys(venn.sets);
  const n = setNames.length;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Tool overlap (Venn diagram)
      </p>

      {n === 2 ? (
        <Venn2 sets={setNames} ints={combined} />
      ) : n === 3 ? (
        <Venn3 sets={setNames} ints={combined} />
      ) : (
        // Fallback: simple table for >3 sets
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <th className="px-4 py-2 text-left">Set / Intersection</th>
                <th className="px-4 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(venn.sets).map(([k, v]) => (
                <tr key={k} className="border-b border-zinc-100">
                  <td className="px-4 py-2 font-medium text-zinc-800">{k}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{v.toLocaleString()}</td>
                </tr>
              ))}
              {Object.entries(venn.intersections).map(([k, v]) => (
                <tr key={k} className="border-b border-zinc-100">
                  <td className="px-4 py-2 text-zinc-600">{k.replaceAll("&", " ∩ ")}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{v.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* legend */}
      <div className="flex flex-wrap gap-3">
        {setNames.map((name, i) => (
          <span key={name} className="flex items-center gap-1.5 text-xs text-zinc-700">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORS[i] ?? "#94a3b8" }}
            />
            {name}
            <span className="text-zinc-400">({venn.sets[name].toLocaleString()})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
