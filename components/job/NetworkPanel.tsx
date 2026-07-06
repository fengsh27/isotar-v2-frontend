"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Chip, Spinner } from "@heroui/react";

import { getNetwork } from "@/lib/api";
import { NetworkGraph } from "@/components/job/NetworkGraph";
import type { NetworkEdge, NetworkNode, NetworkResponse } from "@/lib/types";

interface Props {
  jobId: string;
}

interface Visible {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  pairs: { gene: string; geneLabel: string; lncrna: string; bridges: string[] }[];
}

/** Apply the consensus-k threshold and tool filter, then keep only complete
 * gene→miRNA→lncRNA bridge paths (a miRNA edge surviving on only one side is
 * not a ceRNA bridge, so it is dropped). Done client-side so the slider is
 * instant — the server returns every edge with its full tool list. */
function computeVisible(
  data: NetworkResponse,
  minTools: number,
  toolFilter: Set<string>,
): Visible {
  const edgeOk = (e: NetworkEdge) =>
    e.tool_count >= minTools &&
    (toolFilter.size === 0 || e.tools.some((t) => toolFilter.has(t)));

  const geneByMirna = new Map<string, NetworkEdge[]>(); // miRNA -> gene-side edges
  const lncByMirna = new Map<string, NetworkEdge[]>(); // miRNA -> lncRNA-side edges
  for (const e of data.edges) {
    if (!edgeOk(e)) continue;
    if (e.side === "gene") {
      const arr = geneByMirna.get(e.target) ?? [];
      arr.push(e);
      geneByMirna.set(e.target, arr);
    } else {
      const arr = lncByMirna.get(e.source) ?? [];
      arr.push(e);
      lncByMirna.set(e.source, arr);
    }
  }

  const keepEdges: NetworkEdge[] = [];
  const keepNodeIds = new Set<string>();
  for (const [mirna, gEdges] of geneByMirna) {
    const lEdges = lncByMirna.get(mirna);
    if (!lEdges || !lEdges.length) continue; // not a bridge at this threshold
    keepNodeIds.add(mirna);
    for (const ge of gEdges) {
      keepEdges.push(ge);
      keepNodeIds.add(ge.source);
    }
    for (const le of lEdges) {
      keepEdges.push(le);
      keepNodeIds.add(le.target);
    }
  }

  const nodes = data.nodes.filter((n) => keepNodeIds.has(n.id));

  // Per-pair surviving bridges at this threshold.
  const pairs = data.pairs
    .map((p) => {
      const bridges = p.bridge_mirnas.filter(
        (m) =>
          (geneByMirna.get(m) ?? []).some((e) => e.source === p.gene) &&
          (lncByMirna.get(m) ?? []).length > 0,
      );
      return { gene: p.gene, geneLabel: p.gene_label, lncrna: p.lncrna, bridges };
    })
    .filter((p) => p.bridges.length > 0);

  return { nodes, edges: keepEdges, pairs };
}

/** Base miRNA a (possibly variant) node belongs to. WT and all its variants
 * share the same base, so grouping by it collapses the family into one focus
 * entry. Falls back to the node id if the backend omitted `base`. */
function baseOf(node: NetworkNode): string {
  return node.base ?? node.id;
}

/** Narrow an already-filtered network to a single base miRNA: keep that miRNA's
 * WT plus every variant node, the edges incident to any of them, and the
 * genes/lncRNAs on the other end. Lets the user isolate one miRNA family's
 * bridge sub-network (WT vs. its variants) from the full multi-miRNA graph. */
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
  const pairs = visible.pairs.filter((p) => p.bridges.some((m) => memberIds.has(m)));
  return { nodes, edges, pairs };
}

export function NetworkPanel({ jobId }: Props) {
  const [data, setData] = useState<NetworkResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [minTools, setMinTools] = useState(1);
  const [toolFilter, setToolFilter] = useState<Set<string>>(new Set());
  const [focusBase, setFocusBase] = useState("");

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

  const allTools = useMemo(() => {
    const s = new Set<string>();
    data?.edges.forEach((e) => e.tools.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [data]);

  const maxTools = useMemo(
    () => data?.edges.reduce((m, e) => Math.max(m, e.tool_count), 1) ?? 1,
    [data],
  );

  const visible = useMemo(
    () => (data ? computeVisible(data, minTools, toolFilter) : null),
    [data, minTools, toolFilter],
  );

  // Base miRNA families that survive the current threshold/tool filter, for the
  // focus picker. WT and its variants collapse into one entry keyed by base,
  // with the surviving node count (WT + variants) shown.
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
    () =>
      visible && effectiveFocus ? focusOnBase(visible, effectiveFocus) : visible,
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

  const toggleToolFilter = (tool: string) =>
    setToolFilter((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Chip size="sm" variant="flat" color={data.mode === "pairs" ? "primary" : "default"}>
          {data.mode === "pairs" ? "ceRNA pairs" : "Discovery"}
        </Chip>
        <span className="text-zinc-600">
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
            truncated to top targets
          </Chip>
        ) : null}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-zinc-200 bg-white/70 p-3">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <span className="font-medium">Min. tools (consensus k):</span>
          <input
            type="range"
            min={1}
            max={maxTools}
            value={minTools}
            onChange={(e) => setMinTools(Number(e.target.value))}
          />
          <span className="w-6 text-center font-mono">{minTools}</span>
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
        {allTools.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Tools:</span>
            {allTools.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleToolFilter(t)}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  toolFilter.has(t)
                    ? "border-teal-500 bg-teal-50 text-teal-800"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {t}
              </button>
            ))}
            {toolFilter.size ? (
              <button
                type="button"
                onClick={() => setToolFilter(new Set())}
                className="text-xs text-zinc-500 underline"
              >
                clear
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {displayed.edges.length === 0 ? (
        <Alert
          color="default"
          variant="flat"
          title="No bridges at the current threshold."
          description="Lower the consensus k or clear the tool filter to reveal more gene↔miRNA↔lncRNA paths."
        />
      ) : (
        <NetworkGraph nodes={displayed.nodes} edges={displayed.edges} />
      )}

      {/* ceRNA pair table (pairs mode) */}
      {data.mode === "pairs" && displayed.pairs.length ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr className="border-b border-zinc-200">
                <th className="px-4 py-2.5 text-left">Gene</th>
                <th className="px-4 py-2.5 text-left">lncRNA</th>
                <th className="px-4 py-2.5 text-left">Bridging miRNAs</th>
              </tr>
            </thead>
            <tbody>
              {displayed.pairs.map((p) => (
                <tr key={`${p.gene}__${p.lncrna}`} className="border-b border-zinc-100 hover:bg-zinc-50/70">
                  <td className="px-4 py-2 font-medium text-zinc-800">{p.geneLabel}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-700">{p.lncrna}</td>
                  <td className="px-4 py-2 text-zinc-700">{p.bridges.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
