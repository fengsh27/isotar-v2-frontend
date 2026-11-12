"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Tab,
  Tabs,
} from "@heroui/react";

import {
  ApiError,
  getEnrichment,
  getEnrichmentDotplotUrl,
  getJobResults,
  runEnrichment,
} from "@/lib/api";
import type { EnrichmentResult, EnrichmentTerm } from "@/lib/types";

const ORGANISM_OPTIONS = [
  { value: "Human", label: "Human" },
  { value: "Mouse", label: "Mouse" },
  { value: "Rat", label: "Rat" },
];

const POLL_MS = 3000;

/** Queued or running on the backend's enrichment worker. */
function isActive(status: EnrichmentResult | null): boolean {
  return status?.status === "queued" || status?.status === "running";
}

/** Finished results to show, or null. A backend older than async enrichment
 *  sends no `status`; its GET only ever answered with finished results. */
function finishedResults(status: EnrichmentResult | null): EnrichmentResult | null {
  if (!status) return null;
  if (status.status) return status.status === "succeeded" ? status : null;
  return Object.keys(status.databases ?? {}).length > 0 ? status : null;
}

function formatTime(epochSeconds: number | null | undefined): string {
  return epochSeconds ? new Date(epochSeconds * 1000).toLocaleTimeString() : "";
}

interface Props {
  jobId: string;
  /** Enrichr organism for this job's species; the selector is locked to it. */
  organism?: string;
}

