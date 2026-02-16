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
  StepSpecies,
  StepMiRNA,
  StepOperation,
  StepTools,
  StepConfig,
  StepReview,
];

export function Wizard() {
  const step = useWizardStore((state) => state.step);
  const StepComponent = stepComponents[step];

  return (
    <div className="grid gap-6 fade-rise lg:grid-cols-[210px_minmax(0,1fr)_240px]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <StepIndicator />
      </aside>

      <section className="surface-panel rounded-3xl p-6 md:p-7">
        <StepComponent />
      </section>

      <aside className="surface-panel rounded-3xl p-5 text-sm text-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Context</p>
        <p className="mt-2 leading-relaxed">{STEP_CONTEXT[step]}</p>
        <p className="mt-4 text-xs text-zinc-500">
          Step {step + 1} of {WIZARD_STEPS.length}
        </p>
      </aside>
    </div>
  );
}
