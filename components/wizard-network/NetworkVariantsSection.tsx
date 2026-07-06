"use client";

import { useEffect, useMemo } from "react";
import { Alert, Button } from "@heroui/react";

import {
  BASE_OPTIONS,
  evaluateOperationState,
  type NucleotideBase,
} from "@/lib/operation";
import { resolvePrecursor, type MirnaDataset, type MirnaRecord } from "@/lib/mirnaData";
import {
  useNetworkWizardStore,
  type NetworkVariantEditor,
} from "@/stores/networkWizardStore";

const MIN_MATURE_LENGTH = 17;
const MAX_MATURE_LENGTH = 30;

function parseInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

/** Compute the shifted mature sequence for a variant, mirroring backend
 *  `apply_shift` semantics. Returns null when the shift is not fully typed or
 *  the boundaries fall outside the precursor. */
function shiftedMature(
  record: MirnaRecord | null,
  shiftLeft: string,
  shiftRight: string,
): { seq: string; start: number; end: number; length: number } | null {
  if (!record) return null;
  const rp = resolvePrecursor(record);
  const left = parseInteger(shiftLeft) ?? 0;
  const right = parseInteger(shiftRight) ?? 0;
  const start = rp.matureStart + left;
  const end = rp.matureEnd + right;
  if (start < 1 || end > rp.seq.length || end < start) return null;
  const seq = rp.seq.slice(start - 1, end);
  return { seq, start, end, length: seq.length };
}

function baseAtPosition(seq: string, position: string): NucleotideBase | "" {
  const trimmed = position.trim();
  if (!/^\d+$/.test(trimmed)) return "";
  const idx = parseInt(trimmed, 10) - 1;
  if (idx < 0 || idx >= seq.length) return "";
  const b = seq[idx]?.toUpperCase() ?? "";
  return (BASE_OPTIONS as readonly string[]).includes(b) ? (b as NucleotideBase) : "";
}

function pickRecord(
  dataset: MirnaDataset | null,
  mirnaId: string,
  preId: string | undefined,
): MirnaRecord | null {
  const records = dataset?.[mirnaId];
  if (!records?.length) return null;
  if (preId) {
    const hit = records.find((r) => r.pre_id === preId);
    if (hit) return hit;
  }
  return records[0];
}

/** Describe a variant with the same phrasing the backend uses in node
 *  labels ("shifted -7|1", "modified 8:A|U", "modified+shifted …"). */
function summarizeVariant(editor: NetworkVariantEditor): string {
  const ev = evaluateOperationState(editor.rows, editor.shiftLeft, editor.shiftRight);
  const parts: string[] = [];
  if (ev.formattedModifications.length) {
    parts.push(`modified ${ev.formattedModifications.join(",")}`);
  }
  if (ev.shift) parts.push(`shifted ${ev.shift}`);
  return parts.length ? parts.join("+") : "empty — set shift or add a modification";
}

interface VariantEditorViewProps {
  index: number;
  editor: NetworkVariantEditor;
  record: MirnaRecord | null;
  onRemove: () => void;
  onUpdate: (patch: Partial<Omit<NetworkVariantEditor, "key">>) => void;
}

