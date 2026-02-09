"use client";

import { Accordion, AccordionItem, Button, Input } from "@heroui/react";

import { useWizardStore } from "@/stores/wizardStore";

export function StepConfig() {
  const cores = useWizardStore((state) => state.config.cores);
  const maxRuntime = useWizardStore((state) => state.config.maxRuntime);
  const outputFormat = useWizardStore((state) => state.config.outputFormat);
  const setCores = useWizardStore((state) => state.setCores);
  const setMaxRuntime = useWizardStore((state) => state.setMaxRuntime);
  const setOutputFormat = useWizardStore((state) => state.setOutputFormat);
  const next = useWizardStore((state) => state.next);
  const back = useWizardStore((state) => state.back);

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
              max={128}
              label="Number of CPU cores"
              value={String(cores)}
              onValueChange={(value) => {
                const parsed = Number(value);
                if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 128) {
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="flat" onPress={back}>
          Back: Species
        </Button>
        <Button color="primary" onPress={next}>
          Next: Review &amp; Run
        </Button>
      </div>
    </section>
  );
}
