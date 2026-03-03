"use client";

import { Progress } from "@heroui/react";

import type { JobRecord } from "@/lib/types";

function fallbackPercent(status: JobRecord["status"]): number {
  if (status === "queued") return 10;
  if (status === "running") return 55;
  if (status === "completed") return 100;
  return 0;
}

export function JobProgress({ job }: { job: JobRecord }) {
  const percent =
    typeof job.progress?.percent === "number"
      ? Math.max(0, Math.min(100, job.progress.percent))
      : fallbackPercent(job.status);

  const description =
    job.progress?.message ??
    (job.status === "queued"
      ? "Job is queued for execution."
      : job.status === "running"
        ? "Job is running."
        : job.status === "completed"
          ? "Job execution completed."
          : "No active execution progress.");

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white/80 p-4">
      <p className="text-sm font-medium text-zinc-900">Execution Progress</p>
      <Progress aria-label="Job progress" value={percent} showValueLabel color="primary" />
      <p className="text-xs text-zinc-600">{description}</p>
    </div>
  );
}