function VariantEditorView({
  index,
  editor,
  record,
  onRemove,
  onUpdate,
}: VariantEditorViewProps) {
  const opState = evaluateOperationState(editor.rows, editor.shiftLeft, editor.shiftRight);
  const shifted = shiftedMature(record, editor.shiftLeft, editor.shiftRight);
  const referenceSeq = shifted?.seq ?? record?.mature_seq ?? "";
  const length = shifted?.length ?? referenceSeq.length;

  // Keep each row's `original` in sync with the reference sequence — the
  // shifted mature can change under the modifications when the user edits
  // shift after adding a row. A stale `original` would silently misencode the
  // payload (backend rejects "expected X, found Y" at prediction time).
  useEffect(() => {
    if (!editor.rows.length) return;
    const nextRows = editor.rows.map((row) => {
      const derived = baseAtPosition(referenceSeq, row.position);
      return row.original === derived ? row : { ...row, original: derived };
    });
    if (nextRows.some((r, i) => r !== editor.rows[i])) {
      onUpdate({ rows: nextRows });
    }
  }, [referenceSeq, editor.rows, onUpdate]);
  const shiftFullyTyped =
    editor.shiftLeft.trim() !== "" && editor.shiftRight.trim() !== "";
  const boundaryInvalid = shiftFullyTyped && !shifted && record !== null;
  const tooShort = length > 0 && length < MIN_MATURE_LENGTH;
  const tooLong = length > MAX_MATURE_LENGTH;

  const addRow = () =>
    onUpdate({
      rows: [...editor.rows, { position: "", original: "", replacement: "G" }],
    });
  const patchRow = (rowIndex: number, patch: Partial<NetworkVariantEditor["rows"][number]>) =>
    onUpdate({
      rows: editor.rows.map((row, i) => (i === rowIndex ? { ...row, ...patch } : row)),
    });
  const removeRow = (rowIndex: number) =>
    onUpdate({ rows: editor.rows.filter((_, i) => i !== rowIndex) });

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-zinc-600">Variant {index + 1}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{summarizeVariant(editor)}</p>
        </div>
        <Button
          size="sm"
          variant="light"
          color="danger"
          onPress={onRemove}
          aria-label={`Remove variant ${index + 1}`}
        >
          Remove
        </Button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-zinc-700">Left Shift</label>
          <input
            type="number"
            value={editor.shiftLeft}
            onChange={(e) => onUpdate({ shiftLeft: e.target.value })}
            placeholder="e.g. -2"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-700">Right Shift</label>
          <input
            type="number"
            value={editor.shiftRight}
            onChange={(e) => onUpdate({ shiftRight: e.target.value })}
            placeholder="e.g. 1"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium text-zinc-700">Modifications</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Position is 1-based on the mature sequence (after shift). Original base
          is inferred from the sequence.
        </p>
        {editor.rows.length ? (
          <div className="mt-2 space-y-2">
            {editor.rows.map((row, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5"
              >
                <input
                  type="number"
                  min={1}
                  value={row.position}
                  onChange={(e) => {
                    const position = e.target.value;
                    patchRow(i, {
                      position,
                      original: baseAtPosition(referenceSeq, position),
                    });
                  }}
                  placeholder="pos"
                  className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
                  aria-label="Position"
                />
                <span className="inline-flex min-w-16 items-center justify-center rounded border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800">
                  {row.original || "—"}
                </span>
                <span className="text-xs text-zinc-500">→</span>
                <select
                  value={row.replacement}
                  onChange={(e) =>
                    patchRow(i, { replacement: e.target.value as NucleotideBase })
                  }
                  className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                  aria-label="Replacement base"
                >
                  {BASE_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="light"
                  color="danger"
                  isIconOnly
                  onPress={() => removeRow(i)}
                  aria-label="Remove modification"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <Button size="sm" variant="flat" className="mt-2" onPress={addRow}>
          + Add modification
        </Button>
      </div>

      {opState.hasInvalidShift ? (
        <Alert
          color="danger"
          variant="flat"
          title="Shift requires both left and right integer values."
          className="mt-3"
        />
      ) : null}

      {opState.hasInvalidModification ? (
        <Alert
          color="danger"
          variant="flat"
          title="Invalid modification row."
          description="Position must be an integer ≥ 1, and the original and new base must differ."
          className="mt-3"
        />
      ) : null}

      {boundaryInvalid ? (
        <Alert
          color="danger"
          variant="flat"
          title="Shift falls outside the precursor."
          description="Adjust the left/right shift so both boundaries lie within the precursor sequence."
          className="mt-3"
        />
      ) : null}

      {(tooShort || tooLong) && record ? (
        <Alert
          color="danger"
          variant="flat"
          title={
            tooShort
              ? "Shifted sequence is too short."
              : "Shifted sequence is too long."
          }
          description={`Resulting mature sequence has ${length} nt. Allowed length is ${MIN_MATURE_LENGTH}–${MAX_MATURE_LENGTH} nt.`}
          className="mt-3"
        />
      ) : null}
    </div>
  );
}

interface MirnaVariantsRowProps {
  mirnaId: string;
  record: MirnaRecord | null;
  editors: NetworkVariantEditor[];
}

function MirnaVariantsRow({ mirnaId, record, editors }: MirnaVariantsRowProps) {
  const addVariant = useNetworkWizardStore((state) => state.addVariant);
  const removeVariant = useNetworkWizardStore((state) => state.removeVariant);
  const updateVariant = useNetworkWizardStore((state) => state.updateVariant);

  const count = editors.length;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-sm text-zinc-800">{mirnaId}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            WT + {count} variant{count === 1 ? "" : "s"}
          </p>
        </div>
        <Button size="sm" variant="flat" color="primary" onPress={() => addVariant(mirnaId)}>
          + Add variant
        </Button>
      </div>
      {count ? (
        <div className="mt-3 space-y-3">
          {editors.map((v, i) => (
            <VariantEditorView
              key={v.key}
              index={i}
              editor={v}
              record={record}
              onRemove={() => removeVariant(mirnaId, v.key)}
              onUpdate={(patch) => updateVariant(mirnaId, v.key, patch)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Check whether the current variant state is submittable. Mirrors the
 *  per-variant gates in `VariantEditorView` so `StepMirnas` can disable Next
 *  when any variant is invalid or out of range. */
export function useVariantsValidity(dataset: MirnaDataset | null): boolean {
  const selectedMirnas = useNetworkWizardStore((state) => state.selectedMirnas);
  const preIds = useNetworkWizardStore((state) => state.preIds);
  const variants = useNetworkWizardStore((state) => state.variants);

  return useMemo(() => {
    for (const mirnaId of selectedMirnas) {
      const editors = variants[mirnaId];
      if (!editors?.length) continue;
      const record = pickRecord(dataset, mirnaId, preIds[mirnaId]);
      for (const v of editors) {
        const ev = evaluateOperationState(v.rows, v.shiftLeft, v.shiftRight);
        if (!ev.isValid) return false;
        const shiftTyped = v.shiftLeft.trim() !== "" && v.shiftRight.trim() !== "";
        if (shiftTyped) {
          const shifted = shiftedMature(record, v.shiftLeft, v.shiftRight);
          if (!shifted) return false;
          if (shifted.length < MIN_MATURE_LENGTH || shifted.length > MAX_MATURE_LENGTH) {
            return false;
          }
        }
      }
    }
    return true;
  }, [selectedMirnas, preIds, variants, dataset]);
}

interface NetworkVariantsSectionProps {
  dataset: MirnaDataset | null;
}

export function NetworkVariantsSection({ dataset }: NetworkVariantsSectionProps) {
  const selectedMirnas = useNetworkWizardStore((state) => state.selectedMirnas);
  const preIds = useNetworkWizardStore((state) => state.preIds);
  const variants = useNetworkWizardStore((state) => state.variants);

  if (!selectedMirnas.length) return null;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-3">
      <div>
        <p className="text-sm font-medium text-zinc-800">Variants (optional)</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Add a shifted or modified variant of any selected miRNA. Each variant
          becomes its own graph node next to the WT baseline, so you can compare
          predictions side by side.
        </p>
      </div>
      {selectedMirnas.map((id) => (
        <MirnaVariantsRow
          key={id}
          mirnaId={id}
          record={pickRecord(dataset, id, preIds[id])}
          editors={variants[id] ?? []}
        />
      ))}
    </div>
  );
}
