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
  elapsed?: number | null;
  running_since?: number | null;
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
      elapsed: info.elapsed ?? prev?.elapsed ?? null,
      // Unlike the others this must follow the incoming snapshot exactly: the
      // backend nulls it when a run ends, and falling back to `prev` would
      // resurrect a finished run and live-count it forever.
      running_since: info.running_since ?? null,
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
        elapsed: entry?.elapsed ?? null,
        running_since: entry?.running_since ?? null,
      };
    });
  }

  return Object.values(acc).map((entry) => ({
    name: entry.display,
    status: entry.status,
    started_at: entry.started_at,
    finished_at: entry.finished_at,
    elapsed: entry.elapsed ?? null,
    running_since: entry.running_since ?? null,
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
  // A run is finished once no tool is still running and every tool reached a
  // terminal state (done or failed) -- show "Done" rather than "—".
  const allTerminal =
    rows.length > 0 &&
    rows.every((row) => row.status === "done" || row.status === "failed");
  return {
    total: rows.length,
    completed,
    current: running?.name ?? backendCurrent ?? (allTerminal ? "Done" : "—"),
  };
}

function formatSecs(secs: number): string {
  let rest = Math.max(0, Math.round(secs));
  const h = Math.floor(rest / 3600);
  rest -= h * 3600;
  const m = Math.floor(rest / 60);
  const s = rest - m * 60;

  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/**
 * Time costed for a tool: the work it actually did, live-counting while running.
 *
 * This is `elapsed` (accumulated per run by the runner) and NOT
 * finished_at - started_at. Each tool runs once per miRNA, and mir-network runs
 * every tool over two target pools, so the span from a tool's first start to its
 * last finish also contains every other tool's work: it reported 3h58m for a
 * miRanda that ran 71s, and the column summed to 21h on a 7h job.
 *
 * Jobs predating `elapsed` have no per-run timing to recover, so they fall back
 * to the old span — still wrong, but it is all those jobs recorded.
 */
export function formatDuration(
  row: Pick<ToolRow, "started_at" | "finished_at" | "elapsed" | "running_since">,
  nowMs: number = Date.now(),
): string {
  const { started_at, finished_at, elapsed, running_since } = row;

  if (elapsed === null || elapsed === undefined) {
    if (started_at === null) return "—";
    const end = finished_at ?? nowMs / 1000;
    return formatSecs(end - started_at);
  }

  // Banked runs, plus the in-flight one so a running tool still ticks.
  const inFlight = running_since !== null && running_since !== undefined
    ? Math.max(0, nowMs / 1000 - running_since)
    : 0;
  return formatSecs(elapsed + inFlight);
}
