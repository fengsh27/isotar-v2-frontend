"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Chip, Spinner } from "@heroui/react";

import { createNetworkJob } from "@/lib/api";
import {
  MAX_CORES_PER_JOB,
  SPECIES_OPTIONS,
  TOOL_OPTIONS,
  isToolSupportedForSpecies,
} from "@/lib/constants";
import { trackJobId } from "@/lib/jobStorage";
import { loadMirnaDataset, speciesLabel } from "@/lib/mirnaData";
import type { CreateNetworkJobPayload, NetworkPairInput } from "@/lib/types";

const MAX_NETWORK_MIRNAS = 20;

const labelCls = "text-sm font-medium text-zinc-800";
const helpCls = "mt-1 text-xs text-zinc-500";
const inputCls =
  "w-full border border-zinc-300 rounded-xl px-3 py-2 text-sm focus:border-teal-600 focus:outline-none";
const selectCls =
  "border border-zinc-300 bg-white rounded-xl px-3 py-2 text-sm focus:border-teal-600 focus:outline-none";

/** Parse a pasted pairs block: one "GENE<sep>LNCRNA" per line (tab/comma/space
 * separated). Blank lines and a leading header line are tolerated. */
function parsePairs(text: string): NetworkPairInput[] {
  const pairs: NetworkPairInput[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/[\t,]|\s{1,}/).filter(Boolean);
    if (parts.length < 2) continue;
    const gene = parts[0].trim();
    const lncrna = parts[1].trim();
    // Skip an obvious header row.
    if (/^gene$/i.test(gene) && /^lncrna$/i.test(lncrna)) continue;
    if (gene && lncrna) pairs.push({ gene, lncrna });
  }
  return pairs;
}

