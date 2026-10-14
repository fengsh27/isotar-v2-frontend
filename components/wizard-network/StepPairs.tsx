"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Chip, Spinner, Textarea } from "@heroui/react";

import { validateTargets } from "@/lib/api";
import {
  MAX_NETWORK_PAIRS,
  MIN_NETWORK_PAIRS,
  SPECIES_OPTIONS,
} from "@/lib/constants";
import {
  CORR_COLUMNS,
  CORR_LABELS,
  DEFAULT_CORR,
  effectiveCorr,
  parsePairs,
  type CorrKey,
  type MalformedPair,
} from "@/lib/pairs";
import { useNetworkWizardStore } from "@/stores/networkWizardStore";

const MALFORMED_REASON_COPY: Record<MalformedPair["reason"], string> = {
  missing_fields: "needs at least a gene and a lncRNA",
  too_many_fields: "has more than 5 columns",
  invalid_score: "is not a number",
  out_of_range: "is outside 0–1 — correlations are magnitudes",
};

function describeMalformed(entry: MalformedPair): string {
  const copy = MALFORMED_REASON_COPY[entry.reason];
  return entry.column ? `${CORR_LABELS[entry.column]} ${copy}` : copy;
}

/** Debounce window before the identifier check fires, so typing a long paste
 *  doesn't issue a request per keystroke. */
const VALIDATE_DEBOUNCE_MS = 600;

