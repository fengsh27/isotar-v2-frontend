"use client";

import { Alert, Button } from "@heroui/react";

import { SPECIES_OPTIONS } from "@/lib/constants";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

export function StepSpecies() {
  const species = useNetworkWizardStore((state) => state.species);
  const humanReference = useNetworkWizardStore((state) => state.humanReference);
  const setSpecies = useNetworkWizardStore((state) => state.setSpecies);
  const setHumanReference = useNetworkWizardStore((state) => state.setHumanReference);
  const setSelectedMirnas = useNetworkWizardStore((state) => state.setSelectedMirnas);
  const next = useNetworkWizardStore((state) => state.next);

  const isHuman = species === "9606";
  const canProceed = !!species && (!isHuman || !!humanReference);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Choose Species</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Species is mandatory and sets biological scope for both the gene and lncRNA pools.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="net-species-select" className="text-sm font-medium text-zinc-800">
          Species
        </label>
        <select
          id="net-species-select"
          value={species}
          onChange={(event) => {
            const nextSpecies = event.target.value;
            setSpecies(nextSpecies);
            setSelectedMirnas([]);
            if (nextSpecies !== "9606") {
              setHumanReference("");
            }
          }}
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

      {isHuman ? (
        <div className="rounded-xl border border-zinc-200 bg-white/80 p-4">
          <p className="text-sm font-semibold text-zinc-900">Reference file (Homo sapiens)</p>
          <p className="mt-1 text-xs text-zinc-600">Choose genome reference: hg19 or hg38.</p>

          <div className="mt-3 flex flex-wrap gap-4">
            {(["hg19", "hg38"] as const).map((ref) => (
              <label key={ref} className="inline-flex items-center gap-2 text-sm text-zinc-800">
                <input
                  type="radio"
                  name="net-human-reference"
                  value={ref}
                  checked={humanReference === ref}
                  onChange={() => setHumanReference(ref)}
                />
                {ref}
              </label>
            ))}
          </div>

          {!humanReference ? (
            <p className="mt-2 text-sm font-medium text-red-600">
              Please select a reference file before continuing.
            </p>
          ) : null}
        </div>
      ) : null}

      <Alert
        color="warning"
        variant="flat"
        title="Changing species will clear the selected miRNAs."
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button color="primary" onPress={next} isDisabled={!canProceed}>
          Next: miRNAs
        </Button>
      </div>
    </section>
  );
}
