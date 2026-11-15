"use client";

import { Button } from "@heroui/react";

import type { SequenceInfo } from "@/lib/types";

export interface CompareSelection {
  wt: string;
  variant: string;
}

interface Props {
  sequences: SequenceInfo[];
  /** Record ids currently shown; `null` means the backend default (the WT records). */
  selected: string[] | null;
  compare: CompareSelection | null;
  onSelect: (sequences: string[] | null) => void;
  onCompare: (compare: CompareSelection | null) => void;
}

/**
 * Picks which of a job's miRNA records the results show. A job with a shift
 * or modification runs the wild type and each variant as separate records and
 * the backend never merges their predictions, so the table, the Venn/UpSet
 * plots and the enrichment input always describe one real sequence. Each
 * variant also offers a comparison against its wild type.
 */
export function SequenceSelector({ sequences, selected, compare, onSelect, onCompare }: Props) {
  // Group by miRNA, WT first (the backend already orders them that way).
  const groups = new Map<string, SequenceInfo[]>();
  for (const s of sequences) {
    const list = groups.get(s.base_id) ?? [];
    list.push(s);
    groups.set(s.base_id, list);
  }
  const wtIds = sequences.filter((s) => !s.is_variant).map((s) => s.sequence);
  const shown = new Set(selected ?? wtIds);

  function isActive(s: SequenceInfo): boolean {
    return compare === null && shown.has(s.sequence);
  }

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white/80 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Sequence
        </p>
        <p className="text-xs text-zinc-500">
          The wild type and each variant are predicted separately and never merged.
        </p>
      </div>

      {Array.from(groups.entries()).map(([baseId, records]) => {
        const wt = records.find((r) => !r.is_variant);
        return (
          <div key={baseId} className="flex flex-wrap items-center gap-2">
            {groups.size > 1 ? (
              <span className="mr-1 font-mono text-xs text-zinc-500">{baseId}</span>
            ) : null}
            {records.map((r) => (
              <span key={r.sequence} className="inline-flex items-center gap-1">
                <Button
                  size="sm"
                  radius="full"
                  color={isActive(r) ? "primary" : "default"}
                  variant={isActive(r) ? "solid" : "bordered"}
                  title={`${r.header}\n${r.seq}`}
                  onPress={() => {
                    onCompare(null);
                    onSelect(r.is_variant ? [r.sequence] : null);
                  }}
                >
                  <span className="font-mono text-xs">{r.variant}</span>
                </Button>
                {r.is_variant && wt ? (
                  <Button
                    size="sm"
                    radius="full"
                    color={
                      compare?.variant === r.sequence && compare.wt === wt.sequence
                        ? "primary"
                        : "default"
                    }
                    variant={
                      compare?.variant === r.sequence && compare.wt === wt.sequence
                        ? "solid"
                        : "light"
                    }
                    title={`Compare ${r.label} against the wild type`}
                    onPress={() => onCompare({ wt: wt.sequence, variant: r.sequence })}
                  >
                    <span className="text-xs">vs WT</span>
                  </Button>
                ) : null}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
