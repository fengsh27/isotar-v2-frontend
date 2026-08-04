"use client";

import { NetworkStepIndicator } from "@/components/wizard-network/NetworkStepIndicator";
import { StepConfig } from "@/components/wizard-network/StepConfig";
import { StepMirnas } from "@/components/wizard-network/StepMirnas";
import { StepPairs } from "@/components/wizard-network/StepPairs";
import { StepReview } from "@/components/wizard-network/StepReview";
import { StepSpecies } from "@/components/wizard-network/StepSpecies";
import { StepTools } from "@/components/wizard-network/StepTools";
import {
  STEP_CONTEXT_NETWORK,
  WIZARD_STEPS_NETWORK,
  WORKFLOW_LABELS,
} from "@/lib/constants";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

const STEPS = [StepSpecies, StepMirnas, StepPairs, StepTools, StepConfig, StepReview];

export function NetworkWizard() {
  const step = useNetworkWizardStore((state) => state.step);
  const StepComponent = STEPS[step];

  return (
    <div className="grid gap-6 fade-rise lg:grid-cols-[210px_minmax(0,1fr)_240px]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <NetworkStepIndicator />
      </aside>

      <section className="surface-panel rounded-3xl p-6 md:p-7">
        <StepComponent />
      </section>

      <aside className="surface-panel rounded-3xl p-5 text-sm text-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Context</p>
        <p className="mt-2 leading-relaxed">{STEP_CONTEXT_NETWORK[step]}</p>
        <p className="mt-4 text-xs text-zinc-500">
          Step {step + 1} of {WIZARD_STEPS_NETWORK.length}
        </p>
        <p className="mt-2 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
          {WORKFLOW_LABELS["mir-network"]}
        </p>
      </aside>
    </div>
  );
}
