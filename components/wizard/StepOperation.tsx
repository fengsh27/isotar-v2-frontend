"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button } from "@heroui/react";

import {
  BASE_OPTIONS,
  evaluateOperationState,
  type NucleotideBase,
} from "@/lib/operation";
import { useWizardStore } from "@/stores/wizardStore";

type MirnaRecord = {
  pre_id: string;
  pre_seq: string;
  mature_seq: string;
  mature_loc_start: number;
  mature_loc_end: number;
};

type MirnaDataset = Record<string, MirnaRecord[]>;

function buildCaretLine(length: number, start: number, end: number): string {
  const safeStart = Math.min(Math.max(1, start), length);
  const safeEnd = Math.min(Math.max(1, end), length);

  if (safeStart >= safeEnd) {
    return `${" ".repeat(safeStart - 1)}^`;
  }

  return `${" ".repeat(safeStart - 1)}^${" ".repeat(safeEnd - safeStart - 1)}^`;
}

function parseShiftPreviewValue(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  return /^-?\d+$/.test(trimmed) ? parseInt(trimmed, 10) : 0;
}

function getBaseAtPosition(sequence: string, position: string): NucleotideBase | null {
  const trimmed = position.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const index = parseInt(trimmed, 10) - 1;
  if (index < 0 || index >= sequence.length) {
    return null;
  }

  const base = sequence[index]?.toUpperCase() ?? "";
  if (!BASE_OPTIONS.includes(base as NucleotideBase)) {
    return null;
  }

  return base as NucleotideBase;
}

export function StepOperation() {
  const operationSubstep = useWizardStore((state) => state.operationSubstep);
  const mirnaId = useWizardStore((state) => state.mirnaId);
  const species = useWizardStore((state) => state.species);
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

  const [selectedRecord, setSelectedRecord] = useState<MirnaRecord | null>(null);

  useEffect(() => {
    let active = true;

    const loadRecord = async () => {
      if (!mirnaId || species !== "9606") {
        setSelectedRecord(null);
        return;
      }

      try {
        const loaded = (await import("@/data/mature_pre_mirna_ext.json")).default as MirnaDataset;
        if (!active) {
          return;
        }

        setSelectedRecord(loaded[mirnaId]?.[0] ?? null);
      } catch {
        if (!active) {
          return;
        }

        setSelectedRecord(null);
      }
    };

    loadRecord();

    return () => {
      active = false;
    };
  }, [mirnaId, species]);

  const operationState = evaluateOperationState(modifications, shiftLeft, shiftRight);
  const atShiftSubstep = operationSubstep === "shift";

  const shiftPreview = useMemo(() => {
    if (!selectedRecord) {
      return null;
    }

    const left = parseShiftPreviewValue(shiftLeft);
    const right = parseShiftPreviewValue(shiftRight);
    const rawStart = selectedRecord.mature_loc_start + left;
    const rawEnd = selectedRecord.mature_loc_end + right;
    const length = selectedRecord.pre_seq.length;
    const clampedStart = Math.min(Math.max(1, rawStart), length);
    const clampedEnd = Math.min(Math.max(1, rawEnd), length);

    return buildCaretLine(
      length,
      clampedStart,
      clampedEnd,
    );
  }, [selectedRecord, shiftLeft, shiftRight]);

  const shiftedMatureSequence = useMemo(() => {
    if (!selectedRecord) {
      return null;
    }

    const left = parseShiftPreviewValue(shiftLeft);
    const right = parseShiftPreviewValue(shiftRight);
    const rawStart = selectedRecord.mature_loc_start + left;
    const rawEnd = selectedRecord.mature_loc_end + right;
    const length = selectedRecord.pre_seq.length;
    const clampedStart = Math.min(Math.max(1, rawStart), length);
    const clampedEnd = Math.min(Math.max(1, rawEnd), length);

    if (clampedStart > clampedEnd) {
      return null;
    }

    return {
      sequence: selectedRecord.pre_seq.slice(clampedStart - 1, clampedEnd),
      start: clampedStart,
      end: clampedEnd,
    };
  }, [selectedRecord, shiftLeft, shiftRight]);

  const modificationReferenceSeq = shiftedMatureSequence?.sequence ?? selectedRecord?.mature_seq ?? "";

  useEffect(() => {
    if (!modifications.length) {
      return;
    }

    let hasAnyChange = false;

    modifications.forEach((row, index) => {
      const derivedBase = getBaseAtPosition(modificationReferenceSeq, row.position);
      const nextOriginal = derivedBase ?? "";

      if (row.original !== nextOriginal) {
        hasAnyChange = true;
        updateModificationRow(index, { original: nextOriginal });
      }
    });

    if (!hasAnyChange) {
      return;
    }
  }, [modificationReferenceSeq, modifications, updateModificationRow]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Operations</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Two optional sub-steps in sequence: Shift, then Modification. You may skip either one,
          but cannot skip both.
        </p>
      </div>

      {atShiftSubstep ? (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white/80 p-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Sub-step: Shift (Optional)</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Shift is applied to mature miRNA boundaries inside the precursor. Negative expands
              left, positive expands right.
            </p>
          </div>

          {selectedRecord ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
              <p className="text-sm font-semibold text-zinc-900">Precursor sequence reference</p>
              <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs text-zinc-800">
                {selectedRecord.pre_seq}
                {"\n"}
                {shiftPreview}
              </pre>
            </div>
          ) : null}

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

          {operationState.hasInvalidShift ? (
            <Alert
              color="danger"
              title="Shift requires both left and right integer values."
              variant="flat"
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white/80 p-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Sub-step: Modification (Optional)</h3>
            <p className="mt-1 text-xs text-zinc-600">
              Position refers to the mature miRNA sequence (1-based). Use format: position,
              original base, new base.
            </p>
          </div>

          {selectedRecord ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
              <p className="text-sm font-semibold text-zinc-900">
                Mature sequence reference (after shift)
              </p>
              <code className="mt-2 inline-block rounded bg-white px-2 py-1 text-sm text-zinc-900">
                {shiftedMatureSequence?.sequence ?? selectedRecord.mature_seq}
              </code>
              <p className="mt-1 text-xs text-zinc-600">
                Location: {shiftedMatureSequence?.start ?? selectedRecord.mature_loc_start}-
                {shiftedMatureSequence?.end ?? selectedRecord.mature_loc_end}
              </p>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-600">
                  <th className="px-2 py-2 font-semibold">Position (1-based)</th>
                  <th className="px-2 py-2 font-semibold">Original Base (read-only)</th>
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
                          onChange={(event) => {
                            const position = event.target.value;
                            const derivedBase = getBaseAtPosition(modificationReferenceSeq, position);
                            updateModificationRow(index, {
                              position,
                              original: derivedBase ?? "",
                            });
                          }}
                          className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <span className="inline-flex min-w-24 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 px-2 py-1 text-sm font-medium text-zinc-800">
                          {row.original || "-"}
                        </span>
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

          {!operationState.hasAtLeastOneOperation ? (
            <p className="text-sm font-medium text-red-600">
              At least one operation is required. You cannot skip both Shift and Modification.
            </p>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {atShiftSubstep ? (
          <>
            <Button variant="flat" onPress={back}>
              Back: miRNA
            </Button>
            <Button
              color="primary"
              onPress={() => setOperationSubstep("modification")}
              isDisabled={operationState.hasInvalidShift}
            >
              Next: Modification
            </Button>
          </>
        ) : (
          <>
            <Button variant="flat" onPress={() => setOperationSubstep("shift")}>
              Back: Shift
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
