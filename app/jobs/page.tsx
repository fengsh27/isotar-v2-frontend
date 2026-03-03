"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, Chip, Spinner } from "@heroui/react";

import { getJob, killJob } from "@/lib/api";
import { readTrackedJobIds, untrackJobId } from "@/lib/jobStorage";
import { STATUS_COLOR } from "@/lib/constants";
import type { JobRecord } from "@/lib/types";

type JobRow = {
  jobId: string;
  job?: JobRecord;
  error?: string;
};

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

function jobStatus(row: JobRow): JobRecord["status"] | "unknown" {
  return row.job?.status ?? "unknown";
}

async function fetchTrackedJobs(ids: string[]): Promise<JobRow[]> {
  const rows = await Promise.all(
    ids.map(async (jobId) => {
      try {
        const job = await getJob(jobId);
        return { jobId, job };
      } catch (error) {
        return {
          jobId,
          error: error instanceof Error ? error.message : "Unable to fetch job from server.",
        };
      }
    }),
  );

  return rows;
}

export default function JobsPage() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyJobIds, setBusyJobIds] = useState<string[]>([]);

  const hasTrackedJobs = rows.length > 0;

  const runningCount = useMemo(
    () => rows.filter((row) => row.job?.status === "queued" || row.job?.status === "running").length,
    [rows],
  );

  function markBusy(jobId: string, busy: boolean) {
    setBusyJobIds((prev) => {
      if (busy) {
        return prev.includes(jobId) ? prev : [...prev, jobId];
      }

      return prev.filter((item) => item !== jobId);
    });
  }

  async function loadTrackedJobs() {
    setIsLoading(true);
    setError("");

    try {
      const ids = readTrackedJobIds();

      if (!ids.length) {
        setRows([]);
        return;
      }

      const fetched = await fetchTrackedJobs(ids);
      setRows(fetched);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load tracked jobs.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshJob(jobId: string) {
    markBusy(jobId, true);
    setError("");

    try {
      const job = await getJob(jobId);
      setRows((prev) => prev.map((row) => (row.jobId === jobId ? { jobId, job } : row)));
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : "Unable to query this job status.";
      setRows((prev) => prev.map((row) => (row.jobId === jobId ? { jobId, error: message } : row)));
    } finally {
      markBusy(jobId, false);
    }
  }

  async function cancelJob(jobId: string) {
    markBusy(jobId, true);
    setError("");

    try {
      const killed = await killJob(jobId);
      setRows((prev) =>
        prev.map((row) =>
          row.jobId === jobId && row.job
            ? { jobId, job: { ...row.job, status: killed.status } }
            : row,
        ),
      );
    } catch (killError) {
      setError(killError instanceof Error ? killError.message : "Unable to kill this job.");
    } finally {
      markBusy(jobId, false);
    }
  }

  function removeJob(jobId: string) {
    untrackJobId(jobId);
    setRows((prev) => prev.filter((row) => row.jobId !== jobId));
  }

  useEffect(() => {
    loadTrackedJobs();
  }, []);

  return (
    <div className="space-y-4 fade-rise">
      <header className="surface-panel-strong flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">My Jobs</h1>
          <p className="mt-1 text-sm text-zinc-700">
            Tracked jobs in this browser: {rows.length}
            {runningCount ? ` (${runningCount} active)` : ""}
          </p>
        </div>
        <Button variant="flat" onPress={loadTrackedJobs}>
          Refresh All
        </Button>
      </header>

      {error ? (
        <Alert color="danger" title={error} description="Check API connectivity and retry." />
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner size="sm" /> Loading tracked jobs...
        </div>
      ) : null}

      {!isLoading && !hasTrackedJobs ? (
        <Card className="surface-panel rounded-2xl border-0">
          <CardBody className="text-sm text-zinc-700">
            No tracked jobs in local storage. Start one from{" "}
            <Link className="text-teal-700 underline" href="/run">
              Run Analysis
            </Link>
            .
          </CardBody>
        </Card>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const status = jobStatus(row);
          const isBusy = busyJobIds.includes(row.jobId);
          const canKill = row.job?.status === "queued" || row.job?.status === "running";

          return (
            <Card key={row.jobId} className="surface-panel rounded-2xl border-0">
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{row.jobId}</p>
                    <p className="text-xs text-zinc-600">
                      Created {formatDateTime(row.job?.created_at)}
                    </p>
                  </div>
                  <Chip
                    color={status === "unknown" ? "default" : STATUS_COLOR[status]}
                    variant="flat"
                    className="capitalize"
                  >
                    {status}
                  </Chip>
                </div>

                {row.error ? (
                  <Alert
                    color="warning"
                    title="Unable to fetch this job from server."
                    description={row.error}
                    variant="flat"
                  />
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="flat" onPress={() => refreshJob(row.jobId)} isLoading={isBusy}>
                    Query Status
                  </Button>
                  <Link href={`/jobs/${row.jobId}`}>
                    <Button as="span" size="sm" color="primary" variant="flat">
                      View
                    </Button>
                  </Link>
                  {row.job?.status === "completed" ? (
                    <Link href={`/jobs/${row.jobId}`}>
                      <Button as="span" size="sm" variant="flat">
                        Obtain Result
                      </Button>
                    </Link>
                  ) : null}
                  {canKill ? (
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      onPress={() => cancelJob(row.jobId)}
                      isLoading={isBusy}
                    >
                      Kill Job
                    </Button>
                  ) : null}
                  <Button size="sm" variant="flat" onPress={() => removeJob(row.jobId)}>
                    Remove
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
