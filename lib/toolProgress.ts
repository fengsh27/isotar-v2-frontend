// Per-tool prediction progress: reconcile the backend's `tools_status` (which can
// arrive as a per-poll snapshot containing only the active tool) with the full
// set of tools the user selected, so every tool stays visible with its timing.

import { TOOL_OPTIONS } from "@/lib/constants";
import type { ToolProgress, ToolProgressStatus } from "@/lib/types";

/** One accumulated tool entry; keyed case-insensitively, display name preserved. */
export interface AccToolEntry extends ToolProgress {
  display: string;
}

export type ToolStatusAcc = Record<string, AccToolEntry>;

export interface ToolRow {
  name: string;
  status: ToolProgressStatus;
  started_at: number | null;
  finished_at: number | null;
}

function toolLabelFor(value: string): string {
  const match = TOOL_OPTIONS.find(
    (option) => option.value.toLowerCase() === value.toLowerCase(),
  );
  return match?.label ?? value;
}

/**
 * Merge a poll's `tools_status` into the accumulator. Tools absent from the new
 * snapshot keep their previously seen state (so completed tools don't vanish),
 * and timestamps are never overwritten with null.
 */
export function mergeToolsStatus(
  acc: ToolStatusAcc,
  incoming: Record<string, ToolProgress> | undefined,
): ToolStatusAcc {
  if (!incoming) return acc;

  const next: ToolStatusAcc = { ...acc };
  for (const [key, info] of Object.entries(incoming)) {
    const k = key.toLowerCase();
    const prev = next[k];
    next[k] = {
      display: key, // prefer the backend's own casing
      status: info.status,
      started_at: info.started_at ?? prev?.started_at ?? null,
      finished_at: info.finished_at ?? prev?.finished_at ?? null,
    };
  }
  return next;
}

/**
 * Build one row per selected tool (preserving selection order), filling in
 * accumulated status/timing where available and "pending" otherwise. Falls back
 * to whatever the accumulator holds when the selected-tool list is unknown.
 */
export function buildToolRows(
  acc: ToolStatusAcc,
  selectedTools: string[] | undefined,
): ToolRow[] {
  if (selectedTools && selectedTools.length) {
    return selectedTools.map((tool) => {
      const entry = acc[tool.toLowerCase()];
      return {
        name: entry?.display ?? toolLabelFor(tool),
        status: entry?.status ?? "pending",
        started_at: entry?.started_at ?? null,
        finished_at: entry?.finished_at ?? null,
      };
    });
  }

  return Object.values(acc).map((entry) => ({
    name: entry.display,
    status: entry.status,
    started_at: entry.started_at,
    finished_at: entry.finished_at,
  }));
}

export interface ProgressSummary {
  total: number;
  completed: number;
  current: string;
}

/** Derive header counts from the rows so they always match the table below. */
export function summarize(rows: ToolRow[], backendCurrent?: string): ProgressSummary {
  const completed = rows.filter((row) => row.status === "done").length;
  const running = rows.find((row) => row.status === "running");
  return {
    total: rows.length,
    completed,
    current: running?.name ?? backendCurrent ?? (completed === rows.length ? "Done" : "—"),
  };
}

/** Elapsed time for a tool ("time costed"). Live-counts while running. */
export function formatDuration(
  startedAt: number | null,
  finishedAt: number | null,
  nowMs: number = Date.now(),
): string {
  if (startedAt === null) return "—";
  const end = finishedAt ?? nowMs / 1000;
  let secs = Math.max(0, Math.round(end - startedAt));

  const h = Math.floor(secs / 3600);
  secs -= h * 3600;
  const m = Math.floor(secs / 60);
  const s = secs - m * 60;

  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
