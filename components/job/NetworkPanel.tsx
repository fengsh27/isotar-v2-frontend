"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Alert, Chip, Spinner } from "@heroui/react";

import { getNetwork } from "@/lib/api";
import { NetworkGraph } from "@/components/job/NetworkGraph";
import type {
  NetworkEdge,
  NetworkNode,
  NetworkPair,
  NetworkResponse,
} from "@/lib/types";

interface Props {
  jobId: string;
}

interface Visible {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  pairs: NetworkPair[];
}

const CORR_LABELS: Record<string, string> = {
  mirna_gene: "corr(miRNA, gene)",
  mirna_lncrna: "corr(miRNA, lncRNA)",
  gene_lncrna: "corr(gene, lncRNA)",
};

function formatScore(score: number | null): string {
  return score === null ? "—" : score.toFixed(3);
}

/** Keep the pairs passing the score filter, then rebuild the graph from them.
 *
 * Filtering is by ceRNA score rather than by edge tool count: the score already
 * folds in tool agreement on both sides, and thresholding edges separately
 * would leave the displayed graph disagreeing with the scores in the table.
 * Done client-side so the slider is instant — the server returns every pair. */
function computeVisible(
  data: NetworkResponse,
  minScore: number,
  includeVariantOnly: boolean,
): Visible {
  const pairs = data.pairs.filter((pair) =>
    pair.score === null ? includeVariantOnly : pair.score >= minScore,
  );

  const geneEdges = new Map<string, NetworkEdge>();
  const lncrnaEdges = new Map<string, NetworkEdge>();
  for (const edge of data.edges) {
    if (edge.side === "gene") geneEdges.set(`${edge.source}\u0000${edge.target}`, edge);
    else lncrnaEdges.set(`${edge.source}\u0000${edge.target}`, edge);
  }

  const keepEdges = new Map<string, NetworkEdge>();
  const keepNodeIds = new Set<string>();
  for (const pair of pairs) {
    for (const mirna of pair.bridge_mirnas) {
      const gene = geneEdges.get(`${pair.gene}\u0000${mirna}`);
      const lncrna = lncrnaEdges.get(`${mirna}\u0000${pair.lncrna}`);
      // Both sides are required: a miRNA touching only one end is not a bridge.
      if (!gene || !lncrna) continue;
      keepEdges.set(`g${pair.gene}\u0000${mirna}`, gene);
      keepEdges.set(`l${mirna}\u0000${pair.lncrna}`, lncrna);
      keepNodeIds.add(pair.gene);
      keepNodeIds.add(mirna);
      keepNodeIds.add(pair.lncrna);
    }
  }

  return {
    nodes: data.nodes.filter((node) => keepNodeIds.has(node.id)),
    edges: Array.from(keepEdges.values()),
    pairs,
  };
}

/** Base miRNA a (possibly variant) node belongs to. WT and all its variants
 * share the same base, so grouping by it collapses the family into one focus
 * entry. Falls back to the node id if the backend omitted `base`. */
function baseOf(node: NetworkNode): string {
  return node.base ?? node.id;
}

/** Narrow an already-filtered network to a single base miRNA: keep that miRNA's
 * WT plus every variant node, the edges incident to any of them, and the
 * genes/lncRNAs on the other end. */
function focusOnBase(visible: Visible, base: string): Visible {
  const memberIds = new Set(
    visible.nodes.filter((n) => n.type === "mirna" && baseOf(n) === base).map((n) => n.id),
  );
  const edges = visible.edges.filter((e) =>
    e.side === "gene" ? memberIds.has(e.target) : memberIds.has(e.source),
  );
  const keepNodeIds = new Set<string>(memberIds);
  for (const e of edges) {
    keepNodeIds.add(e.source);
    keepNodeIds.add(e.target);
  }
  const nodes = visible.nodes.filter((n) => keepNodeIds.has(n.id));
  const pairs = visible.pairs.filter((p) =>
    p.bridge_mirnas.some((m) => memberIds.has(m)),
  );
  return { nodes, edges, pairs };
}

