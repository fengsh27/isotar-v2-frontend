"use client";

import { StepConfig } from "@/components/wizard/StepConfig";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { StepMiRNA } from "@/components/wizard/StepMiRNA";
import { StepOperation } from "@/components/wizard/StepOperation";
import { StepReview } from "@/components/wizard/StepReview";
import { StepSpecies } from "@/components/wizard/StepSpecies";
import { StepTools } from "@/components/wizard/StepTools";
import {
  STEP_CONTEXT,
  STEP_CONTEXT_TARGET,
  WIZARD_STEPS_LNCRNA,
  WIZARD_STEPS_TARGET,
  WORKFLOW_LABELS,
} from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

const STEPS_LNCRNA = [StepSpecies, StepMiRNA, StepOperation, StepTools, StepConfig, StepReview];
const STEPS_TARGET = [StepSpecies, StepMiRNA, StepOperation, StepTools, StepConfig, StepReview];

export function Wizard() {
  const step = useWizardStore((state) => state.step);
  const workflow = useWizardStore((state) => state.workflow);

  const stepComponents = workflow === "mir-target" ? STEPS_TARGET : STEPS_LNCRNA;
  const wizardSteps = workflow === "mir-target" ? WIZARD_STEPS_TARGET : WIZARD_STEPS_LNCRNA;
  const contextMap = workflow === "mir-target" ? STEP_CONTEXT_TARGET : STEP_CONTEXT;

  const StepComponent = stepComponents[step];

  // Keyed on workflow so switching between miR-Target and miR-LncRNA remounts
  // the subtree. Both live on /run and differ only by query string, so React
  // would otherwise reconcile in place and the fade-rise animation — which only
  // plays when the element is created — would never replay. Wizard inputs live
  // in the Zustand store, outside React, so the remount preserves them.
  return (
    <div
      key={workflow}
      className="grid gap-6 fade-rise lg:grid-cols-[210px_minmax(0,1fr)_240px]"
    >
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <StepIndicator />
      </aside>

      <section className="surface-panel rounded-3xl p-6 md:p-7">
        <StepComponent />
      </section>

      <aside className="surface-panel rounded-3xl p-5 text-sm text-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Context</p>
        <p className="mt-2 leading-relaxed">{contextMap[step]}</p>
        <p className="mt-4 text-xs text-zinc-500">
          Step {step + 1} of {wizardSteps.length}
        </p>
        <p className="mt-2 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
          {WORKFLOW_LABELS[workflow]}
        </p>
      </aside>
    </div>
  );
}
