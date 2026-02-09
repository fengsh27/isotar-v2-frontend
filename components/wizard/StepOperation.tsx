"use client";

import { Alert, Button } from "@heroui/react";

import {
  BASE_OPTIONS,
  evaluateOperationState,
  type NucleotideBase,
} from "@/lib/operation";
import { useWizardStore } from "@/stores/wizardStore";

export function StepOperation() {
  const operationSubstep = useWizardStore((state) => state.operationSubstep);
  const modifications = useWizardStore((state) => state.modifications);
  const shiftLeft = useWizardStore((state) => state.shiftLeft);
  const shiftRight = useWizardStore((state) => state.shiftRight);

  const setOperationSubstep = useWizardStore((state) => state.setOperationSubstep);
  const addModificationRow = useWizardStore((state) => state.addModificationRow);
  const updateModificationRow = useWizardStore((state) => state.updateModificationRow);
  const removeModificationRow = useWizardStore((state) => state.removeModificationRow);
  const setShiftLeft = useWizardStore((state) => state.setShiftLeft);
  const setShiftRight = useWizardStore((state) => state.setShiftRight);

  const next = useWizardStore((state) => state.next);
  const back = useWizardStore((state) => state.back);

  const operationState = evaluateOperationState(modifications, shiftLeft, shiftRight);

  const atModificationSubstep = operationSubstep === "modification";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Operations</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Two optional sub-steps: Modification and Shift. You may skip either one, but cannot skip
          both.
        </p>
      </div>

      {atModificationSubstep ? (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white/80 p-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Sub-step 2.1: Modification (Optional)</h3>
            <p className="mt-1 text-xs text-zinc-600">
              Position refers to the mature miRNA sequence (1-based). Use format: position,
              original base, new base.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-600">
                  <th className="px-2 py-2 font-semibold">Position (1-based)</th>
                  <th className="px-2 py-2 font-semibold">Original Base</th>
                  <th className="px-2 py-2 font-semibold">New Base</th>
                  <th className="px-2 py-2 font-semibold">Remove</th>
                </tr>
              </thead>
              <tbody>
                {modifications.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-zinc-500" colSpan={4}>
                      No modifications added.
                    </td>
                  </tr>
                ) : (
                  modifications.map((row, index) => (
                    <tr key={index} className="border-b border-zinc-100">
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={1}
                          value={row.position}
                          onChange={(event) =>
                            updateModificationRow(index, { position: event.target.value })
                          }
                          className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={row.original}
                          onChange={(event) =>
                            updateModificationRow(index, {
                              original: event.target.value as NucleotideBase,
                            })
                          }
                          className="w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1"
                        >
                          {BASE_OPTIONS.map((base) => (
                            <option key={`${index}-original-${base}`} value={base}>
                              {base}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={row.replacement}
                          onChange={(event) =>
                            updateModificationRow(index, {
                              replacement: event.target.value as NucleotideBase,
                            })
                          }
                          className="w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1"
                        >
                          {BASE_OPTIONS.map((base) => (
                            <option key={`${index}-replacement-${base}`} value={base}>
                              {base}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          isIconOnly
                          aria-label="Remove modification"
                          onPress={() => removeModificationRow(index)}
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Button size="sm" variant="flat" onPress={addModificationRow}>
            + Add modification
          </Button>

          {operationState.hasInvalidModification ? (
            <p className="text-sm font-medium text-red-600">
              Invalid modification rows detected. Position must be an integer &gt;= 1 and
              original/new base cannot be the same.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white/80 p-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Sub-step 2.2: Shift (Optional)</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Shift is applied to mature miRNA boundaries inside the precursor. Negative expands
              left, positive expands right.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="left-shift" className="text-sm font-medium text-zinc-800">
                Left Shift
              </label>
              <input
                id="left-shift"
                type="number"
                value={shiftLeft}
                onChange={(event) => setShiftLeft(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                placeholder="e.g. -2"
              />
            </div>

            <div>
              <label htmlFor="right-shift" className="text-sm font-medium text-zinc-800">
                Right Shift
              </label>
              <input
                id="right-shift"
                type="number"
                value={shiftRight}
                onChange={(event) => setShiftRight(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                placeholder="e.g. 1"
              />
            </div>
          </div>

          {!operationState.hasAtLeastOneOperation ? (
            <p className="text-sm font-medium text-red-600">
              At least one operation is required. You cannot skip both Modification and Shift.
            </p>
          ) : null}

          {operationState.hasInvalidShift ? (
            <Alert
              color="danger"
              title="Shift requires both left and right integer values."
              variant="flat"
            />
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {atModificationSubstep ? (
          <>
            <Button variant="flat" onPress={back}>
              Back: miRNA
            </Button>
            <Button
              color="primary"
              onPress={() => setOperationSubstep("shift")}
              isDisabled={operationState.hasInvalidModification}
            >
              Next: Shift
            </Button>
          </>
        ) : (
          <>
            <Button variant="flat" onPress={() => setOperationSubstep("modification")}>
              Back: Modification
            </Button>
            <Button color="primary" onPress={next} isDisabled={!operationState.isValid}>
              Next: Prediction Tools
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
