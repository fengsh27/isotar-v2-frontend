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

interface Props {
  jobId: string;
  /** Enrichr organism for this job's species; the selector is locked to it. */
  organism?: string;
}

export function EnrichmentPanel({ jobId, organism: organismProp }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [organism, setOrganism] = useState(organismProp ?? "Human");
  const [cutoff, setCutoff] = useState("0.05");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getEnrichment(jobId)
      .then((res) => {
        if (!active) return;
        if (res && res.databases && Object.keys(res.databases).length > 0) {
          setResult(res);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          return;
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  async function handleRun() {
    setRunning(true);
    setError("");
    try {
      const PAGE = 200;
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

      const cutoffNum = parseFloat(cutoff);
      if (!Number.isFinite(cutoffNum) || cutoffNum <= 0 || cutoffNum > 1) {
        throw new Error("Cutoff must be a number between 0 and 1.");
      }

      await runEnrichment(jobId, {
        genes,
        organism,
        cutoff: cutoffNum,
      });

      const fresh = await getEnrichment(jobId);
      setResult(fresh);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run enrichment.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
        <p className="text-sm text-zinc-600">
          {result
            ? `Enrichment computed across ${Object.keys(result.databases).length} database(s).`
            : "Run enrichment analysis on the predicted target genes via Enrichr."}
        </p>
        <Button color="primary" onPress={() => setModalOpen(true)}>
          {result ? "Re-run Enrichment" : "Run Enrichment Analysis"}
        </Button>
      </div>

      {result ? <EnrichmentTabs result={result} jobId={jobId} /> : null}

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
                  isDisabled={running}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleRun}
                  isLoading={running}
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
