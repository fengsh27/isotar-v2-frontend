"use client";

import { useMemo } from "react";
import { Alert, Button, Textarea } from "@heroui/react";

import { MAX_NETWORK_PAIRS } from "@/lib/constants";
import { parsePairs } from "@/lib/pairs";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

const MALFORMED_REASON_COPY: Record<
  "missing_fields" | "invalid_score",
  string
> = {
  missing_fields: "needs GENE, LNCRNA, and a numeric SCORE (three fields)",
  invalid_score: "score column is not a number",
};

export function StepPairs() {
  const pairsText = useNetworkWizardStore((state) => state.pairsText);
  const setPairsText = useNetworkWizardStore((state) => state.setPairsText);
  const back = useNetworkWizardStore((state) => state.back);
  const next = useNetworkWizardStore((state) => state.next);

  const parsed = useMemo(() => parsePairs(pairsText), [pairsText]);
  const { pairs, malformed } = parsed;
  const mode: "pairs" | "discovery" = pairs.length ? "pairs" : "discovery";
  const overLimit = pairs.length > MAX_NETWORK_PAIRS;
  const hasMalformed = malformed.length > 0;
  const canProceed = !overLimit && !hasMalformed;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">ceRNA Pairs</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Optionally paste (gene, lncRNA, score) triples — pairs mode keeps only the pairs bridged
          by at least one miRNA. Leave the box empty to run in discovery mode (top-connected genes
          and lncRNAs are explored automatically).
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 space-y-3">
        <Textarea
          label="Pairs (one per line)"
          placeholder={"TP53\tENST00000610542\t0.87\nMYC, ENST00000451147, 0.62"}
          value={pairsText}
          onValueChange={setPairsText}
          description={
            "Format: GENE  LNCRNA  SCORE (tab, comma, or space separated). Gene as a symbol (e.g. TP53) or RefSeq (NM_…); lncRNA as a transcript ID (e.g. ENST00000…). Score is a required numeric ranking / correlation — the frontend forwards it to the backend but does not consume it yet. A leading header row (gene lncrna score) is tolerated."
          }
          minRows={6}
          variant="bordered"
          classNames={{ inputWrapper: "bg-white font-mono" }}
        />

        <div className="flex items-center justify-between text-xs">
          <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700">
            Mode: {mode === "pairs" ? "ceRNA pairs" : "Discovery"}
          </span>
          {pairs.length || malformed.length ? (
            <span
              className={
                overLimit || hasMalformed
                  ? "font-medium text-red-600"
                  : "text-teal-700"
              }
            >
              {pairs.length} pair(s) parsed
              {hasMalformed ? `, ${malformed.length} line(s) invalid` : ""}.
            </span>
          ) : (
            <span className="text-zinc-500">No pairs — discovery mode will be used.</span>
          )}
        </div>

        {overLimit ? (
          <p className="text-xs font-medium text-red-600">
            Too many pairs: {pairs.length} parsed, but at most {MAX_NETWORK_PAIRS} are
            allowed. Remove {pairs.length - MAX_NETWORK_PAIRS} to continue.
          </p>
        ) : null}

        {hasMalformed ? (
          <Alert
            color="warning"
            variant="flat"
            title={`Fix ${malformed.length} invalid line${
              malformed.length === 1 ? "" : "s"
            } to continue.`}
            description={
              <ul className="ml-4 mt-1 list-disc space-y-0.5 text-xs">
                {malformed.slice(0, 8).map((m) => (
                  <li key={m.line}>
                    line {m.line}: {MALFORMED_REASON_COPY[m.reason]} —{" "}
                    <span className="font-mono">{m.raw}</span>
                  </li>
                ))}
                {malformed.length > 8 ? (
                  <li>…and {malformed.length - 8} more.</li>
                ) : null}
              </ul>
            }
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="flat" onPress={back}>
          Back: miRNAs
        </Button>
        <div className="flex flex-wrap gap-3">
          {pairsText ? (
            <Button variant="flat" onPress={() => setPairsText("")}>
              Clear & use discovery
            </Button>
          ) : null}
          <Button color="primary" onPress={next} isDisabled={!canProceed}>
            {pairs.length ? "Next: Prediction Tools" : "Skip → Prediction Tools"}
          </Button>
        </div>
      </div>
    </section>
  );
}
