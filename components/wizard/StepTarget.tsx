"use client";

import { Button, Input } from "@heroui/react";

import { useWizardStore } from "@/stores/wizardStore";

export function StepTarget() {
  const targetGeneIds = useWizardStore((state) => state.targetGeneIds);
  const setTargetGeneIds = useWizardStore((state) => state.setTargetGeneIds);
  const next = useWizardStore((state) => state.next);
  const back = useWizardStore((state) => state.back);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Select Target</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Optionally filter predictions to specific gene targets.
        </p>
      </div>

      <div className="space-y-3">
        <Input
          label="Gene IDs / Symbols"
          placeholder="e.g. TP53, ENSG00000141510"
          value={targetGeneIds}
          onValueChange={setTargetGeneIds}
          description="Optional. Leave blank to skip target filtering."
          variant="bordered"
          classNames={{ inputWrapper: "bg-white" }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="flat" onPress={back}>
          Back: Prediction Tools
        </Button>
        <Button color="primary" onPress={next}>
          Next: Configuration
        </Button>
      </div>
    </section>
  );
}
