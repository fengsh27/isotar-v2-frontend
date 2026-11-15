"use client";

import { useCallback, useState } from "react";
import { Button, Tab, Tabs } from "@heroui/react";

import { CompareTable } from "@/components/job/CompareTable";
import { EnrichmentPanel } from "@/components/job/EnrichmentPanel";
import { NetworkPanel } from "@/components/job/NetworkPanel";
import { PredictedGenesTable } from "@/components/job/PredictedGenesTable";
import { SequenceSelector, type CompareSelection } from "@/components/job/SequenceSelector";
import { VennDiagram } from "@/components/job/VennDiagram";
import { enrichmentOrganismForGenome } from "@/lib/constants";
import type { SequenceInfo, VennData, WorkflowType } from "@/lib/types";

interface Props {
  jobId: string;
  mirnaId?: string;
  genome?: string;
  workflow?: WorkflowType;
}

export function JobResults({ jobId, mirnaId, genome, workflow }: Props) {
  const [venn, setVenn] = useState<VennData | null>(null);
  // The job's miRNA records (WT plus any variants), reported by the table's
  // first load. `selected` null = the backend default, the WT records.
  const [sequences, setSequences] = useState<SequenceInfo[]>([]);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [compare, setCompare] = useState<CompareSelection | null>(null);

  const handleSequences = useCallback((list: SequenceInfo[]) => setSequences(list), []);

  // Enrichment requires protein-coding gene symbols, so it is offered only for
  // the gene (miR-Target) workflow AND species with a supported Enrichr organism.
  // lncRNA targets have no gene-symbol identity, so it is hidden for mir-lncrna.
  const enrichmentOrganism =
    workflow === "mir-lncrna" ? null : enrichmentOrganismForGenome(genome);

  // Always same-origin: the Next.js rewrites in next.config.ts proxy this to
  // the backend server-side. Using NEXT_PUBLIC_API_BASE here would produce an
  // absolute cross-origin URL that browsers block as a mixed-content download
  // whenever the page is HTTPS and the backend is HTTP (Chrome 111+).
  const downloadUrl = `/api/v1/jobs/${jobId}/result/download`;
  const isNetwork = workflow === "mir-network";

  const byId = new Map(sequences.map((s) => [s.sequence, s]));
  const compareWt = compare ? byId.get(compare.wt) : undefined;
  const compareVariant = compare ? byId.get(compare.variant) : undefined;
  const shownLabel =
    selected && selected.length === 1 ? byId.get(selected[0])?.label : undefined;

  return (
    <section className="surface-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Results</h2>
          {isNetwork ? (
            <p className="text-sm text-zinc-600">
              gene ↔ miRNA ↔ lncRNA interaction network
            </p>
          ) : mirnaId ? (
            <p className="text-sm text-zinc-600">
              Predicted targets of{" "}
              <span className="font-medium text-zinc-800">{shownLabel ?? mirnaId}</span>
            </p>
          ) : null}
        </div>
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

      {isNetwork ? (
        <NetworkPanel jobId={jobId} genome={genome} />
      ) : (
      <Tabs aria-label="Result sections" variant="underlined">
        <Tab key="targets" title="Predicted Targets">
          <div className="mt-4 space-y-6">
            {sequences.length > 1 ? (
              <SequenceSelector
                sequences={sequences}
                selected={selected}
                compare={compare}
                onSelect={setSelected}
                onCompare={setCompare}
              />
            ) : null}
            {compare && compareWt && compareVariant ? (
              <CompareTable jobId={jobId} wt={compareWt} variant={compareVariant} />
            ) : (
              <>
                {venn ? <VennDiagram venn={venn} /> : null}
                <PredictedGenesTable
                  jobId={jobId}
                  sequences={selected}
                  onVennData={setVenn}
                  onSequences={handleSequences}
                />
              </>
            )}
          </div>
        </Tab>

        {enrichmentOrganism ? (
          <Tab key="enrichment" title="Enrichment">
            <EnrichmentPanel jobId={jobId} organism={enrichmentOrganism} />
          </Tab>
        ) : null}
      </Tabs>
      )}
    </section>
  );
}