export function EnrichmentPanel({ jobId, organism: organismProp }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [organism, setOrganism] = useState(organismProp ?? "Human");
  const [cutoff, setCutoff] = useState("0.05");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EnrichmentResult | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  // Bumped after a run is queued to restart polling.
  const [pollKey, setPollKey] = useState(0);

  // Load the enrichment state, and keep polling while a run is queued or
  // running — including one started before this page was opened.
  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const next = await getEnrichment(jobId);
        if (!active) return;
        setStatus(next);
        setLoadError("");
        if (isActive(next)) timeoutId = setTimeout(load, POLL_MS);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setStatus(null);
        } else {
          setLoadError(err instanceof Error ? err.message : "Could not load the enrichment.");
          timeoutId = setTimeout(load, POLL_MS * 2);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [jobId, pollKey]);

  async function handleRun() {
    setSubmitting(true);
    setError("");
    try {
      const cutoffNum = parseFloat(cutoff);
      if (!Number.isFinite(cutoffNum) || cutoffNum <= 0 || cutoffNum > 1) {
        throw new Error("Cutoff must be a number between 0 and 1.");
      }

      // The backend's maximum page size. Each /result call costs ~0.85 s
      // whatever its size, so fewer, larger pages collect the gene list
      // several times faster (7,742 rows: 8 calls instead of 39).
      const PAGE = 1000;
      const collected = new Set<string>();
      let offset = 0;
      let total = Infinity;

      while (offset < total) {
        const page = await getJobResults(jobId, { number: PAGE, offset });
        total = page.total_genes ?? page.total ?? page.genes.length;
        for (const g of page.genes) {
          const label = (g.gene_label ?? "").trim();
          if (label) collected.add(label);
        }
        if (page.genes.length === 0) break;
        offset += page.genes.length;
      }

      const genes = Array.from(collected);
      if (genes.length === 0) {
        throw new Error("No predicted genes available for enrichment.");
      }

      // Returns as soon as the run is queued; polling picks up from here.
      await runEnrichment(jobId, {
        genes,
        organism,
        cutoff: cutoffNum,
      });
      setModalOpen(false);
      setPollKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start enrichment.");
      // A 409 means a run is already going (e.g. started in another tab):
      // poll so the panel shows it.
      if (err instanceof ApiError && err.status === 409) setPollKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  const active = isActive(status);
  const results = finishedResults(status);
  const params = status?.params;
  const paramsText = params
    ? `${params.gene_count.toLocaleString()} genes, ${params.organism}, adjusted P < ${params.cutoff}`
    : "";

  let summary: string;
  if (active) {
    summary =
      status?.status === "running"
        ? `Enrichment is running on Enrichr${paramsText ? ` (${paramsText})` : ""}, started ${formatTime(status?.started_at)}.`
        : `Enrichment is queued${paramsText ? ` (${paramsText})` : ""}, since ${formatTime(status?.queued_at)}.`;
  } else if (results) {
    summary = `Enrichment computed across ${Object.keys(results.databases).length} database(s)${paramsText ? ` from ${paramsText}` : ""}.`;
  } else if (status?.status === "failed") {
    summary = "The last enrichment run failed.";
  } else {
    summary = "Run enrichment analysis on the predicted target genes via Enrichr.";
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          {active ? <Spinner size="sm" /> : null}
          <p className="text-sm text-zinc-600">
            {summary}
            {active ? " It usually takes about a minute; you can leave this page and come back." : ""}
          </p>
        </div>
        <Button color="primary" onPress={() => setModalOpen(true)} isDisabled={active}>
          {status ? "Re-run Enrichment" : "Run Enrichment Analysis"}
        </Button>
      </div>

      {loadError ? (
        <Alert color="warning" variant="flat" title="Could not refresh the enrichment status" description={loadError} />
      ) : null}

      {status?.status === "failed" ? (
        <Alert
          color="danger"
          variant="flat"
          title={`Enrichment failed: ${status.error ?? "unknown error"}`}
          description={
            <div className="space-y-1">
              <p>Check the organism and cutoff, then re-run it. If it keeps failing, report the job ID.</p>
              {status.stderr ? (
                <details>
                  <summary className="cursor-pointer text-xs">Show the enrichment script output</summary>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-white/70 p-2 text-[11px] text-zinc-700">
                    {status.stderr}
                  </pre>
                </details>
              ) : null}
            </div>
          }
        />
      ) : null}

      {results ? <EnrichmentTabs result={results} jobId={jobId} /> : null}

      <Modal isOpen={modalOpen} onOpenChange={setModalOpen} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Run Enrichment Analysis</ModalHeader>
              <ModalBody className="space-y-3">
                <p className="text-xs text-zinc-500">
                  All predicted target genes from this job will be submitted to Enrichr.
                </p>
                <Select
                  label="Organism"
                  selectedKeys={[organism]}
                  isDisabled={Boolean(organismProp)}
                  description={
                    organismProp
                      ? "Determined by the job's species."
                      : undefined
                  }
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string | undefined;
                    if (value) setOrganism(value);
                  }}
                >
                  {ORGANISM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value}>{opt.label}</SelectItem>
                  ))}
                </Select>
                <Input
                  label="Adjusted P-value cutoff"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={cutoff}
                  onValueChange={setCutoff}
                />
                {error ? (
                  <Alert color="danger" title={error} variant="flat" />
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  onPress={onClose}
                  isDisabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleRun}
                  isLoading={submitting}
                >
                  Run
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

function EnrichmentTabs({
  result,
  jobId,
}: {
  result: EnrichmentResult;
  jobId: string;
}) {
  const databases = Object.keys(result.databases);
  const [db, setDb] = useState(databases[0] ?? "");

  useEffect(() => {
    if (!databases.includes(db) && databases.length > 0) {
      setDb(databases[0]);
    }
  }, [databases, db]);

  if (databases.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-500">
        No enrichment terms were returned.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        aria-label="Enrichment databases"
        selectedKey={db}
        onSelectionChange={(k) => setDb(k as string)}
        variant="bordered"
      >
        {databases.map((dbName) => (
          <Tab key={dbName} title={dbName.replace(/_/g, " ")}>
            <EnrichmentTable terms={result.databases[dbName] ?? []} />
          </Tab>
        ))}
      </Tabs>

      {result.has_dotplot ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <p className="mb-2 text-sm font-semibold text-zinc-900">Dotplot</p>
          <img
            src={getEnrichmentDotplotUrl(jobId)}
            alt="Enrichment dotplot"
            className="max-w-full rounded border border-zinc-100"
          />
        </div>
      ) : null}
    </div>
  );
}

type SortField = "term" | "adjp" | "combined" | "overlap";
type SortOrder = "asc" | "desc";
const ENRICHMENT_PAGE_SIZE = 20;

