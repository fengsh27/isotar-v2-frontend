"use client";

import { useMemo } from "react";
import { Button, Textarea } from "@heroui/react";

import { parsePairs } from "@/lib/pairs";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

export function StepPairs() {
  const pairsText = useNetworkWizardStore((state) => state.pairsText);
  const setPairsText = useNetworkWizardStore((state) => state.setPairsText);
  const back = useNetworkWizardStore((state) => state.back);
  const next = useNetworkWizardStore((state) => state.next);

  const pairs = useMemo(() => parsePairs(pairsText), [pairsText]);
  const mode: "pairs" | "discovery" = pairs.length ? "pairs" : "discovery";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">ceRNA Pairs</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Optionally paste (gene, lncRNA) hypotheses — pairs mode keeps only the pairs bridged by
          at least one miRNA. Leave the box empty to run in discovery mode (top-connected genes
          and lncRNAs are explored automatically).
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 space-y-3">
        <Textarea
          label="Pairs (one per line)"
          placeholder={"TP53\tENST00000610542\nMYC, ENST00000451147"}
          value={pairsText}
          onValueChange={setPairsText}
          description={
            "Format: GENE  LNCRNA (tab, comma, or space separated). Gene as a symbol (e.g. TP53) or RefSeq (NM_…); lncRNA as a transcript ID (e.g. ENST00000…). A leading header row is tolerated."
          }
          minRows={6}
          variant="bordered"
          classNames={{ inputWrapper: "bg-white font-mono" }}
        />

        <div className="flex items-center justify-between text-xs">
          <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700">
            Mode: {mode === "pairs" ? "ceRNA pairs" : "Discovery"}
          </span>
          {pairs.length ? (
            <span className="text-teal-700">{pairs.length} pair(s) parsed.</span>
          ) : (
            <span className="text-zinc-500">No pairs — discovery mode will be used.</span>
          )}
        </div>
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
          <Button color="primary" onPress={next}>
            {pairs.length ? "Next: Prediction Tools" : "Skip → Prediction Tools"}
          </Button>
        </div>
      </div>
    </section>
  );
}
