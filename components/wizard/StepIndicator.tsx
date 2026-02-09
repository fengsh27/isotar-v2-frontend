"use client";

import { evaluateOperationState } from "@/lib/operation";
import { WIZARD_STEPS } from "@/lib/constants";
import { useWizardStore } from "@/stores/wizardStore";

export function StepIndicator() {
  const currentStep = useWizardStore((state) => state.step);
  const goToStep = useWizardStore((state) => state.goToStep);
  const operationSubstep = useWizardStore((state) => state.operationSubstep);
  const modifications = useWizardStore((state) => state.modifications);
  const shiftLeft = useWizardStore((state) => state.shiftLeft);
  const shiftRight = useWizardStore((state) => state.shiftRight);

  const opState = evaluateOperationState(modifications, shiftLeft, shiftRight);

  return (
    <div className="surface-panel rounded-3xl p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-700">
        Analysis Steps
      </h2>
      <ol className="space-y-2">
        {WIZARD_STEPS.map((label, index) => {
          const isCurrent = currentStep === index;
          const isComplete = currentStep > index;
          const isJumpable = isComplete;

          return (
            <li
              key={label}
              className={`relative rounded-xl px-3 py-2 ${isCurrent ? "bg-teal-50/70" : "bg-transparent"}`}
            >
              <button
                type="button"
                onClick={() => {
                  if (isJumpable) {
                    goToStep(index);
                  }
                }}
                disabled={!isJumpable}
                className={`flex w-full items-center gap-2 text-left ${
                  isJumpable ? "cursor-pointer" : "cursor-default"
                }`}
              >
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
              </button>

              {index === 1 ? (
                <div className="mt-2 space-y-1 pl-8 text-xs">
                  <p
                    className={
                      currentStep === 1 && operationSubstep === "modification"
                        ? "font-semibold text-teal-700"
                        : opState.hasProvidedModification
                          ? "text-emerald-700"
                          : opState.hasInvalidModification
                            ? "text-red-600"
                            : "text-zinc-400"
                    }
                  >
                    Sub-step: Modification
                  </p>
                  <p
                    className={
                      currentStep === 1 && operationSubstep === "shift"
                        ? "font-semibold text-teal-700"
                        : opState.hasProvidedShift
                          ? "text-emerald-700"
                          : opState.hasInvalidShift
                            ? "text-red-600"
                            : "text-zinc-400"
                    }
                  >
                    Sub-step: Shift
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