export function NetworkPanel({ jobId }: Props) {
  const [data, setData] = useState<NetworkResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [includeVariantOnly, setIncludeVariantOnly] = useState(true);
  const [focusBase, setFocusBase] = useState("");
  const [expanded, setExpanded] = useState<string>("");

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const d = await getNetwork(jobId);
        if (active) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load network.");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [jobId]);

  const variantOnlyCount = useMemo(
    () => (data?.pairs ?? []).filter((p) => p.score === null).length,
    [data],
  );

  const visible = useMemo(
    () => (data ? computeVisible(data, minScore, includeVariantOnly) : null),
    [data, minScore, includeVariantOnly],
  );

  // Base miRNA families that survive the current filter, for the focus picker.
  const baseOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of visible?.nodes ?? []) {
      if (n.type !== "mirna") continue;
      const base = baseOf(n);
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }
    return Array.from(counts, ([base, count]) => ({ base, count })).sort((a, b) =>
      a.base.localeCompare(b.base),
    );
  }, [visible]);

  // Ignore a stale focus selection that no longer survives the filters.
  const effectiveFocus =
    focusBase && baseOptions.some((m) => m.base === focusBase) ? focusBase : "";

  const displayed = useMemo(
    () => (visible && effectiveFocus ? focusOnBase(visible, effectiveFocus) : visible),
    [visible, effectiveFocus],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-zinc-600">
        <Spinner size="sm" /> Building network…
      </div>
    );
  }
  if (error) {
    return <Alert color="danger" variant="flat" title={error} />;
  }
  if (!data || !visible || !displayed) {
    return <Alert color="warning" variant="flat" title="No network data available." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Chip size="sm" variant="flat" color={data.mode === "pairs" ? "primary" : "default"}>
          {data.mode === "pairs" ? "ceRNA pairs" : "Discovery"}
        </Chip>
        <span className="text-zinc-600">
          {displayed.pairs.length} pairs ·{" "}
          {displayed.nodes.filter((n) => n.type === "gene").length} genes ·{" "}
          {displayed.nodes.filter((n) => n.type === "mirna").length} miRNAs ·{" "}
          {displayed.nodes.filter((n) => n.type === "lncrna").length} lncRNAs ·{" "}
          {displayed.edges.length} edges
        </span>
        {effectiveFocus ? (
          <Chip size="sm" variant="flat" color="secondary">
            focused on {effectiveFocus}
          </Chip>
        ) : null}
        {data.summary.truncated ? (
          <Chip size="sm" variant="flat" color="warning">
            truncated to top-scoring pairs
          </Chip>
        ) : null}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-zinc-200 bg-white/70 p-3">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <span className="font-medium">Min. ceRNA score:</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
          <span className="w-10 text-center font-mono">{minScore.toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <span className="font-medium">miRNA:</span>
          <select
            value={effectiveFocus}
            onChange={(e) => setFocusBase(e.target.value)}
            className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="">All miRNAs ({baseOptions.length})</option>
            {baseOptions.map((m) => (
              <option key={m.base} value={m.base}>
                {m.base}
                {m.count > 1 ? ` (WT + ${m.count - 1} variant${m.count > 2 ? "s" : ""})` : ""}
              </option>
            ))}
          </select>
        </label>
        {variantOnlyCount ? (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={includeVariantOnly}
              onChange={(e) => setIncludeVariantOnly(e.target.checked)}
            />
            <span>
              Show {variantOnlyCount} pair{variantOnlyCount === 1 ? "" : "s"} bridged only
              by variants
            </span>
          </label>
        ) : null}
      </div>

      {displayed.edges.length === 0 ? (
        <Alert
          color="default"
          variant="flat"
          title="No bridges above the current score."
          description="Lower the minimum ceRNA score to reveal more gene↔miRNA↔lncRNA paths."
        />
      ) : (
        <NetworkGraph nodes={displayed.nodes} edges={displayed.edges} />
      )}

      {/* ceRNA pair table */}
      {displayed.pairs.length ? (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left">Gene</th>
                  <th className="px-4 py-2.5 text-left">lncRNA</th>
                  <th className="px-4 py-2.5 text-right">ceRNA score</th>
                  <th className="px-4 py-2.5 text-right">Best bridge</th>
                  <th className="px-4 py-2.5 text-left">Bridging miRNAs</th>
                </tr>
              </thead>
              <tbody>
                {displayed.pairs.map((pair) => {
                  const key = `${pair.gene}__${pair.lncrna}`;
                  const isOpen = expanded === key;
                  return (
                    <Fragment key={key}>
                      <tr
                        onClick={() => setExpanded(isOpen ? "" : key)}
                        className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50/70"
                      >
                        <td className="px-4 py-2 font-medium text-zinc-800">
                          {pair.gene_label}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-700">
                          {pair.lncrna}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-zinc-800">
                          {formatScore(pair.score)}
                          {pair.score === null ? (
                            <span className="ml-1 text-[10px] text-amber-600">
                              variant only
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-zinc-600">
                          {pair.best_bridge.score.toFixed(3)}
                          {pair.best_bridge.is_variant ? (
                            <span className="ml-1 text-[10px] text-teal-700">variant</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-zinc-700">
                          {pair.bridge_mirnas.length}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-b border-zinc-100 bg-zinc-50/60">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  Correlations (product {pair.corr_product.toFixed(3)})
                                </p>
                                <ul className="space-y-0.5 text-xs text-zinc-700">
                                  {Object.entries(pair.corr).map(([key2, value]) => (
                                    <li key={key2}>
                                      {CORR_LABELS[key2] ?? key2}:{" "}
                                      <span className="font-mono">{value}</span>
                                      {pair.corr_defaulted.includes(
                                        key2 as keyof typeof pair.corr,
                                      ) ? (
                                        <span className="ml-1 text-zinc-400">
                                          (not supplied — scored as 1)
                                        </span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  Per-bridge support
                                </p>
                                <table className="w-full text-xs">
                                  <thead className="text-zinc-500">
                                    <tr>
                                      <th className="py-0.5 text-left font-medium">miRNA</th>
                                      <th className="py-0.5 text-right font-medium">gene</th>
                                      <th className="py-0.5 text-right font-medium">lncRNA</th>
                                      <th className="py-0.5 text-right font-medium">score</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pair.bridges.map((bridge) => (
                                      <tr key={bridge.mirna}>
                                        <td className="py-0.5 font-mono">
                                          {bridge.mirna}
                                          {bridge.is_variant ? (
                                            <span className="ml-1 text-[10px] text-teal-700">
                                              variant
                                            </span>
                                          ) : null}
                                        </td>
                                        <td className="py-0.5 text-right font-mono">
                                          {bridge.gene_tools}/{data.summary.tool_totals.gene}
                                        </td>
                                        <td className="py-0.5 text-right font-mono">
                                          {bridge.lncrna_tools}/
                                          {data.summary.tool_totals.lncrna}
                                        </td>
                                        <td className="py-0.5 text-right font-mono">
                                          {bridge.score.toFixed(3)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs leading-relaxed text-zinc-600">
            <p className="font-semibold text-zinc-700">
              How the ceRNA score is computed (v{data.summary.score_version})
            </p>
            <p className="mt-1 font-mono text-[11px]">
              score = corr(miRNA,gene) × corr(miRNA,lncRNA) × corr(gene,lncRNA) × √(
              gene tools / {data.summary.tool_totals.gene} × lncRNA tools /{" "}
              {data.summary.tool_totals.lncrna} )
            </p>
            <p className="mt-1.5">
              <strong>Score</strong> is the computed ceRNA score, not a value you supplied —
              the correlations you pasted appear under <strong>Correlations</strong> when a
              row is expanded. A correlation left blank was scored as 1 and is marked as
              such, so a pair with no correlation data ranks on prediction consensus alone.
            </p>
            <p className="mt-1.5">
              The score shown for a pair is the <strong>wild-type</strong> miRNA&apos;s: a
              pair-level score is a claim about the real miRNA, so a variant never sets it.
              Where a variant scores higher it appears under <strong>Best bridge</strong>,
              and a pair the wild type does not bridge at all shows no score. Correlations
              are measured on the wild type and inherited by its variants, so within one
              pair they are constant — wild-type-vs-variant differences come entirely from
              tool support.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
