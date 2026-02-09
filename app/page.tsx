"use client";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200/80 bg-white/85 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
          miRNA-centered analysis workflow
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-zinc-900">
          Reproducible target prediction with manifest-backed jobs
        </h1>
        <p className="mt-3 max-w-3xl text-zinc-700">
          Build a run in six explicit steps: miRNA, operation, prediction tools, species,
          configuration, then review and submit an asynchronous job.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/run">
            <Button as="span" color="primary">
              Start New Analysis
            </Button>
          </Link>
          <Link href="/jobs">
            <Button as="span" variant="flat">
              Open Jobs
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border border-zinc-200 bg-white/80">
          <CardHeader>
            <h2 className="text-base font-semibold text-zinc-900">1. Input</h2>
          </CardHeader>
          <CardBody className="text-sm text-zinc-700">
            One miRNA per job, validated before downstream choices.
          </CardBody>
        </Card>

        <Card className="border border-zinc-200 bg-white/80">
          <CardHeader>
            <h2 className="text-base font-semibold text-zinc-900">2. Compute</h2>
          </CardHeader>
          <CardBody className="text-sm text-zinc-700">
            Select operation, tools, and species; configure visible runtime defaults.
          </CardBody>
        </Card>

        <Card className="border border-zinc-200 bg-white/80">
          <CardHeader>
            <h2 className="text-base font-semibold text-zinc-900">3. Results</h2>
          </CardHeader>
          <CardBody className="text-sm text-zinc-700">
            Track asynchronous job execution and inspect read-only summary, targets, enrichment.
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