function parseOverlap(overlap: unknown): number {
  if (typeof overlap !== "string") return 0;
  const parts = overlap.split("/").map((n) => parseInt(n, 10));
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !parts[1]) {
    return 0;
  }
  return parts[0] / parts[1];
}

function EnrichmentTable({ terms }: { terms: EnrichmentTerm[] }) {
  const [sort, setSort] = useState<SortField>("adjp");
  const [order, setOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [terms, sort, order]);

  const sorted = useMemo(() => {
    const rows = [...terms];
    const nullFallback = order === "asc" ? Infinity : -Infinity;
    rows.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sort) {
        case "term":
          av = a.term ?? "";
          bv = b.term ?? "";
          break;
        case "adjp":
          av = a.adjusted_p_value ?? nullFallback;
          bv = b.adjusted_p_value ?? nullFallback;
          break;
        case "combined":
          av = a.combined_score ?? nullFallback;
          bv = b.combined_score ?? nullFallback;
          break;
        case "overlap":
          av = parseOverlap(a.overlap);
          bv = parseOverlap(b.overlap);
          break;
      }
      if (av < bv) return order === "asc" ? -1 : 1;
      if (av > bv) return order === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [terms, sort, order]);

  function toggle(field: SortField) {
    if (sort === field) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(field);
    setOrder(field === "term" || field === "adjp" ? "asc" : "desc");
  }

  function indicator(field: SortField) {
    if (sort !== field) return <span className="text-zinc-300">↕</span>;
    return (
      <span className="text-teal-600">{order === "asc" ? "↑" : "↓"}</span>
    );
  }

  if (terms.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-500">
        No enrichment terms in this database.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / ENRICHMENT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const startIdx = currentPage * ENRICHMENT_PAGE_SIZE;
  const endIdx = Math.min(startIdx + ENRICHMENT_PAGE_SIZE, sorted.length);
  const visible = sorted.slice(startIdx, endIdx);

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
          <tr>
            <th
              className="cursor-pointer select-none px-3 py-2"
              onClick={() => toggle("term")}
            >
              Term {indicator("term")}
            </th>
            <th
              className="cursor-pointer select-none px-3 py-2"
              onClick={() => toggle("overlap")}
            >
              Overlap {indicator("overlap")}
            </th>
            <th
              className="cursor-pointer select-none px-3 py-2"
              onClick={() => toggle("adjp")}
            >
              Adjusted P-value {indicator("adjp")}
            </th>
            <th
              className="cursor-pointer select-none px-3 py-2"
              onClick={() => toggle("combined")}
            >
              Combined Score {indicator("combined")}
            </th>
            <th className="px-3 py-2">Genes</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((t, i) => {
            const genes = Array.isArray(t.genes) ? t.genes : [];
            return (
              <tr key={i} className="border-t border-zinc-100 align-top">
                <td className="px-3 py-2 font-medium text-zinc-900">
                  {t.term}
                </td>
                <td className="px-3 py-2 text-zinc-700">{t.overlap}</td>
                <td className="px-3 py-2 text-zinc-700">
                  {t.adjusted_p_value != null
                    ? t.adjusted_p_value.toExponential(2)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  {t.combined_score != null
                    ? t.combined_score.toFixed(2)
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {genes.slice(0, 20).map((g, gi) => (
                      <Chip key={gi} size="sm" variant="flat">
                        {g}
                      </Chip>
                    ))}
                    {genes.length > 20 ? (
                      <span className="self-center text-xs text-zinc-500">
                        +{genes.length - 20} more
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500">
        <span>
          Showing{" "}
          <span className="font-medium text-zinc-700">
            {sorted.length === 0 ? 0 : startIdx + 1}–{endIdx}
          </span>{" "}
          of <span className="font-medium text-zinc-700">{sorted.length}</span>{" "}
          terms
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            isDisabled={currentPage === 0}
            onPress={() => setPage(currentPage - 1)}
          >
            Prev
          </Button>
          <span>
            Page {currentPage + 1} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="flat"
            isDisabled={currentPage >= totalPages - 1}
            onPress={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
