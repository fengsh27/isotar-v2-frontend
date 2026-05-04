"use client";

import { useState } from "react";
import { Button, Tab, Tabs } from "@heroui/react";

import { EnrichmentPanel } from "@/components/job/EnrichmentPanel";
import { PredictedGenesTable } from "@/components/job/PredictedGenesTable";
import { VennDiagram } from "@/components/job/VennDiagram";
import type { VennData } from "@/lib/types";

interface Props {
  jobId: string;
}

export function JobResults({ jobId }: Props) {
  const [venn, setVenn] = useState<VennData | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const downloadUrl = `${apiBase}/api/v1/jobs/${jobId}/result/download`;

  return (
    <section className="surface-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-zinc-900">Results</h2>
        <Button
          as="a"
          href={downloadUrl}
          download
          color="primary"
          variant="flat"
          size="sm"
        >
          Download Results (.zip)
        </Button>
      </div>
      <Tabs aria-label="Result sections" variant="underlined">
        <Tab key="targets" title="Predicted Targets">
          <div className="mt-4 space-y-6">
            {venn ? <VennDiagram venn={venn} /> : null}
            <PredictedGenesTable jobId={jobId} onVennData={setVenn} />
          </div>
        </Tab>

        <Tab key="enrichment" title="Enrichment">
          <EnrichmentPanel jobId={jobId} />
        </Tab>
      </Tabs>
    </section>
  );
}
