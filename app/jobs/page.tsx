"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, Chip, Spinner } from "@heroui/react";

import { getJobs } from "@/lib/api";
import { STATUS_COLOR } from "@/lib/constants";
import type { JobRecord } from "@/lib/types";

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

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadJobs() {
    setIsLoading(true);

    try {
      const data = await getJobs();
      setJobs(data);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load jobs from backend API.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <div className="space-y-4 fade-rise">
      <header className="surface-panel-strong flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">My Jobs</h1>
          <p className="mt-1 text-sm text-zinc-700">Asynchronous runs and their immutable status.</p>
        </div>
        <Button variant="flat" onPress={loadJobs}>
          Refresh
        </Button>
      </header>

      {error ? (
        <Alert color="danger" title={error} description="Confirm API connectivity and retry." />
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner size="sm" /> Loading jobs...
        </div>
      ) : null}

      {!isLoading && jobs.length === 0 ? (
        <Card className="surface-panel rounded-2xl border-0">
          <CardBody className="text-sm text-zinc-700">
            No jobs found. Start one from <Link className="text-teal-700 underline" href="/run">Run Analysis</Link>.
          </CardBody>
        </Card>
      ) : null}

      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.job_id} className="surface-panel rounded-2xl border-0">
            <CardBody className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{job.job_id}</p>
                <p className="text-xs text-zinc-600">Created {formatDateTime(job.created_at)}</p>
              </div>

              <div className="flex items-center gap-3">
                <Chip color={STATUS_COLOR[job.status]} variant="flat" className="capitalize">
                  {job.status}
                </Chip>
                <Link href={`/jobs/${job.job_id}`}>
                  <Button as="span" size="sm" color="primary" variant="flat">
                    View
                  </Button>
                </Link>
                {job.status === "completed" ? (
                  <Link href="/run">
                    <Button as="span" size="sm" variant="flat">
                      Rerun
                    </Button>
                  </Link>
                ) : null}
                {job.status === "failed" ? (
                  <Link href={`/jobs/${job.job_id}`}>
                    <Button as="span" size="sm" variant="flat">
                      Debug
                    </Button>
                  </Link>
                ) : null}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