export function NetworkRunClient() {
  const router = useRouter();

  const [species, setSpecies] = useState("");
  const [humanReference, setHumanReference] = useState<"hg19" | "hg38" | "">("");

  const [dataset, setDataset] = useState<Record<string, unknown> | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [mirnaFilter, setMirnaFilter] = useState("");
  const [selectedMirnas, setSelectedMirnas] = useState<string[]>([]);

  const [tools, setTools] = useState<string[]>([]);
  const [pairsText, setPairsText] = useState("");
  const [cores, setCores] = useState(MAX_CORES_PER_JOB);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load the per-species miRNA catalog whenever the species changes; clear any
  // selections that no longer exist in the new catalog.
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!species) {
        setDataset(null);
        return;
      }
      setDatasetLoading(true);
      setDataset(null);
      try {
        const ds = await loadMirnaDataset(species);
        if (!active) return;
        setDataset(ds as Record<string, unknown> | null);
        setSelectedMirnas((prev) => (ds ? prev.filter((m) => m in ds) : []));
      } finally {
        if (active) setDatasetLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [species]);

  const mirnaIds = useMemo(() => (dataset ? Object.keys(dataset) : []), [dataset]);
  const filteredMirnaIds = useMemo(() => {
    const q = mirnaFilter.trim().toLowerCase();
    const pool = q ? mirnaIds.filter((id) => id.toLowerCase().includes(q)) : mirnaIds;
    return pool.slice(0, 50);
  }, [mirnaIds, mirnaFilter]);

  const pairs = useMemo(() => parsePairs(pairsText), [pairsText]);

  const genome =
    species === "9606"
      ? humanReference || undefined
      : SPECIES_OPTIONS.find((o) => o.value === species)?.genome ?? undefined;

  const overLimit = selectedMirnas.length > MAX_NETWORK_MIRNAS;
  const humanNeedsRef = species === "9606" && !humanReference;
  const canSubmit =
    !!species &&
    !humanNeedsRef &&
    selectedMirnas.length > 0 &&
    !overLimit &&
    tools.length > 0 &&
    !isSubmitting;

  function toggleMirna(id: string) {
    setSelectedMirnas((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  function toggleTool(tool: string) {
    setTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  }

  async function run() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage("");
    const payload: CreateNetworkJobPayload = {
      workflow: "mir-network",
      mirna_ids: selectedMirnas,
      tools,
      cores: Math.max(1, Math.min(cores, MAX_CORES_PER_JOB)),
    };
    if (genome) payload.genome = genome;
    if (pairs.length) payload.pairs = pairs;
    try {
      const job = await createNetworkJob(payload);
      trackJobId(job.job_id);
      router.replace(`/jobs/${job.job_id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Network job submission failed.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10 fade-rise">
      <header className="surface-panel-strong rounded-3xl p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">miR-Network Visualization</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Run a list of miRNAs against both gene (3′ UTR) and lncRNA targets, then
          visualize the tripartite <strong>gene ↔ miRNA ↔ lncRNA</strong> network.
          Optionally provide hypothesized (gene, lncRNA) ceRNA pairs — the graph
          keeps only the miRNAs predicted to target <em>both</em> members of a pair.
        </p>
      </header>

      {/* Species */}
      <section className="surface-panel rounded-2xl p-5 space-y-3">
        <label className={labelCls} htmlFor="net-species">Species</label>
        <select
          id="net-species"
          className={selectCls}
          value={species}
          onChange={(e) => {
            setSpecies(e.target.value);
            setHumanReference("");
            setTools((prev) => prev.filter((t) => isToolSupportedForSpecies(t, e.target.value)));
          }}
        >
          <option value="">Select a species…</option>
          {SPECIES_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {species === "9606" ? (
          <div className="flex items-center gap-4">
            <span className={labelCls}>Reference:</span>
            {(["hg19", "hg38"] as const).map((ref) => (
              <label key={ref} className="flex items-center gap-1.5 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="net-human-ref"
                  checked={humanReference === ref}
                  onChange={() => setHumanReference(ref)}
                />
                {ref}
              </label>
            ))}
          </div>
        ) : null}
      </section>

      {/* miRNA list */}
      <section className="surface-panel rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className={labelCls}>miRNAs</label>
          <span className={overLimit ? "text-xs font-medium text-red-600" : "text-xs text-zinc-500"}>
            {selectedMirnas.length} / {MAX_NETWORK_MIRNAS} selected
          </span>
        </div>
        {!species ? (
          <p className={helpCls}>Select a species first to load its miRNA catalog.</p>
        ) : datasetLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Spinner size="sm" /> Loading {speciesLabel(species)} miRNAs…
          </div>
        ) : !dataset ? (
          <p className={helpCls}>No miRNA catalog is bundled for {speciesLabel(species)}.</p>
        ) : (
          <>
            {selectedMirnas.length ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedMirnas.map((id) => (
                  <Chip
                    key={id}
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => toggleMirna(id)}
                  >
                    {id}
                  </Chip>
                ))}
              </div>
            ) : null}
            <input
              className={inputCls}
              placeholder="Filter miRNA IDs (e.g. miR-495)…"
              value={mirnaFilter}
              onChange={(e) => setMirnaFilter(e.target.value)}
            />
            <div className="max-h-56 overflow-y-auto rounded-xl border border-zinc-200">
              {filteredMirnaIds.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-500">No matching miRNAs.</p>
              ) : (
                filteredMirnaIds.map((id) => {
                  const checked = selectedMirnas.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleMirna(id)}
                      className={`flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-1.5 text-left text-sm last:border-b-0 hover:bg-zinc-50 ${
                        checked ? "bg-teal-50 text-teal-800" : "text-zinc-700"
                      }`}
                    >
                      <span className="inline-block w-4">{checked ? "✓" : ""}</span>
                      <span className="font-mono text-xs">{id}</span>
                    </button>
                  );
                })
              )}
            </div>
            <p className={helpCls}>
              Showing up to 50 matches. Up to {MAX_NETWORK_MIRNAS} miRNAs per network job.
            </p>
          </>
        )}
      </section>

      {/* Tools */}
      <section className="surface-panel rounded-2xl p-5 space-y-3">
        <label className={labelCls}>Prediction tools</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOOL_OPTIONS.map((tool) => {
            const supported = !species || isToolSupportedForSpecies(tool.value, species);
            const checked = tools.includes(tool.value);
            return (
              <label
                key={tool.value}
                className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                  supported ? "cursor-pointer border-zinc-200 hover:bg-zinc-50" : "cursor-not-allowed border-zinc-100 opacity-50"
                } ${checked ? "border-teal-500 bg-teal-50" : ""}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  disabled={!supported}
                  checked={checked}
                  onChange={() => toggleTool(tool.value)}
                />
                <span>
                  <span className="font-medium text-zinc-800">{tool.label}</span>
                  {tool.value === "Targetscan" ? (
                    <span className="block text-xs text-zinc-500">Gene targets only (skipped on the lncRNA pool).</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Pairs (optional) */}
      <section className="surface-panel rounded-2xl p-5 space-y-3">
        <label className={labelCls} htmlFor="net-pairs">
          ceRNA pairs <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <p className={helpCls}>
          One pair per line: <code className="rounded bg-zinc-100 px-1">GENE&nbsp;LNCRNA</code>{" "}
          (tab, comma, or space separated). Gene as a symbol (e.g. TP53) or RefSeq
          (NM_…); lncRNA as a transcript ID (e.g. ENST00000…). Leave empty to
          explore the top-connected genes and lncRNAs automatically.
        </p>
        <textarea
          id="net-pairs"
          className={`${inputCls} min-h-28 font-mono`}
          placeholder={"TP53\tENST00000610542\nMYC, ENST00000451147"}
          value={pairsText}
          onChange={(e) => setPairsText(e.target.value)}
        />
        {pairs.length ? (
          <p className="text-xs text-teal-700">{pairs.length} pair(s) parsed.</p>
        ) : null}
      </section>

      {/* Cores + submit */}
      <section className="surface-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <label className={labelCls} htmlFor="net-cores">CPU cores</label>
          <input
            id="net-cores"
            type="number"
            min={1}
            max={MAX_CORES_PER_JOB}
            className={`${inputCls} w-24`}
            value={cores}
            onChange={(e) => setCores(Number(e.target.value) || 1)}
          />
          <span className={helpCls}>Max {MAX_CORES_PER_JOB}.</span>
        </div>

        {overLimit ? (
          <Alert color="warning" variant="flat" title={`Select at most ${MAX_NETWORK_MIRNAS} miRNAs.`} />
        ) : null}
        {errorMessage ? <Alert color="danger" variant="flat" title={errorMessage} /> : null}

        <Button color="primary" isDisabled={!canSubmit} isLoading={isSubmitting} onPress={run}>
          Run network analysis
        </Button>
        <p className={helpCls}>
          Runs both target pools over {selectedMirnas.length || "your"} miRNA(s); this is heavier
          than a single-pool job.
        </p>
      </section>
    </div>
  );
}