export function StepPairs() {
  const pairsText = useNetworkWizardStore((state) => state.pairsText);
  const setPairsText = useNetworkWizardStore((state) => state.setPairsText);
  const species = useNetworkWizardStore((state) => state.species);
  const humanReference = useNetworkWizardStore((state) => state.humanReference);
  const invalidPairTargets = useNetworkWizardStore((state) => state.invalidPairTargets);
  const setInvalidPairTargets = useNetworkWizardStore(
    (state) => state.setInvalidPairTargets,
  );
  const back = useNetworkWizardStore((state) => state.back);
  const next = useNetworkWizardStore((state) => state.next);

  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  // lncRNA IDs that exist but name a gene rather than a transcript. Predictions
  // are reported per transcript, so these would bridge nothing.
  const [lncrnaGeneIds, setLncrnaGeneIds] = useState<string[]>([]);

  const parsed = useMemo(() => parsePairs(pairsText), [pairsText]);
  const { pairs, malformed } = parsed;

  const genome =
    species === "9606"
      ? humanReference || "hg38"
      : SPECIES_OPTIONS.find((o) => o.value === species)?.genome ?? "hg38";

  const negatedCount = useMemo(
    () => pairs.reduce((total, pair) => total + pair.negated.length, 0),
    [pairs],
  );
  const defaultedCount = useMemo(
    () => pairs.reduce((total, pair) => total + pair.defaulted.length, 0),
    [pairs],
  );

  const overLimit = pairs.length > MAX_NETWORK_PAIRS;
  const hasMalformed = malformed.length > 0;
  const hasInvalidTargets =
    invalidPairTargets.genes.length > 0 || invalidPairTargets.lncrnas.length > 0;
  const canProceed =
    pairs.length >= MIN_NETWORK_PAIRS &&
    !overLimit &&
    !hasMalformed &&
    !hasInvalidTargets &&
    !isChecking;

  // Check every gene and lncRNA against the backend's reference data. An
  // unknown gene is rejected at submit anyway, but an unknown lncRNA is
  // accepted and then bridges nothing — the pair would disappear from the
  // result with no explanation. Catching both here keeps the failure editable.
  const requestSeq = useRef(0);
  const signature = useMemo(
    () => pairs.map((pair) => `${pair.gene}\u0000${pair.lncrna}`).join("\n"),
    [pairs],
  );

  useEffect(() => {
    if (!signature || hasMalformed || overLimit) {
      setInvalidPairTargets({ genes: [], lncrnas: [] });
      setLncrnaGeneIds([]);
      setCheckError("");
      return;
    }
    const seq = ++requestSeq.current;
    const genes = Array.from(new Set(pairs.map((pair) => pair.gene)));
    const lncrnas = Array.from(new Set(pairs.map((pair) => pair.lncrna)));

    const timer = setTimeout(async () => {
      setIsChecking(true);
      setCheckError("");
      try {
        const [geneRes, lncrnaRes] = await Promise.all([
          validateTargets(genes, genome, "gene"),
          validateTargets(lncrnas, genome, "lncrna"),
        ]);
        if (seq !== requestSeq.current) return;
        const badGenes = geneRes.results.filter((r) => !r.valid).map((r) => r.target);
        // A transcript match is the only usable one: predictions are reported
        // per transcript, so a lncRNA *gene* id validates and then bridges
        // nothing — the silent drop this check exists to prevent.
        const badLncrnas = lncrnaRes.results
          .filter((r) => !r.valid || r.matched_by !== "transcript")
          .map((r) => r.target);
        setLncrnaGeneIds(
          lncrnaRes.results
            .filter((r) => r.valid && r.matched_by === "gene")
            .map((r) => r.target),
        );
        setInvalidPairTargets({ genes: badGenes, lncrnas: badLncrnas });
      } catch (err) {
        if (seq !== requestSeq.current) return;
        // A request failure is not evidence that the identifiers are wrong, so
        // it reports the problem without blocking the step.
        setInvalidPairTargets({ genes: [], lncrnas: [] });
        setLncrnaGeneIds([]);
        setCheckError(
          err instanceof Error
            ? err.message
            : "Could not check gene / lncRNA identifiers. They will be checked again at submission.",
        );
      } finally {
        if (seq === requestSeq.current) setIsChecking(false);
      }
    }, VALIDATE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // `signature` stands in for the pair identifiers; the rest are stable.
  }, [signature, genome, hasMalformed, overLimit]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidGeneSet = new Set(invalidPairTargets.genes);
  const invalidLncrnaSet = new Set(invalidPairTargets.lncrnas);

  function corrCell(pairIndex: number, key: CorrKey) {
    const pair = pairs[pairIndex];
    const value = effectiveCorr(pair, key);
    const isDefault = pair.defaulted.includes(key);
    const wasNegated = pair.negated.includes(key);
    return (
      <td key={key} className="px-2 py-1 text-right font-mono text-xs">
        <span className={isDefault ? "text-zinc-400" : "text-zinc-800"}>
          {value}
        </span>
        {isDefault ? (
          <span className="ml-1 text-[10px] text-zinc-400">(default)</span>
        ) : null}
        {wasNegated ? (
          <span className="ml-1 text-[10px] text-amber-600">←−{value}</span>
        ) : null}
      </td>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">ceRNA Pairs</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Paste the candidate (gene, lncRNA) pairs to test, with optional correlation
          magnitudes. Each pair is scored from its correlations and the number of tools
          predicting each side, and only pairs bridged by the miRNA appear in the graph.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 space-y-3">
        <Textarea
          label="Pairs (one per line)"
          placeholder={"TP53, ENST00000610542, , 0.87, 1\nMYC\tENST00000451147\t0.4\t0.6\t0.9"}
          value={pairsText}
          onValueChange={setPairsText}
          description={
            "Five columns: GENE, LNCRNA, corr(miRNA,gene), corr(miRNA,lncRNA), corr(gene,lncRNA). Only the first two are required — leave a correlation empty to score it as 1. Separate with commas or tabs (an empty column needs an explicit separator). Gene as a symbol (e.g. TP53) or RefSeq (NM_…); lncRNA as a transcript ID (e.g. ENST00000…). Correlations are magnitudes between 0 and 1; a negative value is read as its absolute value. A leading header row is tolerated."
          }
          minRows={6}
          variant="bordered"
          classNames={{ inputWrapper: "bg-white font-mono" }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700">
              {pairs.length} / {MAX_NETWORK_PAIRS} pair(s)
            </span>
            {isChecking ? (
              <span className="flex items-center gap-1 text-zinc-500">
                <Spinner size="sm" /> checking identifiers…
              </span>
            ) : null}
          </div>
          {hasMalformed ? (
            <span className="font-medium text-red-600">
              {malformed.length} line(s) invalid.
            </span>
          ) : null}
        </div>

        {pairs.length === 0 && !hasMalformed ? (
          <p className="text-xs text-zinc-500">
            At least one pair is required. This module tests ceRNA hypotheses you supply —
            to explore targets without a hypothesis, use miR-Target or miR-LncRNA instead.
          </p>
        ) : null}

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
                {malformed.slice(0, 8).map((entry) => (
                  <li key={`${entry.line}-${entry.column ?? ""}`}>
                    line {entry.line}: {describeMalformed(entry)} —{" "}
                    <span className="font-mono">{entry.raw}</span>
                  </li>
                ))}
                {malformed.length > 8 ? (
                  <li>…and {malformed.length - 8} more.</li>
                ) : null}
              </ul>
            }
          />
        ) : null}

        {checkError ? (
          <Alert color="warning" variant="flat" title={checkError} />
        ) : null}

        {invalidPairTargets.genes.length ? (
          <Alert
            color="danger"
            variant="flat"
            title={`${invalidPairTargets.genes.length} gene(s) are not in the reference for this species.`}
            description={
              <span className="font-mono text-xs">
                {invalidPairTargets.genes.slice(0, 12).join(", ")}
                {invalidPairTargets.genes.length > 12 ? ", …" : ""}
              </span>
            }
          />
        ) : null}

        {invalidPairTargets.lncrnas.length ? (
          <Alert
            color="danger"
            variant="flat"
            title={`${invalidPairTargets.lncrnas.length} lncRNA ID(s) cannot be used.`}
            description={
              <div className="space-y-1 text-xs">
                <p className="font-mono">
                  {invalidPairTargets.lncrnas.slice(0, 12).join(", ")}
                  {invalidPairTargets.lncrnas.length > 12 ? ", …" : ""}
                </p>
                {lncrnaGeneIds.length ? (
                  <p>
                    {lncrnaGeneIds.length} of these name a lncRNA <strong>gene</strong>.
                    Predictions are reported per transcript, so a gene ID would match
                    nothing — use its transcript ID (e.g. ENST…) instead.
                  </p>
                ) : null}
              </div>
            }
          />
        ) : null}
      </div>

      {pairs.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-zinc-800">What will be submitted</p>
            <div className="flex flex-wrap gap-1.5">
              {defaultedCount ? (
                <Chip size="sm" variant="flat">
                  {defaultedCount} empty correlation(s) → {DEFAULT_CORR}
                </Chip>
              ) : null}
              {negatedCount ? (
                <Chip size="sm" variant="flat" color="warning">
                  {negatedCount} negative correlation(s) read as magnitudes
                </Chip>
              ) : null}
            </div>
          </div>

          <div className="max-h-[260px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-zinc-500">
                  <th className="px-2 py-1 font-medium">Gene</th>
                  <th className="px-2 py-1 font-medium">lncRNA</th>
                  {CORR_COLUMNS.map((key) => (
                    <th key={key} className="px-2 py-1 text-right font-medium">
                      {CORR_LABELS[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair, index) => {
                  const badGene = invalidGeneSet.has(pair.gene);
                  const badLncrna = invalidLncrnaSet.has(pair.lncrna);
                  return (
                    <tr key={pair.line} className="border-t border-zinc-100">
                      <td
                        className={`px-2 py-1 font-mono ${
                          badGene ? "text-red-600 line-through" : "text-zinc-800"
                        }`}
                      >
                        {pair.gene}
                      </td>
                      <td
                        className={`px-2 py-1 font-mono ${
                          badLncrna ? "text-red-600 line-through" : "text-zinc-800"
                        }`}
                      >
                        {pair.lncrna}
                      </td>
                      {CORR_COLUMNS.map((key) => corrCell(index, key))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-zinc-500">
            A correlation left empty scores as {DEFAULT_CORR}, so a pair with no
            correlation data is ranked on prediction consensus alone. Values shown here
            are exactly what will be submitted.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="flat" onPress={back}>
          Back: miRNA
        </Button>
        <div className="flex flex-wrap gap-3">
          {pairsText ? (
            <Button variant="flat" onPress={() => setPairsText("")}>
              Clear
            </Button>
          ) : null}
          <Button color="primary" onPress={next} isDisabled={!canProceed}>
            Next: Configuration
          </Button>
        </div>
      </div>
    </section>
  );
}
