"use client";

import { Alert, Button } from "@heroui/react";

import { SPECIES_OPTIONS } from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

export function StepSpecies() {
  const species = useWizardStore((state) => state.species);
  const setSpecies = useWizardStore((state) => state.setSpecies);
  const next = useWizardStore((state) => state.next);
  const back = useWizardStore((state) => state.back);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Choose Species</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Species is mandatory and sets biological scope for interpretation.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="species-select" className="text-sm font-medium text-zinc-800">
          Species
        </label>
        <select
          id="species-select"
          value={species}
          onChange={(event) => setSpecies(event.target.value)}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-teal-600 focus:outline-none"
        >
          <option value="">Select species</option>
          {SPECIES_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Alert
        color="warning"
        variant="flat"
        title="Changing species will recompute predictions."
      />

      <div className="flex flex-wrap gap-3">
        <Button variant="flat" onPress={back}>
          Back
        </Button>
        <Button color="primary" onPress={next} isDisabled={!species}>
          Next: Configuration
        </Button>
      </div>
    </section>
  );
}
