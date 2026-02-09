"use client";

import { WIZARD_STEPS } from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

export function StepIndicator() {
  const currentStep = useWizardStore((state) => state.step);

  return (
    <div className="surface-panel rounded-3xl p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-700">
        Analysis Steps
      </h2>
      <ol className="space-y-2">
        {WIZARD_STEPS.map((label, index) => {
          const isCurrent = currentStep === index;
          const isComplete = currentStep > index;

          return (
            <li
              key={label}
              className={`relative flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                isCurrent ? "bg-teal-50/70" : "bg-transparent"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isCurrent
                      ? "bg-teal-600 text-white"
                      : isComplete
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-sm ${
                    isCurrent
                      ? "font-semibold text-zinc-900"
                    : isComplete
                        ? "text-emerald-700"
                        : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
