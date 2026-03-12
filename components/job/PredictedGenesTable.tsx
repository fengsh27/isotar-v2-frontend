"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Spinner } from "@heroui/react";

import { getJobResults } from "@/lib/api";
import type { JobResultsResponse, VennData } from "@/lib/types";

const PAGE_SIZE = 20;

type SortBy = "gene_label" | "tool_count";
type SortOrder = "asc" | "desc";

interface Props {
  jobId: string;
  onVennData?: (venn: VennData) => void;
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <span className="text-zinc-300">↕</span>;
  return <span className="text-teal-600">{order === "asc" ? "↑" : "↓"}</span>;
}

export function PredictedGenesTable({ jobId, onVennData }: Props) {
  const [filterInput, setFilterInput] = useState("");
  const [geneLabel, setGeneLabel] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("tool_count");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [offset, setOffset] = useState(0);

  const [data, setData] = useState<JobResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vennReportedRef = useRef(false);

  function handleFilterChange(value: string) {
    setFilterInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setGeneLabel(value);
      setOffset(0);
    }, 300);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getJobResults(jobId, {
      geneLabel: geneLabel || undefined,
      sortBy,
      ascendOrDescend: order,
      offset,
      number: PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return;
        setData(result);
        // Report venn data once to parent
        if (!vennReportedRef.current && result.venn && onVennData) {
          vennReportedRef.current = true;
          onVennData(result.venn);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load results.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobId, geneLabel, sortBy, order, offset, onVennData]);

  function toggleSort(column: SortBy) {
    if (sortBy === column) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setOrder(column === "tool_count" ? "desc" : "asc");
    }
    setOffset(0);
  }

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by gene label…"
          value={filterInput}
          onValueChange={handleFilterChange}
          size="sm"
          variant="bordered"
          className="w-64"
          classNames={{ inputWrapper: "bg-white" }}
          isClearable
          onClear={() => handleFilterChange("")}
        />
        {data ? (
          <p className="text-sm text-zinc-500">
            {geneLabel ? (
              <>
                <span className="font-medium text-zinc-700">{total.toLocaleString()}</span> match
                {total !== 1 ? "es" : ""} of{" "}
                <span className="font-medium text-zinc-700">
                  {data.total_genes.toLocaleString()}
                </span>{" "}
                total genes
              </>
            ) : (
              <>
                <span className="font-medium text-zinc-700">
                  {data.total_genes.toLocaleString()}
                </span>{" "}
                gene{data.total_genes !== 1 ? "s" : ""} total
              </>
            )}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner size="sm" /> Loading results…
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
                  <th className="w-14 px-4 py-3 text-right">No.</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("gene_label")}
                      className="flex items-center gap-1 hover:text-zinc-900"
                    >
                      Gene Label
                      <SortIcon active={sortBy === "gene_label"} order={order} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("tool_count")}
                      className="flex items-center gap-1 hover:text-zinc-900"
                    >
                      Tools
                      <SortIcon active={sortBy === "tool_count"} order={order} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!data?.genes.length ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                      No genes match the current filter.
                    </td>
                  </tr>
                ) : (
                  data.genes.map((gene, idx) => (
                    <tr key={gene.gene_id} className="border-b border-zinc-100 hover:bg-zinc-50/70">
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-400">
                        {offset + idx + 1}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-zinc-800">{gene.gene_id}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-xs text-zinc-400">({gene.tool_count})</span>
                          {gene.tools.map((tool) => (
                            <span
                              key={tool}
                              className="inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
