"use client";

import { Alert, Button } from "@heroui/react";

import { SPECIES_OPTIONS } from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

export function StepSpecies() {
  const species = useWizardStore((state) => state.species);
  const humanReference = useWizardStore((state) => state.humanReference);
  const setSpecies = useWizardStore((state) => state.setSpecies);
  const setHumanReference = useWizardStore((state) => state.setHumanReference);
  const setMirnaId = useWizardStore((state) => state.setMirnaId);
  const next = useWizardStore((state) => state.next);

  const isHuman = species === "9606";
  const canProceed = !!species && (!isHuman || !!humanReference);

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
          onChange={(event) => {
            const nextSpecies = event.target.value;
            setSpecies(nextSpecies);
            setMirnaId("");

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
            <label className="inline-flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="human-reference"
                value="hg19"
                checked={humanReference === "hg19"}
                onChange={() => setHumanReference("hg19")}
              />
              hg19
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="human-reference"
                value="hg38"
                checked={humanReference === "hg38"}
                onChange={() => setHumanReference("hg38")}
              />
              hg38
            </label>
          </div>

          {!humanReference ? (
            <p className="mt-2 text-sm font-medium text-red-600">
              Please select a reference file before continuing.
            </p>
          ) : null}
        </div>
      ) : null}

      <Alert color="warning" variant="flat" title="Changing species will recompute predictions." />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button color="primary" onPress={next} isDisabled={!canProceed}>
          Next: miRNA
        </Button>
      </div>
    </section>
  );
}
