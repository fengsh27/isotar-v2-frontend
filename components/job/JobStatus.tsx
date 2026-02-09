"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, Spinner } from "@heroui/react";

import { getJob } from "@/lib/api";
import { JOB_STAGE_SEQUENCE, STATUS_COLOR } from "@/lib/constants";
import type { JobRecord, JobStatusValue } from "@/lib/types";
import { JobProgress } from "@/components/job/JobProgress";
import { JobResults } from "@/components/job/JobResults";

const TERMINAL_STATES: JobStatusValue[] = ["completed", "failed", "cancelled"];

function isTerminal(status: JobStatusValue): boolean {
  return TERMINAL_STATES.includes(status);
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

function stageStates(job: JobRecord): Array<{ stage: string; state: "done" | "active" | "pending" }> {
  const lowerStage = job.progress?.stage?.toLowerCase() ?? "";
  const percent = job.progress?.percent ?? 0;

  if (job.status === "completed") {
    return JOB_STAGE_SEQUENCE.map((stage) => ({ stage, state: "done" }));
  }

  if (job.status === "failed" || job.status === "cancelled") {
    return JOB_STAGE_SEQUENCE.map((stage, index) => ({
      stage,
      state: index === 0 ? "done" : "pending",
    }));
  }

  const activeIndex = JOB_STAGE_SEQUENCE.findIndex((stage) =>
    lowerStage.includes(stage.toLowerCase().split(" ")[0]),
  );
  const derivedIndex =
    activeIndex >= 0 ? activeIndex : percent > 80 ? 3 : percent > 55 ? 2 : percent > 30 ? 1 : 0;

  return JOB_STAGE_SEQUENCE.map((stage, index) => ({
    stage,
    state: index < derivedIndex ? "done" : index === derivedIndex ? "active" : "pending",
  }));
}

export function JobStatus({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobRecord | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const isFinished = useMemo(() => (job ? isTerminal(job.status) : false), [job]);
  const percent = job?.progress?.percent;
  const statusTitle = job
    ? `${job.status.charAt(0).toUpperCase()}${job.status.slice(1)}${
        typeof percent === "number" ? ` (${percent}%)` : ""
      }`
    : "Loading";

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const next = await getJob(jobId);
        if (!active) {
          return;
        }

        setJob(next);
        setError("");
        setIsLoading(false);

        if (!isTerminal(next.status)) {
          timeoutId = setTimeout(load, 3000);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this job from the backend API.",
        );
        setIsLoading(false);
        timeoutId = setTimeout(load, 5000);
      }
    };

    load();

    return () => {
      active = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [jobId]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white/85 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Job {jobId}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Status: <span className="font-medium text-zinc-800">{statusTitle}</span>
            </p>
          </div>
          {job ? (
            <Chip color={STATUS_COLOR[job.status]} variant="flat" className="capitalize">
              {job.status}
            </Chip>
          ) : null}
        </div>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600">
            <Spinner size="sm" /> Loading job state...
          </div>
        ) : null}

        {job ? (
          <div className="mt-4 grid gap-2 text-sm text-zinc-600 md:grid-cols-3">
            <p>
              <strong>Created:</strong> {formatDateTime(job.created_at)}
            </p>
            <p>
              <strong>Started:</strong> {formatDateTime(job.started_at)}
            </p>
            <p>
              <strong>Finished:</strong> {formatDateTime(job.finished_at)}
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert
          color="danger"
          title={error}
          description="Check API availability and job_id, then retry."
          endContent={
            <Button size="sm" variant="flat" onPress={() => window.location.reload()}>
              Reload
            </Button>
          }
        />
      ) : null}

      {job ? <JobProgress job={job} /> : null}

      {job ? (
        <section className="rounded-2xl border border-zinc-200 bg-white/85 p-5">
          <div className="space-y-2">
            {stageStates(job).map((item) => (
              <p key={item.stage} className="flex items-center gap-2 text-sm text-zinc-700">
                <span>
                  {item.state === "done" ? "✓" : item.state === "active" ? "⏳" : "…"}
                </span>
                <span>{item.stage}</span>
              </p>
            ))}
          </div>
          <div className="mt-4">
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                if (job.progress?.log_url) {
                  window.open(job.progress.log_url, "_blank", "noopener,noreferrer");
                }
              }}
              isDisabled={!job.progress?.log_url}
            >
              View logs
            </Button>
          </div>
        </section>
      ) : null}

      {job?.error ? (
        <Alert
          color="danger"
          title={job.error.message}
          description={job.error.details ?? "Job execution failed in the backend."}
          variant="flat"
        />
      ) : null}

      {job?.status === "completed" ? (
        <JobResults results={job.results} />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 text-sm text-zinc-600">
          {isFinished
            ? "Job finished without a completed result payload."
            : "Results will appear automatically when the job completes."}
        </div>
      )}
    </div>
  );
}
