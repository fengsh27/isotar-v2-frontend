"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Chip } from "@heroui/react";
import { useRouter } from "next/navigation";

import { createNetworkJob } from "@/lib/api";
import { SPECIES_OPTIONS, TOOL_OPTIONS, WORKFLOW_LABELS } from "@/lib/constants";
import { trackJobId } from "@/lib/jobStorage";
import { parsePairs } from "@/lib/pairs";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

export function StepReview() {
  const router = useRouter();

  const species = useNetworkWizardStore((state) => state.species);
  const humanReference = useNetworkWizardStore((state) => state.humanReference);
  const selectedMirnas = useNetworkWizardStore((state) => state.selectedMirnas);
  const preIds = useNetworkWizardStore((state) => state.preIds);
  const pairsText = useNetworkWizardStore((state) => state.pairsText);
  const tools = useNetworkWizardStore((state) => state.tools);
  const cores = useNetworkWizardStore((state) => state.cores);
  const back = useNetworkWizardStore((state) => state.back);
  const reset = useNetworkWizardStore((state) => state.reset);
  const toJobPayload = useNetworkWizardStore((state) => state.toJobPayload);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const payload = toJobPayload();
  const pairs = useMemo(() => parsePairs(pairsText), [pairsText]);
  // Precursor choices scoped to currently-selected miRNAs (matches payload).
  const scopedPreIds = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(preIds).filter(
          ([id, preId]) => preId && selectedMirnas.includes(id),
        ),
      ),
    [preIds, selectedMirnas],
  );
  const hasPreIds = Object.keys(scopedPreIds).length > 0;
  const mode: "pairs" | "discovery" = pairs.length ? "pairs" : "discovery";

  const speciesSubtitle =
    SPECIES_OPTIONS.find((o) => o.value === species)?.subtitle ?? species;
  const resolvedGenome =
    species === "9606"
      ? humanReference || undefined
      : (SPECIES_OPTIONS.find((o) => o.value === species)?.genome ?? undefined);

  const manifestPreview = {
    workflow: "mir-network",
    input: {
      mirna_ids: selectedMirnas,
      ...(hasPreIds ? { pre_ids: scopedPreIds } : {}),
    },
    pairs: pairs.length ? pairs : undefined,
    mode,
    prediction: {
      tools: tools.map((tool) => ({ name: tool })),
    },
    species: {
      taxonomy_id: species,
      ...(resolvedGenome ? { genome: resolvedGenome } : {}),
    },
    configuration: { cores },
    note:
      "Tool versions and software version are not set client-side. Backend assigns canonical manifest fields.",
  };

  function downloadManifest() {
    const blob = new Blob([JSON.stringify(manifestPreview, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "isotar-network-manifest-preview.json";
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function run() {
    if (!payload) {
      setErrorMessage(
        "Review data is incomplete. Ensure species, miRNAs, and tools are set.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const job = await createNetworkJob(payload);
      trackJobId(job.job_id);
      reset();
      router.replace(`/jobs/${job.job_id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Network job submission failed due to an unexpected error.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Review &amp; Run</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Confirm all job inputs before submitting. Job payload becomes immutable after creation.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white/70 p-4 text-sm">
        <p>
          <strong>Workflow:</strong> {WORKFLOW_LABELS["mir-network"]}
        </p>
        <p>
          <strong>Species:</strong> {speciesSubtitle}
        </p>
        <p>
          <strong>Reference file:</strong> {resolvedGenome ?? "—"}
        </p>
        <div className="space-y-1">
          <p>
            <strong>miRNAs ({selectedMirnas.length}):</strong>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedMirnas.map((id) => (
              <Chip key={id} size="sm" variant="flat" color="primary">
                {id}
              </Chip>
            ))}
          </div>
        </div>
        {hasPreIds ? (
          <div className="space-y-1">
            <p>
              <strong>Precursors:</strong>
            </p>
            <ul className="ml-4 list-disc text-zinc-600">
              {Object.entries(scopedPreIds).map(([id, preId]) => (
                <li key={id}>
                  <span className="font-mono">{id}</span> →{" "}
                  <span className="font-mono">{preId}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p>
          <strong>Mode:</strong>{" "}
          {mode === "pairs"
            ? `ceRNA pairs (${pairs.length} pair${pairs.length === 1 ? "" : "s"})`
            : "Discovery (top-connected genes / lncRNAs)"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <strong>Tools:</strong>
          {tools.map((tool) => {
            const label = TOOL_OPTIONS.find((option) => option.value === tool)?.label ?? tool;
            return (
              <Chip key={tool} size="sm" variant="flat" color="primary">
                {label}
              </Chip>
            );
          })}
        </div>
        <p>
          <strong>Configuration:</strong> {cores} cores
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Manifest preview
        </p>
        <pre className="overflow-x-auto text-xs text-zinc-700">
          {JSON.stringify(manifestPreview, null, 2)}
        </pre>
      </div>

      {errorMessage ? <Alert color="danger" title={errorMessage} variant="flat" /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="flat" onPress={back}>
          Back: Configuration
        </Button>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="flat" onPress={downloadManifest}>
            Download Manifest
          </Button>
          <Button color="primary" onPress={run} isDisabled={!payload} isLoading={isSubmitting}>
            Start Job
          </Button>
        </div>
      </div>
    </section>
  );
}
