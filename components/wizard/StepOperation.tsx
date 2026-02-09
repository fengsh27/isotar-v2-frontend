"use client";

import { Button, Card, CardBody, CardHeader } from "@heroui/react";

import { OPERATION_OPTIONS } from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

export function StepOperation() {
  const operation = useWizardStore((state) => state.operation);
  const setOperation = useWizardStore((state) => state.setOperation);
  const next = useWizardStore((state) => state.next);
  const back = useWizardStore((state) => state.back);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Choose Operation</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Operation is required and mutually exclusive. It defines the biological transformation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {OPERATION_OPTIONS.map((option) => {
          const selected = operation === option.value;

          return (
            <Card
              key={option.value}
              className={`border ${
                selected
                  ? "border-teal-600 bg-teal-50/70"
                  : "border-zinc-200 bg-white/80"
              }`}
            >
              <CardHeader className="pb-1">
                <h3 className="text-lg font-semibold text-zinc-900">{option.label}</h3>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-zinc-600">{option.description}</p>
                <ul className="mt-3 space-y-1 text-sm text-zinc-700">
                  {option.bullets.map((bullet) => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  color={selected ? "primary" : "default"}
                  variant={selected ? "solid" : "flat"}
                  onPress={() => setOperation(option.value)}
                >
                  {selected ? "Selected" : "Select"}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="flat" onPress={back}>
          Back
        </Button>
        <Button color="primary" onPress={next} isDisabled={!operation}>
          Next: Tools
        </Button>
      </div>
    </section>
  );
}
