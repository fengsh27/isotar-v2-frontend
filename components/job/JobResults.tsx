"use client";

import { useState } from "react";
import { Tab, Tabs } from "@heroui/react";

import { PredictedGenesTable } from "@/components/job/PredictedGenesTable";
import { VennDiagram } from "@/components/job/VennDiagram";
import type { VennData } from "@/lib/types";

interface Props {
  jobId: string;
}

export function JobResults({ jobId }: Props) {
  const [venn, setVenn] = useState<VennData | null>(null);

  return (
    <section className="surface-panel rounded-2xl p-4">
      <h2 className="mb-3 text-xl font-semibold text-zinc-900">Results</h2>
      <Tabs aria-label="Result sections" variant="underlined">
        <Tab key="targets" title="Predicted Targets">
          <div className="mt-4 space-y-6">
            {venn ? <VennDiagram venn={venn} /> : null}
            <PredictedGenesTable jobId={jobId} onVennData={setVenn} />
          </div>
        </Tab>

        <Tab key="enrichment" title="Enrichment">
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-500">
            Enrichment analysis results coming soon.
          </div>
        </Tab>
      </Tabs>
    </section>
  );
}
