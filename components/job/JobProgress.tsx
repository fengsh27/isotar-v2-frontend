"use client";

import { Chip, Progress } from "@heroui/react";

import type { JobRecord, ToolProgressStatus } from "@/lib/types";

function formatUnix(ts: number | null): string {
  if (ts === null) return "-";
  return new Date(ts * 1000).toLocaleString();
}

const TOOL_STATUS_COLOR: Record<
  ToolProgressStatus,
  "default" | "primary" | "success"
> = {
  pending: "default",
  running: "primary",
  done: "success",
};

export function JobProgress({ job }: { job: JobRecord }) {
  const { progress } = job;
  if (!progress) return null;

  const { total_tools, completed_tools, current_tool, tools_status } = progress;
  const percent = total_tools > 0 ? Math.round((completed_tools / total_tools) * 100) : 0;

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white/80 p-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-zinc-900">
            Predicting: <span className="text-zinc-600">{current_tool}</span>
          </p>
          <span className="text-xs text-zinc-500">
            {completed_tools}/{total_tools} tools
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
            <th className="pb-1 font-semibold uppercase tracking-wide">Finished</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(tools_status).map(([tool, info]) => (
            <tr key={tool} className="border-b border-zinc-100 last:border-0">
              <td className="py-1.5 pr-4 font-medium text-zinc-700">{tool}</td>
              <td className="py-1.5 pr-4">
                <Chip
                  size="sm"
                  variant="flat"
                  color={TOOL_STATUS_COLOR[info.status]}
                  className="capitalize"
                >
                  {info.status}
                </Chip>
              </td>
              <td className="py-1.5 pr-4 text-zinc-600">{formatUnix(info.started_at)}</td>
              <td className="py-1.5 text-zinc-600">{formatUnix(info.finished_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
