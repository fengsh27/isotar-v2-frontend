"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, Spinner } from "@heroui/react";
import { useRouter } from "next/navigation";

import { getJob, killJob } from "@/lib/api";
import { untrackJobId } from "@/lib/jobStorage";
import { JOB_STAGE_SEQUENCE, STATUS_COLOR } from "@/lib/constants";
import type { JobRecord } from "@/lib/types";
import { JobProgress } from "@/components/job/JobProgress";
import { JobResults } from "@/components/job/JobResults";

const TERMINAL_STATES: JobRecord["status"][] = ["succeeded", "failed", "killed"];

function isTerminal(status: JobRecord["status"]): boolean {
  return TERMINAL_STATES.includes(status);
}

function formatDateTime(value?: number): string {
  if (value === undefined || value === null) return "-";
  return new Date(value * 1000).toLocaleString();
}

function stageStates(job: JobRecord): Array<{ stage: string; state: "done" | "active" | "pending" }> {
  // JOB_STAGE_SEQUENCE = ["Processing", "Predicting"]
  if (job.status === "succeeded") {
    return JOB_STAGE_SEQUENCE.map((stage) => ({ stage, state: "done" }));
  }

  if (job.status === "failed" || job.status === "killed") {
    return JOB_STAGE_SEQUENCE.map((stage, index) => ({
      stage,
      state: index === 0 ? "done" : "pending",
    }));
  }

  if (job.status === "running") {
    if (job.step === "predicting") {
      return JOB_STAGE_SEQUENCE.map((stage, index) => ({
        stage,
        state: index === 0 ? "done" : "active",
      }));
    }
    // step === "processing" or step undefined
    return JOB_STAGE_SEQUENCE.map((stage, index) => ({
      stage,
      state: index === 0 ? "active" : "pending",
    }));
  }

  // queued
  return JOB_STAGE_SEQUENCE.map((stage) => ({ stage, state: "pending" }));
}

export function JobStatus({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isKilling, setIsKilling] = useState(false);

  const isFinished = useMemo(() => (job ? isTerminal(job.status) : false), [job]);
  const canKill = job?.status === "queued" || job?.status === "running";
  const statusTitle = job
    ? `${job.status.charAt(0).toUpperCase()}${job.status.slice(1)}${
        job.status === "running" && job.step ? ` — ${job.step}` : ""
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
    <div className="space-y-4 fade-rise">
      <div className="surface-panel-strong rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Job {jobId}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Status: <span className="font-medium text-zinc-800">{statusTitle}</span>
            </p>
          </div>
          {job ? (
            <div className="flex flex-wrap items-center gap-2">
              <Chip color={STATUS_COLOR[job.status]} variant="flat" className="capitalize">
                {job.status}
              </Chip>
              {canKill ? (
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  isLoading={isKilling}
                  onPress={async () => {
                    setIsKilling(true);
                    setError("");
                    try {
                      const killed = await killJob(jobId);
                      setJob((prev) => (prev ? { ...prev, status: killed.status } : null));
                    } catch (killError) {
                      setError(
                        killError instanceof Error ? killError.message : "Unable to kill this job.",
                      );
                    } finally {
                      setIsKilling(false);
                    }
                  }}
                >
                  Kill Job
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  untrackJobId(jobId);
                  router.push("/jobs");
                }}
              >
                Remove from List
              </Button>
            </div>
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
        <section className="surface-panel rounded-2xl p-5">
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
        </section>
      ) : null}

      {job?.error ? (
        <Alert
          color="danger"
          title="Job failed"
          description={job.error}
          variant="flat"
        />
      ) : null}

      {job?.status === "succeeded" ? (
        <JobResults jobId={jobId} />
      ) : (
        <div className="surface-panel rounded-xl p-4 text-sm text-zinc-600">
          {isFinished
            ? "Job finished without a result archive."
            : "Results will appear automatically when the job completes."}
        </div>
      )}
    </div>
  );
}
