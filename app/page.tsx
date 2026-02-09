"use client";

import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="space-y-6 fade-rise">
      <section className="surface-panel-strong grid-glow overflow-hidden rounded-3xl p-8 md:p-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="text-s font-semibold tracking-[0.2em] text-teal-700">
              miRNA-centered analysis workflow
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
              Reproducible Target Prediction with{" "}
              <span className="ink-gradient">Manifest-backed Jobs</span>
            </h1>
            <p className="mt-4 max-w-2xl text-zinc-700">
              Build a run in six explicit steps: miRNA, operation, prediction tools, species,
              configuration, then review and submit an asynchronous job.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onPress={() => router.push("/run")}
                className="h-11 rounded-xl bg-teal-700 px-5 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:bg-teal-800 hover:shadow-xl hover:shadow-teal-900/20 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                Start New Analysis
              </Button>
              <Button
                onPress={() => router.push("/jobs")}
                className="h-11 rounded-xl border border-teal-700 bg-white/90 px-5 font-semibold text-teal-800 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:bg-teal-50 hover:shadow-lg hover:shadow-teal-900/10 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                Open Jobs
              </Button>
            </div>
          </div>

          <div className="surface-panel rounded-2xl p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Workflow</p>
            <ol className="mt-3 space-y-2 text-zinc-700">
              <li>1. Select miRNA</li>
              <li>2. Choose operation</li>
              <li>3. Pick prediction tools</li>
              <li>4. Set species</li>
              <li>5. Confirm config</li>
              <li>6. Review and run</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="surface-panel rounded-2xl border-0">
          <CardHeader>
            <h2 className="text-base font-semibold text-zinc-900">1. Input</h2>
          </CardHeader>
          <CardBody className="text-sm text-zinc-700">
            One miRNA per job, validated before downstream choices.
          </CardBody>
        </Card>

        <Card className="surface-panel rounded-2xl border-0">
          <CardHeader>
            <h2 className="text-base font-semibold text-zinc-900">2. Compute</h2>
          </CardHeader>
          <CardBody className="text-sm text-zinc-700">
            Select operation, tools, and species; configure visible runtime defaults.
          </CardBody>
        </Card>

        <Card className="surface-panel rounded-2xl border-0">
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
