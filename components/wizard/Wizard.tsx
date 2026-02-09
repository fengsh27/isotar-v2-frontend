"use client";

import { StepConfig } from "@/components/wizard/StepConfig";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { StepMiRNA } from "@/components/wizard/StepMiRNA";
import { StepOperation } from "@/components/wizard/StepOperation";
import { StepReview } from "@/components/wizard/StepReview";
import { StepSpecies } from "@/components/wizard/StepSpecies";
import { StepTools } from "@/components/wizard/StepTools";
import { STEP_CONTEXT, WIZARD_STEPS } from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

const stepComponents = [
  StepMiRNA,
  StepOperation,
  StepTools,
  StepSpecies,
  StepConfig,
  StepReview,
];

export function Wizard() {
  const step = useWizardStore((state) => state.step);
  const StepComponent = stepComponents[step];

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <StepIndicator />
      </aside>

      <section className="rounded-2xl border border-zinc-200/80 bg-white/85 p-6 shadow-sm backdrop-blur">
        <StepComponent />
      </section>

      <aside className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 text-sm text-zinc-700 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Context</p>
        <p className="mt-2">{STEP_CONTEXT[step]}</p>
        <p className="mt-4 text-xs text-zinc-500">
          Step {step + 1} of {WIZARD_STEPS.length}
        </p>
      </aside>
    </div>
  );
}
