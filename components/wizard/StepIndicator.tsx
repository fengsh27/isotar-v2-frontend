"use client";

import { Chip } from "@heroui/react";

import { WIZARD_STEPS } from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

export function StepIndicator() {
  const currentStep = useWizardStore((state) => state.step);

  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-700">
        Analysis Steps
      </h2>
      <ol className="space-y-3">
        {WIZARD_STEPS.map((label, index) => {
          const isCurrent = currentStep === index;
          const isComplete = currentStep > index;

          return (
            <li key={label} className="flex items-center justify-between gap-2 rounded-xl p-2">
              <span
                className={`text-sm ${
                  isCurrent
                    ? "font-semibold text-zinc-900"
                    : isComplete
                      ? "text-zinc-700"
                      : "text-zinc-500"
                }`}
              >
                {index + 1}. {label}
              </span>
              <Chip
                color={isCurrent ? "primary" : isComplete ? "success" : "default"}
                size="sm"
                variant="flat"
              >
                {isCurrent ? "Current" : isComplete ? "Done" : "Pending"}
              </Chip>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
