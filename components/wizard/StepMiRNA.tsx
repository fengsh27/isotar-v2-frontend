"use client";

import { useState } from "react";
import { Alert, Button, Chip, Input } from "@heroui/react";

import { validateMiRNA } from "@/lib/api";
import type { MirnaValidationResponse } from "@/lib/types";
import { useWizardStore } from "@/stores/wizardStore";

function deriveFamily(mirnaId: string): string {
  const normalized = mirnaId.trim();
  const family = normalized.match(/mir-([0-9a-z-]+)/i)?.[1];
  return family ? `miR-${family.split("-")[0]}` : "Not provided";
}

export function StepMiRNA() {
  const mirnaId = useWizardStore((state) => state.mirnaId);
  const setMirnaId = useWizardStore((state) => state.setMirnaId);
  const next = useWizardStore((state) => state.next);

  const [value, setValue] = useState(mirnaId);
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">(
    mirnaId ? "valid" : "idle",
  );
  const [message, setMessage] = useState<string>("");
  const [validationData, setValidationData] = useState<MirnaValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  async function onValidate() {
    setIsValidating(true);
    setMessage("");

    try {
      const result = await validateMiRNA(value);

      if (!result.valid) {
        setStatus("invalid");
        setMirnaId("");
        setValidationData(null);
        setMessage(
          result.message ??
            "The miRNA ID could not be validated. Verify species prefix and mature arm.",
        );
        return;
      }

      const canonical = result.canonical_id ?? value.trim();
      setValue(canonical);
      setMirnaId(canonical);
      setValidationData(result);
      setStatus("valid");
      setMessage(result.message ?? "Validated against backend miRNA registry.");
    } catch (error) {
      setStatus("invalid");
      setMirnaId("");
      setValidationData(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Validation failed due to an unexpected server response.",
      );
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Select miRNA</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Enter one miRNA identifier (example: <code>hsa-miR-495-3p</code>) and validate
          before continuing.
        </p>
      </div>

      <Input
        label="miRNA ID"
        placeholder="hsa-miR-495-3p"
        value={value}
        onValueChange={(nextValue) => {
          setValue(nextValue);
          setStatus("idle");
          setValidationData(null);
          setMessage("");
        }}
        isInvalid={status === "invalid"}
        errorMessage={status === "invalid" ? message : undefined}
        endContent={
          status === "valid" ? (
            <Chip size="sm" color="success" variant="flat">
              Valid
            </Chip>
          ) : null
        }
      />

      {status === "valid" && message ? (
        <Alert color="success" title={message} variant="flat" />
      ) : null}

      {status === "valid" ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <p className="mb-3 text-sm font-semibold text-zinc-900">miRNA Information</p>
          <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            <p>
              <strong>Name:</strong> {validationData?.metadata?.name ?? value.trim()}
            </p>
            <p>
              <strong>Family:</strong>{" "}
              {validationData?.metadata?.family ?? deriveFamily(value.trim())}
            </p>
            <p>
              <strong>Length:</strong>{" "}
              {validationData?.metadata?.length_nt
                ? `${validationData.metadata.length_nt} nt`
                : "Not provided"}
            </p>
            <p>
              <strong>Source:</strong> {validationData?.metadata?.source ?? "Validation API"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button onPress={onValidate} isLoading={isValidating}>
          Validate miRNA
        </Button>
        <Button color="primary" onPress={next} isDisabled={status !== "valid"}>
          Next: Operation
        </Button>
      </div>
    </section>
  );
}
