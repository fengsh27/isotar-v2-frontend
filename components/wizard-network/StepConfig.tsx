"use client";

import { Accordion, AccordionItem, Button, Input } from "@heroui/react";

import { MAX_CORES_PER_JOB } from "@/lib/constants";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

export function StepConfig() {
  const cores = useNetworkWizardStore((state) => state.cores);
  const setCores = useNetworkWizardStore((state) => state.setCores);
  const next = useNetworkWizardStore((state) => state.next);
  const back = useNetworkWizardStore((state) => state.back);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Configure Job</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Default runtime settings are visible here. Advanced settings stay collapsed until needed.
        </p>
      </div>

      <p className="rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-sm text-zinc-700">
        Visible defaults: <strong>{cores}</strong> cores.
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
          </div>
        </AccordionItem>
      </Accordion>

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
