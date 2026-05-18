"use client";

import { useRef } from "react";
import { Accordion, AccordionItem, Button, Input, Textarea } from "@heroui/react";

import { MAX_CORES_PER_JOB } from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

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
  const next = useWizardStore((state) => state.next);
  const back = useWizardStore((state) => state.back);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      setTargetGeneIds(text.trim());
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const targetCount = targetGeneIds
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean).length;

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

      {workflow === "mir-target" && (
        <Accordion variant="splitted">
          <AccordionItem
            key="target"
            aria-label="Select target genes"
            title="Select Target (optional)"
            subtitle="Filter by gene label (e.g. TP53) or RefSeq ID (e.g. NM_000546)"
          >
            <div className="space-y-3 pb-2">
              <Textarea
                label="Gene Labels / Gene IDs"
                placeholder={"TP53\nNM_000546\nBRCA1"}
                value={targetGeneIds}
                onValueChange={setTargetGeneIds}
                description="One target per line (or comma-separated). Gene labels (e.g. TP53) or RefSeq IDs starting with NM (e.g. NM_000546). Leave blank to run against all predicted targets."
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
                {targetCount > 0 && (
                  <span className="text-xs text-zinc-500">
                    {targetCount} target{targetCount !== 1 ? "s" : ""} entered
                  </span>
                )}
                {targetGeneIds.trim() && (
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => setTargetGeneIds("")}
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
            </div>
          </AccordionItem>
        </Accordion>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="flat" onPress={back}>
          Back: Prediction Tools
        </Button>
        <Button color="primary" onPress={next}>
          Next: Review &amp; Run
        </Button>
      </div>
    </section>
  );
}
