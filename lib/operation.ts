import type { OperationType } from "@/lib/types";

export const BASE_OPTIONS = ["A", "C", "G", "T", "U"] as const;

export type NucleotideBase = (typeof BASE_OPTIONS)[number];

export interface ModificationInput {
  position: string;
  original: NucleotideBase | "";
  replacement: NucleotideBase;
}

export interface OperationEvaluation {
  formattedModifications: string[];
  hasAnyModificationRow: boolean;
  hasInvalidModification: boolean;
  hasProvidedModification: boolean;
  shift: string | null;
  hasAnyShiftInput: boolean;
  hasInvalidShift: boolean;
  hasProvidedShift: boolean;
  hasAtLeastOneOperation: boolean;
  isValid: boolean;
  operationType?: OperationType;
}

function isIntegerString(value: string): boolean {
  return /^-?\d+$/.test(value.trim());
}

function isBase(value: string): value is NucleotideBase {
  return (BASE_OPTIONS as readonly string[]).includes(value);
}

function normalizeInt(value: string): string {
  return String(parseInt(value, 10));
}

function isValidModificationRow(row: ModificationInput): boolean {
  if (!isIntegerString(row.position)) {
    return false;
  }

  const pos = parseInt(row.position, 10);
  if (!Number.isFinite(pos) || pos < 1) {
    return false;
  }

  if (!isBase(row.original) || !isBase(row.replacement)) {
    return false;
  }

  return row.original !== row.replacement;
}

export function evaluateOperationState(
  modifications: ModificationInput[],
  shiftLeft: string,
  shiftRight: string,
): OperationEvaluation {
  const hasAnyModificationRow = modifications.length > 0;
  const validRows = modifications.filter(isValidModificationRow);
  const hasInvalidModification = hasAnyModificationRow && validRows.length !== modifications.length;

  const formattedModifications = validRows.map(
    (row) => `${normalizeInt(row.position)}:${row.original}|${row.replacement}`,
  );

  const hasProvidedModification = formattedModifications.length > 0 && !hasInvalidModification;

  const left = shiftLeft.trim();
  const right = shiftRight.trim();
  const hasAnyShiftInput = left !== "" || right !== "";

  const hasValidShift = isIntegerString(left) && isIntegerString(right);
  const shift = hasValidShift ? `${normalizeInt(left)}|${normalizeInt(right)}` : null;

  const hasInvalidShift = hasAnyShiftInput && !hasValidShift;
  const hasProvidedShift = hasValidShift;

  const hasAtLeastOneOperation = hasProvidedModification || hasProvidedShift;
  const isValid = !hasInvalidModification && !hasInvalidShift;

  let operationType: OperationType | undefined;
  if (hasProvidedModification) {
    operationType = "modification";
  } else if (hasProvidedShift) {
    operationType = "shift";
  }

  return {
    formattedModifications,
    hasAnyModificationRow,
    hasInvalidModification,
    hasProvidedModification,
    shift,
    hasAnyShiftInput,
    hasInvalidShift,
    hasProvidedShift,
    hasAtLeastOneOperation,
    isValid,
    operationType,
  };
}
