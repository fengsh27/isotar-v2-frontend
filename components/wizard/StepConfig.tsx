"use client";

import { useRef, useState } from "react";
import { Accordion, AccordionItem, Alert, Button, Chip, Input, Textarea } from "@heroui/react";

import { validateTargets } from "@/lib/api";
import { MAX_CORES_PER_JOB, SPECIES_OPTIONS } from "@/lib/constants";
import { findMalformedTargets, parseTargets } from "@/lib/targets";
import type { TargetValidationResult } from "@/lib/types";
import { useWizardStore } from "@/stores/wizardStore";

const MAX_TARGETS = 100;

export function StepConfig() {
  const cores = useWizardStore((state) => state.config.cores);
  const maxRuntime = useWizardStore((state) => state.config.maxRuntime);
  const outputFormat = useWizardStore((state) => state.config.outputFormat);
  const setCores = useWizardStore((state) => state.setCores);
  const setMaxRuntime = useWizardStore((state) => state.setMaxRuntime);
  const setOutputFormat = useWizardStore((state) => state.setOutputFormat);
  const targetGeneIds = useWizardStore((state) => state.targetGeneIds);
  const setTargetGeneIds = useWizardStore((state) => state.setTargetGeneIds);
  const workflow = useWizardStore((state) => state.workflow);
  const species = useWizardStore((state) => state.species);
  const humanReference = useWizardStore((state) => state.humanReference);
  const next = useWizardStore((state) => state.next);
  const back = useWizardStore((state) => state.back);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [validationResults, setValidationResults] = useState<
    TargetValidationResult[] | null
  >(null);
  const [validationError, setValidationError] = useState("");

  function resetValidation() {
    setValidationResults(null);
    setValidationError("");
  }

  // Clear stale results whenever the target text changes, so what's displayed
  // always reflects the current input.
  function handleTargetsChange(value: string) {
    setTargetGeneIds(value);
    resetValidation();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      setTargetGeneIds(text.trim());
      resetValidation();
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const isLncrnaWorkflow = workflow === "mir-lncrna";
  const targetType: "gene" | "lncrna" = isLncrnaWorkflow ? "lncrna" : "gene";
  const supportsTargets = workflow === "mir-target" || isLncrnaWorkflow;

  // Genome for the validation request, derived the same way as StepReview:
  // human uses the chosen hg19/hg38, other species map to their genome code.
  const genome =
    species === "9606"
      ? humanReference || "hg38"
      : SPECIES_OPTIONS.find((o) => o.value === species)?.genome ?? "hg38";

  async function checkValidation() {
    const list = parseTargets(targetGeneIds);
    if (list.length === 0) return;
    setIsChecking(true);
    setValidationError("");
    try {
      const res = await validateTargets(list, genome, targetType);
      setValidationResults(res.results);
    } catch (err) {
      setValidationResults(null);
      setValidationError(
        err instanceof Error ? err.message : "Validation request failed. Please try again.",
      );
    } finally {
      setIsChecking(false);
    }
  }

  const targetCopy = isLncrnaWorkflow
    ? {
        sectionTitle: "Select Target (optional)",
        sectionSubtitle:
          "Filter by Ensembl transcript ID (e.g. ENST00000761542) or gene ID (e.g. ENSG00000299200)",
        textareaLabel: "Transcript / Gene IDs",
        placeholder: "ENST00000761542\nENSG00000299200",
        description: `One target per line (or comma-separated). Ensembl transcript IDs (e.g. ENST00000761542) or gene IDs (e.g. ENSG00000299200). Up to ${MAX_TARGETS} targets. Leave blank to run against all predicted targets.`,
        malformedTitleSuffix: "look like an Ensembl / FlyBase / WormBase ID",
        notFoundHint:
          "Remove or replace not-found targets before continuing. Only Ensembl transcript IDs (e.g. ENST00000761542) and gene IDs (e.g. ENSG00000299200) present in the reference are accepted.",
      }
    : {
        sectionTitle: "Select Target (optional)",
        sectionSubtitle:
          "Filter by gene label (e.g. TP53) or RefSeq ID (e.g. NM_000546)",
        textareaLabel: "Gene Labels / Gene IDs",
        placeholder: "TP53\nNM_000546\nBRCA1",
        description: `One target per line (or comma-separated). Gene labels (e.g. TP53) or RefSeq IDs starting with NM (e.g. NM_000546). Up to ${MAX_TARGETS} targets. Leave blank to run against all predicted targets.`,
        malformedTitleSuffix: "look like a gene symbol or NM_ ID",
        notFoundHint:
          "Remove or replace not-found targets before continuing. Only gene symbols (e.g. TP53) and RefSeq IDs (e.g. NM_000546) present in the reference are accepted.",
      };

  const targetCount = parseTargets(targetGeneIds).length;
  const malformedTargets = findMalformedTargets(targetGeneIds, targetType);
  const tooManyTargets = targetCount > MAX_TARGETS;
  const validCount = validationResults?.filter((r) => r.valid).length ?? 0;
  const invalidCount = (validationResults?.length ?? 0) - validCount;
  // Block advancing while any target is known-bad: either it fails the local
  // shape check, or the backend just told us it isn't in the reference. We
  // can't know about not-found without a Check Validation click, but any
  // known invalidity is enough to gate the Next button.
  const hasInvalidTargets = malformedTargets.length > 0 || invalidCount > 0;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Configure Job</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Default runtime settings are visible here. Advanced settings stay collapsed until needed.
        </p>
      </div>

      <p className="rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-sm text-zinc-700">
        Visible defaults: <strong>{cores}</strong> cores, runtime{" "}
        <strong>{maxRuntime}</strong>, output format{" "}
        <strong>{outputFormat === "standard" ? "Standard" : "Extended"}</strong>.
      </p>

      <Accordion variant="splitted">
        <AccordionItem
          key="advanced"
          aria-label="Advanced configuration"
          title="Advanced settings (optional)"
          subtitle="Collapsed by default"
        >
          <div className="space-y-4">
            <Input
              type="number"
              min={1}
              max={MAX_CORES_PER_JOB}
              label="Number of CPU cores"
              description={`1–${MAX_CORES_PER_JOB} per job`}
              value={String(cores)}
              onValueChange={(value) => {
                const parsed = Number(value);
                if (Number.isFinite(parsed) && parsed >= 1 && parsed <= MAX_CORES_PER_JOB) {
                  setCores(Math.trunc(parsed));
                }
              }}
            />

            <Input
              label="Max runtime"
              value={maxRuntime}
              onValueChange={setMaxRuntime}
              placeholder="Default"
            />

            <div className="space-y-2">
              <label htmlFor="output-format" className="text-sm font-medium text-zinc-800">
                Output format
              </label>
              <select
                id="output-format"
                value={outputFormat}
                onChange={(event) =>
                  setOutputFormat(event.target.value === "extended" ? "extended" : "standard")
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                <option value="standard">Standard</option>
                <option value="extended">Extended</option>
              </select>
            </div>
          </div>
        </AccordionItem>
      </Accordion>

      {supportsTargets && (
        <Accordion variant="splitted">
          <AccordionItem
            key="target"
            aria-label="Select targets"
            title={targetCopy.sectionTitle}
            subtitle={targetCopy.sectionSubtitle}
          >
            <div className="space-y-3 pb-2">
              <Textarea
                label={targetCopy.textareaLabel}
                placeholder={targetCopy.placeholder}
                value={targetGeneIds}
                onValueChange={handleTargetsChange}
                description={targetCopy.description}
                variant="bordered"
                classNames={{ inputWrapper: "bg-white" }}
                minRows={4}
              />
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => fileInputRef.current?.click()}
                >
                  Upload file (.txt)
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  isLoading={isChecking}
                  isDisabled={targetCount === 0 || tooManyTargets}
                  onPress={checkValidation}
                >
                  Check Validation
                </Button>
                {targetCount > 0 && (
                  <span
                    className={`text-xs ${
                      tooManyTargets ? "font-medium text-red-600" : "text-zinc-500"
                    }`}
                  >
                    {targetCount} target{targetCount !== 1 ? "s" : ""} entered
                    {tooManyTargets ? ` (max ${MAX_TARGETS})` : ""}
                  </span>
                )}
                {targetGeneIds.trim() && (
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => handleTargetsChange("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={handleFileUpload}
              />
              {tooManyTargets && (
                <Alert
                  color="danger"
                  variant="flat"
                  title={`Too many targets (${targetCount}). The maximum is ${MAX_TARGETS}.`}
                >
                  <span className="text-xs">
                    Remove entries until {MAX_TARGETS} or fewer remain before continuing.
                  </span>
                </Alert>
              )}

              {malformedTargets.length > 0 && (
                <Alert
                  color="danger"
                  variant="flat"
                  title={`${malformedTargets.length} ${
                    malformedTargets.length === 1 ? "entry doesn't" : "entries don't"
                  } ${targetCopy.malformedTitleSuffix}`}
                >
                  <span className="text-xs">
                    {malformedTargets.slice(0, 5).map((t) => `"${t}"`).join(", ")}
                    {malformedTargets.length > 5 ? ", …" : ""}. Fix or remove these
                    entries before continuing.
                  </span>
                </Alert>
              )}

              {validationError && (
                <Alert color="danger" variant="flat" title={validationError} />
              )}

              {validationResults && validationResults.length > 0 && (
                <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="flat" color="success">
                      {validCount} found
                    </Chip>
                    {invalidCount > 0 && (
                      <Chip size="sm" variant="flat" color="danger">
                        {invalidCount} not found
                      </Chip>
                    )}
                  </div>
                  <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                    {validationResults.map((r, i) => (
                      <Chip
                        key={`${r.target}-${i}`}
                        size="sm"
                        variant="flat"
                        color={r.valid ? "success" : "danger"}
                      >
                        {r.target}
                      </Chip>
                    ))}
                  </div>
                  {invalidCount > 0 && (
                    <p className="text-xs text-zinc-500">{targetCopy.notFoundHint}</p>
                  )}
                </div>
              )}
            </div>
          </AccordionItem>
        </Accordion>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="flat" onPress={back}>
          Back: Prediction Tools
        </Button>
        <Button
          color="primary"
          onPress={next}
          isDisabled={tooManyTargets || hasInvalidTargets}
        >
          Next: Review &amp; Run
        </Button>
      </div>
    </section>
  );
}
