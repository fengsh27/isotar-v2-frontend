"use client";

import { Chip, Progress } from "@heroui/react";

import type { ToolProgressStatus } from "@/lib/types";
import { formatDuration, type ProgressSummary, type ToolRow } from "@/lib/toolProgress";

function formatUnix(ts: number | null): string {
  if (ts === null) return "-";
  return new Date(ts * 1000).toLocaleString();
}

const TOOL_STATUS_COLOR: Record<
  ToolProgressStatus,
  "default" | "primary" | "success" | "danger"
> = {
  pending: "default",
  running: "primary",
  done: "success",
  failed: "danger",
};

interface Props {
  rows: ToolRow[];
  summary: ProgressSummary;
}

export function JobProgress({ rows, summary }: Props) {
  if (!rows.length) return null;

  const { total, completed, current } = summary;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white/80 p-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-zinc-900">
            Predicting: <span className="text-zinc-600">{current}</span>
          </p>
          <span className="text-xs text-zinc-500">
            {completed}/{total} tools
          </span>
        </div>
        <Progress
          aria-label="Tool prediction progress"
          value={percent}
          showValueLabel
          color="primary"
        />
      </div>

      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="pb-1 pr-4 font-semibold uppercase tracking-wide">Tool</th>
            <th className="pb-1 pr-4 font-semibold uppercase tracking-wide">Status</th>
            <th className="pb-1 pr-4 font-semibold uppercase tracking-wide">Started</th>
            <th className="pb-1 pr-4 font-semibold uppercase tracking-wide">Finished</th>
            <th className="pb-1 font-semibold uppercase tracking-wide">Time costed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-zinc-100 last:border-0">
              <td className="py-1.5 pr-4 font-medium text-zinc-700">{row.name}</td>
              <td className="py-1.5 pr-4">
                <Chip
                  size="sm"
                  variant="flat"
                  color={TOOL_STATUS_COLOR[row.status]}
                  className="capitalize"
                >
                  {row.status}
                </Chip>
              </td>
              <td className="py-1.5 pr-4 text-zinc-600">{formatUnix(row.started_at)}</td>
              <td className="py-1.5 pr-4 text-zinc-600">{formatUnix(row.finished_at)}</td>
              <td className="py-1.5 tabular-nums text-zinc-700">
                {formatDuration(row)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
