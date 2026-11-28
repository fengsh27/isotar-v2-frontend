"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Spinner } from "@heroui/react";

import { EnsemblIdCell, GeneLabelCell, hasEnsemblIds } from "@/components/job/TargetIds";
import { getJobCompare } from "@/lib/api";
import type { CompareResponse, CompareStatus, SequenceInfo } from "@/lib/types";

const PAGE_SIZE = 20;

type SortBy = "status" | "gene_label" | "delta";
type SortOrder = "asc" | "desc";

const STATUS_ORDER: CompareStatus[] = ["changed", "lost", "gained", "shared"];

const STATUS_LABEL: Record<CompareStatus, string> = {
  changed: "Changed",
  lost: "Lost",
  gained: "Gained",
  shared: "Shared",
};

const STATUS_HINT: Record<CompareStatus, string> = {
  changed: "Predicted for both, by a different set of tools",
  lost: "Predicted for the wild type only",
  gained: "Predicted for the variant only",
  shared: "Predicted for both by the same tools",
};

const STATUS_CLASS: Record<CompareStatus, string> = {
  changed: "bg-amber-50 text-amber-700 border-amber-200",
  lost: "bg-red-50 text-red-700 border-red-200",
  gained: "bg-emerald-50 text-emerald-700 border-emerald-200",
  shared: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

interface Props {
  jobId: string;
  wt: SequenceInfo;
  variant: SequenceInfo;
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <span className="text-zinc-300">↕</span>;
  return <span className="text-teal-600">{order === "asc" ? "↑" : "↓"}</span>;
}

function ToolChips({
  tools,
  highlight,
  tone,
}: {
  tools: string[];
  /** Tools to mark: gained (in the variant column) or lost (in the WT column). */
  highlight: string[];
  tone: "gained" | "lost";
}) {
  if (!tools.length) return <span className="text-xs text-zinc-400">—</span>;
  const marked = new Set(highlight);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs text-zinc-400">({tools.length})</span>
      {tools.map((tool) => {
        const isMarked = marked.has(tool);
        const cls = !isMarked
          ? "bg-teal-50 text-teal-700"
          : tone === "gained"
            ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
            : "bg-red-50 text-red-700 line-through decoration-red-400";
        return (
          <span
            key={tool}
            title={isMarked ? (tone === "gained" ? "variant only" : "wild type only") : undefined}
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
          >
            {tool}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Every target of a variant against its wild type, classified by the backend
 * as shared / gained / lost / changed. "Lost" means the tools no longer
 * predict the site for the variant, which is not evidence of no binding.
 */
export function CompareTable({ jobId, wt, variant }: Props) {
  const [filterInput, setFilterInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<CompareStatus | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("status");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [offset, setOffset] = useState(0);

  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState("");
  // Loading is derived: the page is loading until the response for the
  // current request key has landed, so the effect never sets state directly.
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = JSON.stringify([
    jobId, wt.sequence, variant.sequence, status, keyword, sortBy, order, offset,
  ]);
  const loading = loadedKey !== requestKey;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleFilterChange(value: string) {
    setFilterInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setKeyword(value);
      setOffset(0);
    }, 300);
  }

  useEffect(() => {
    let active = true;

    getJobCompare(jobId, {
      wt: wt.sequence,
      variant: variant.sequence,
      status: status ?? undefined,
      keyword: keyword || undefined,
      sortBy,
      ascendOrDescend: order,
      offset,
      number: PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load the comparison.");
      })
      .finally(() => {
        if (!active) return;
        setLoadedKey(requestKey);
      });

    return () => {
      active = false;
    };
  }, [jobId, wt.sequence, variant.sequence, status, keyword, sortBy, order, offset, requestKey]);

  function toggleSort(column: SortBy) {
    if (sortBy === column) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setOrder(column === "gene_label" ? "asc" : "desc");
    }
    setOffset(0);
  }

  function toggleStatus(s: CompareStatus) {
    setStatus((cur) => (cur === s ? null : s));
    setOffset(0);
  }

  const total = data?.total ?? 0;
  // Ensembl gene / transcript columns replace the raw target id (RefSeq for
  // miR-Target), which stays in the CSV download. Older backends send no
  // Ensembl ids, so keep their id column.
  const showEnsembl = hasEnsemblIds(data?.genes);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const toolRows = data
    ? Object.entries(data.tools).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm text-zinc-700">
        <p>
          <span className="font-medium text-zinc-900">{variant.label}</span> against the wild
          type <span className="font-mono text-xs">{wt.seq}</span>
          {" → "}
          <span className="font-mono text-xs">{variant.seq}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Gained and lost mean a tool predicts the target for one sequence only. A lost site is
          no longer predicted, which is not evidence of no binding.
        </p>
      </div>

      {/* Status strip: totals double as filters */}
      {data ? (
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              title={STATUS_HINT[s]}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${STATUS_CLASS[s]} ${
                status === s ? "ring-2 ring-offset-1 ring-teal-500" : "opacity-90 hover:opacity-100"
              }`}
            >
              {STATUS_LABEL[s]}{" "}
              <span className="font-mono">{data.totals[s].toLocaleString()}</span>
            </button>
          ))}
          <span className="text-xs text-zinc-500">
            of {data.total_genes.toLocaleString()} targets predicted for either sequence
            {status ? " · click again to clear the filter" : ""}
          </span>
        </div>
      ) : null}

      {toolRows.length ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
          {toolRows.map(([tool, counts]) => (
            <span key={tool}>
              <span className="font-medium text-zinc-800">{tool}</span>:{" "}
              <span className="text-emerald-700">+{counts.gained.toLocaleString()}</span>{" "}
              <span className="text-red-700">−{counts.lost.toLocaleString()}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by gene label, Ensembl ID or gene name…"
          value={filterInput}
          onValueChange={handleFilterChange}
          size="sm"
          variant="bordered"
          className="w-full sm:w-96"
          classNames={{ inputWrapper: "bg-white" }}
          isClearable
          onClear={() => handleFilterChange("")}
        />
        {data && (keyword || status) ? (
          <p className="text-sm text-zinc-500">
            <span className="font-medium text-zinc-700">{total.toLocaleString()}</span> match
            {total !== 1 ? "es" : ""}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner size="sm" /> Comparing…
        </div>
      ) : (
        <>
          <div className="relative overflow-x-auto rounded-xl border border-zinc-200">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                <Spinner size="sm" />
              </div>
            ) : null}

            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <th className="w-14 px-4 py-3 text-right">NO.</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("gene_label")}
                      className="flex items-center gap-1 hover:text-zinc-900"
                    >
                      GENE LABEL
                      <SortIcon active={sortBy === "gene_label"} order={order} />
                    </button>
                  </th>
                  {showEnsembl ? (
                    <>
                      <th className="px-4 py-3 text-left">ENSEMBL GENE</th>
                      <th className="px-4 py-3 text-left">ENSEMBL TRANSCRIPT</th>
                    </>
                  ) : null}
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("status")}
                      className="flex items-center gap-1 hover:text-zinc-900"
                    >
                      STATUS
                      <SortIcon active={sortBy === "status"} order={order} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">WILD TYPE TOOLS</th>
                  <th className="px-4 py-3 text-left">VARIANT TOOLS</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("delta")}
                      className="flex items-center gap-1 hover:text-zinc-900"
                      title="Number of tools that changed their call"
                    >
                      Δ
                      <SortIcon active={sortBy === "delta"} order={order} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">GENE NAME</th>
                  {showEnsembl ? null : <th className="px-4 py-3 text-left">GENE ID</th>}
                </tr>
              </thead>
              <tbody>
                {!data?.genes.length ? (
                  <tr>
                    <td colSpan={8 + (showEnsembl ? 1 : 0)} className="px-4 py-8 text-center text-zinc-500">
                      No targets match the current filter.
                    </td>
                  </tr>
                ) : (
                  data.genes.map((row, idx) => (
                    <tr key={row.gene_id} className="border-b border-zinc-100 hover:bg-zinc-50/70">
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-400">
                        {offset + idx + 1}
                      </td>
                      <GeneLabelCell value={row.gene_label} />
                      {showEnsembl ? (
                        <>
                          <EnsemblIdCell value={row.ensembl_gene} />
                          <EnsemblIdCell value={row.ensembl_transcript} />
                        </>
                      ) : null}
                      <td className="px-4 py-2.5">
                        <span
                          title={STATUS_HINT[row.status]}
                          className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[row.status]}`}
                        >
                          {STATUS_LABEL[row.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <ToolChips tools={row.wt_tools} highlight={row.lost} tone="lost" />
                      </td>
                      <td className="px-4 py-2.5">
                        <ToolChips tools={row.variant_tools} highlight={row.gained} tone="gained" />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-600">{row.delta}</td>
                      <td className="px-4 py-2.5 text-zinc-700">{row.gene_name}</td>
                      {showEnsembl ? null : (
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{row.gene_id}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
              <p>
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
                {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={offset === 0}
                  onPress={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <span className="text-xs text-zinc-500">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={offset + PAGE_SIZE >= total}
                  onPress={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
