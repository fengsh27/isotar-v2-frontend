"use client";

import { useState } from "react";
import { Alert, Button, Chip } from "@heroui/react";
import { useRouter } from "next/navigation";

import { createJob } from "@/lib/api";
import { evaluateOperationState } from "@/lib/operation";
import { SPECIES_OPTIONS, TOOL_OPTIONS, WORKFLOW_LABELS } from "@/lib/constants";
import { trackJobId } from "@/lib/jobStorage";
import { useWizardStore } from "@/stores/wizardStore";

function buildManifestPreview(args: {
  mirnaId: string;
  customMirnaSeq?: string;
  useCustomMirnaSeq: boolean;
  preId: string;
  operationType?: string;
  modifications: string[];
  shift: string | null;
  tools: string[];
  species: string;
  config: { cores: number; maxRuntime: string; outputFormat: "standard" | "extended" };
  workflow: string;
  targetGeneIds?: string[];
}) {
  return {
    workflow: args.workflow,
    input: {
      mirna: args.useCustomMirnaSeq
        ? { seq: args.customMirnaSeq?.replace(/\s/g, "").toUpperCase() }
        : {
            id: args.mirnaId,
            ...(args.preId ? { pre_id: args.preId } : {}),
          },
    },
    operation: args.useCustomMirnaSeq
      ? undefined
      : args.operationType
        ? { type: args.operationType }
        : undefined,
    transformations: args.useCustomMirnaSeq
      ? undefined
      : {
          modifications: args.modifications,
          shift: args.shift,
        },
    prediction: {
      tools: args.tools.map((tool) => ({ name: tool })),
      ...(args.targetGeneIds?.length ? { target_gene_ids: args.targetGeneIds } : {}),
    },
    species: {
      taxonomy_id: args.species,
    },
    configuration: args.config,
    note:
      "Tool versions and software version are not set client-side. Backend assigns canonical manifest fields.",
  };
}

export function StepReview() {
  const router = useRouter();

  const mirnaId = useWizardStore((state) => state.mirnaId);
  const customMirnaSeq = useWizardStore((state) => state.customMirnaSeq);
  const useCustomMirnaSeq = useWizardStore((state) => state.useCustomMirnaSeq);
  const preId = useWizardStore((state) => state.preId);
  const humanReference = useWizardStore((state) => state.humanReference);
  const modifications = useWizardStore((state) => state.modifications);
  const shiftLeft = useWizardStore((state) => state.shiftLeft);
  const shiftRight = useWizardStore((state) => state.shiftRight);
  const tools = useWizardStore((state) => state.tools);
  const targetGeneIds = useWizardStore((state) => state.targetGeneIds);
  const species = useWizardStore((state) => state.species);
  const workflow = useWizardStore((state) => state.workflow);
  const config = useWizardStore((state) => state.config);
  const back = useWizardStore((state) => state.back);
  const reset = useWizardStore((state) => state.reset);
  const toJobPayload = useWizardStore((state) => state.toJobPayload);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const payload = toJobPayload();
  const opState = evaluateOperationState(modifications, shiftLeft, shiftRight);

  const speciesLabel =
    SPECIES_OPTIONS.find((option) => option.value === species)?.subtitle ?? species;

  const parsedTargetGeneIds =
    workflow === "mir-target"
      ? targetGeneIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const manifestPreview = buildManifestPreview({
    mirnaId,
    customMirnaSeq,
    useCustomMirnaSeq,
    preId,
    operationType: opState.operationType,
    modifications: opState.formattedModifications,
    shift: opState.shift,
    tools,
    species,
    config,
    workflow,
    targetGeneIds: parsedTargetGeneIds.length ? parsedTargetGeneIds : undefined,
  });

  function downloadManifest() {
    const blob = new Blob([JSON.stringify(manifestPreview, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "isotar-manifest-preview.json";
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function run() {
    if (!payload) {
      setErrorMessage(
        "Review data is incomplete. Ensure miRNA, tools, and species are set.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const job = await createJob(payload);
      trackJobId(job.job_id);
      reset();
      router.replace(`/jobs/${job.job_id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Job submission failed due to an unexpected error.",
      );
    } finally {
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
          <strong>Workflow:</strong> {WORKFLOW_LABELS[workflow]}
        </p>
        {useCustomMirnaSeq ? (
          <div>
            <p><strong>miRNA:</strong> <span className="font-mono text-xs">(custom sequence)</span></p>
            <code className="mt-1 inline-block break-all rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-900">
              {customMirnaSeq.replace(/\s/g, "").toUpperCase()}
            </code>
          </div>
        ) : (
          <p>
            <strong>miRNA:</strong> {mirnaId}
          </p>
        )}
        {!useCustomMirnaSeq && preId ? (
          <p>
            <strong>Precursor:</strong> {preId}
          </p>
        ) : null}
        {!useCustomMirnaSeq ? (
          <p>
            <strong>Operation mode:</strong> {opState.operationType ?? "Not set"}
          </p>
        ) : (
          <p>
            <strong>Operation:</strong> <span className="text-zinc-500">skipped (custom sequence)</span>
          </p>
        )}

        {!useCustomMirnaSeq ? (
          <>
            <div className="space-y-1">
              <p>
                <strong>Modification:</strong>
              </p>
              {opState.formattedModifications.length ? (
                opState.formattedModifications.map((mod) => (
                  <p key={mod} className="pl-3 text-zinc-700">
                    • {mod.replace(":", ": ").replace("|", " → ")}
                  </p>
                ))
              ) : (
                <p className="pl-3 text-zinc-600">None</p>
              )}
            </div>
            <p>
              <strong>Shift:</strong>{" "}
              {opState.shift ? opState.shift.replace("|", " | ") : "None"}
            </p>
          </>
        ) : null}

        <p>
          <strong>Species:</strong> {speciesLabel}
        </p>
        {species === "9606" ? (
          <p>
            <strong>Reference file:</strong> {humanReference || "Not set"}
          </p>
        ) : null}
        <p>
          <strong>Configuration:</strong> {config.cores} cores
        </p>
        <p>
          <strong>Max runtime:</strong> {config.maxRuntime}
        </p>
        <p>
          <strong>Output format:</strong>{" "}
          {config.outputFormat === "standard" ? "Standard" : "Extended"}
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
        {workflow === "mir-target" ? (
          <p>
            <strong>Target gene IDs:</strong>{" "}
            {parsedTargetGeneIds.length ? parsedTargetGeneIds.join(", ") : "None (all targets)"}
          </p>
        ) : null}
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
