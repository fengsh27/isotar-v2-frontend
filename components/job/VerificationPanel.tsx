"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";

import {
  ApiError,
  getVerification,
  getVerificationConfig,
  getVerificationDownloadUrl,
  runVerification,
} from "@/lib/api";
import type {
  ArmTier,
  TripletTier,
  VerificationConfig,
  VerificationResult,
  VerificationRow,
  VerificationStatus,
  VerificationVerdict,
} from "@/lib/types";
import {
  ARMS,
  ARM_LABELS,
  ARM_TIER_COLOR,
  ARM_TIER_LABELS,
  STEP_LABELS,
  TRIPLET_TIER_COLOR,
  TRIPLET_TIER_LABELS,
  VERDICT_COLOR,
  VERDICT_HELP,
  VERDICT_LABELS,
  armsSupported,
  formatRowScore,
  isSamePaperHit,
  isVariantBridge,
  looksLikePubmedBoolean,
  parseNote,
  pmidOf,
  pubmedUrl,
  tripletId,
  verdictsByTriplet,
} from "@/lib/verification";

interface Props {
  jobId: string;
  genome?: string;
  /** Called with the result once a verification has succeeded (and with null
   *  when none is available), so the network table can show the Literature
   *  column and the graph can mark supported bridges. */
  onResult?: (result: VerificationResult | null) => void;
}

const POLL_MS = 3000;
const PAGE_SIZE = 25;
const CUSTOM_TISSUE = "__custom__";
const TISSUE_LABELS: Record<string, string> = {
  lung: "Lung cancer",
  breast: "Breast cancer",
  colorectal: "Colorectal cancer",
  gastric: "Gastric cancer",
  liver: "Liver cancer (HCC)",
  prostate: "Prostate cancer",
  pancreatic: "Pancreatic cancer",
  glioma: "Glioma / glioblastoma",
};

type RowFilter = "all" | "any" | "two" | "three" | "same_paper" | "reviewed";

const ROW_FILTERS: { value: RowFilter; label: string }[] = [
  { value: "all", label: "All triplets" },
  { value: "any", label: "At least one arm found" },
  { value: "two", label: "Two or three arms found" },
  { value: "three", label: "All three arms found" },
  { value: "same_paper", label: "Same-paper record" },
  { value: "reviewed", label: "Read by the model" },
];

function isActive(status: VerificationStatus | null): boolean {
  return status?.status === "queued" || status?.status === "running";
}

function tissueLabel(value: string): string {
  if (value === "none") return "no tissue (tier 1 skipped)";
  return TISSUE_LABELS[value] ? `${TISSUE_LABELS[value]} (${value})` : value;
}

export function VerificationPanel({ jobId, genome, onResult }: Props) {
  const [config, setConfig] = useState<VerificationConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Bumped after a successful submit so the polling effect restarts.
  const [pollKey, setPollKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [tissueChoice, setTissueChoice] = useState("lung");
  const [customTissue, setCustomTissue] = useState("");
  const [llmReview, setLlmReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let active = true;
    getVerificationConfig()
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch((e) => {
        if (active) {
          setConfigError(
            e instanceof Error ? e.message : "Could not read the verification configuration.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const next = await getVerification(jobId);
        if (!active) return;
        setStatus(next);
        setError("");
        if (isActive(next)) timeoutId = setTimeout(load, POLL_MS);
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) {
          setStatus(null);
        } else {
          setError(e instanceof Error ? e.message : "Could not load the verification.");
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

  useEffect(() => {
    onResult?.(status?.status === "succeeded" ? status.result : null);
  }, [status, onResult]);

  const genomeSupported = !config || !genome || config.genomes.includes(genome);
  const canRun = Boolean(config?.enabled) && genomeSupported && !isActive(status);

  function openRunModal() {
    const previous = status?.params;
    if (previous) {
      const presets = config?.tissues ?? [];
      if (previous.tissue === "none" || presets.includes(previous.tissue)) {
        setTissueChoice(previous.tissue);
      } else {
        setTissueChoice(CUSTOM_TISSUE);
        setCustomTissue(previous.tissue);
      }
      setLlmReview(previous.llm_review && Boolean(config?.llm_review_available));
    }
    setSubmitError("");
    setModalOpen(true);
  }

  async function handleRun() {
    const tissue = tissueChoice === CUSTOM_TISSUE ? customTissue.trim() : tissueChoice;
    if (tissueChoice === CUSTOM_TISSUE && !looksLikePubmedBoolean(tissue)) {
      setSubmitError(
        'A custom tissue must be a PubMed boolean with [tiab] or [mh] fields, e.g. ("ovarian cancer"[tiab] OR "ovarian neoplasms"[mh]).',
      );
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await runVerification(jobId, { tissue, llm_review: llmReview });
      setModalOpen(false);
      setPollKey((k) => k + 1);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not start the verification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Literature verification</h3>
          <p className="text-sm text-zinc-600">
            PubMed evidence for each gene ↔ miRNA ↔ lncRNA triplet of this network
            {status?.status === "succeeded" && status.params ? (
              <>
                {" "}
                · tissue: <span className="font-medium">{tissueLabel(status.params.tissue)}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status?.status === "succeeded" ? (
            <Button
              as="a"
              href={getVerificationDownloadUrl(jobId)}
              download
              size="sm"
              variant="flat"
            >
              Download table (.tsv)
            </Button>
          ) : null}
          {config?.enabled && genomeSupported ? (
            <Button
              size="sm"
              color="primary"
              variant={status ? "flat" : "solid"}
              isDisabled={!canRun}
              onPress={openRunModal}
            >
              {status ? "Re-run verification" : "Verify against literature"}
            </Button>
          ) : null}
        </div>
      </div>

      {configError ? (
        <Alert color="warning" variant="flat" title={configError} />
      ) : null}
      {config && !config.enabled ? (
        <p className="text-sm text-zinc-500">
          Not available on this server: the backend has no NCBI E-utilities key configured.
        </p>
      ) : null}
      {config?.enabled && !genomeSupported ? (
        <p className="text-sm text-zinc-500">
          Available for {config.genomes.join(" / ")} jobs only — the search terms and the
          lncRNA symbol table are human.
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-zinc-600">
          <Spinner size="sm" /> Checking for an existing verification…
        </div>
      ) : null}

      {error ? <Alert color="danger" variant="flat" title={error} /> : null}

      {!loading && !status && config?.enabled && genomeSupported ? (
        <p className="text-sm text-zinc-600">
          Not run yet. Each predicted triplet is checked against PubMed for records that
          name both partners of each of its three arms, and for a record naming all three.
          A run takes a few minutes and keeps going if you leave this page.
        </p>
      ) : null}

      {status && isActive(status) ? <RunningView status={status} /> : null}

      {status?.status === "failed" ? (
        <Alert
          color="danger"
          variant="flat"
          title="Verification failed"
          description={status.error ?? "The search stage did not complete."}
        />
      ) : null}

      {status?.status === "succeeded" && status.result ? (
        <ResultView result={status.result} config={config} />
      ) : null}

      <Modal isOpen={modalOpen} onOpenChange={setModalOpen} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Verify triplets against the literature</ModalHeader>
              <ModalBody className="space-y-3">
                <p className="text-xs text-zinc-500">
                  Every pair × bridge miRNA of this network becomes one triplet
                  {config ? ` (the top ${config.max_triplets} by score)` : ""}. Each arm is
                  searched on PubMed titles and abstracts at three nested levels: with the
                  tissue&apos;s cancer terms, with any cancer term, and with the two symbols
                  alone.
                </p>
                <Select
                  label="Tissue context for tier 1"
                  selectedKeys={[tissueChoice]}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string | undefined;
                    if (value) setTissueChoice(value);
                  }}
                  description="Only tier 1 depends on this choice; tiers 2 and 3 are always searched."
                >
                  {[
                    ...(config?.tissues ?? ["lung"]).map((t) => (
                      <SelectItem key={t}>{tissueLabel(t)}</SelectItem>
                    )),
                    <SelectItem key="none">No tissue — skip tier 1</SelectItem>,
                    <SelectItem key={CUSTOM_TISSUE}>Custom PubMed boolean…</SelectItem>,
                  ]}
                </Select>
                {tissueChoice === CUSTOM_TISSUE ? (
                  <Input
                    label="Custom tier-1 clause"
                    placeholder='("ovarian cancer"[tiab] OR "ovarian neoplasms"[mh])'
                    value={customTissue}
                    onValueChange={setCustomTissue}
                    description="Used verbatim as the tier-1 AND clause. Must contain [tiab] or [mh] fields."
                  />
                ) : null}
                <Checkbox
                  isSelected={llmReview}
                  onValueChange={setLlmReview}
                  isDisabled={!config?.llm_review_available}
                >
                  <span className="text-sm">Have the model read the candidate papers</span>
                </Checkbox>
                <p className="-mt-2 pl-7 text-xs text-zinc-500">
                  {config?.llm_review_available
                    ? `Same-paper records and the strongest multi-arm hits (up to ${config.max_papers} papers) are read by ${config.model ?? "the configured model"}, which quotes the sentence behind each verdict. Verdicts are cached, so re-runs are cheap.`
                    : "Not available on this server: no model gateway is configured."}
                </p>
                {submitError ? (
                  <Alert color="danger" variant="flat" title={submitError} />
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose} isDisabled={submitting}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleRun} isLoading={submitting}>
                  Run
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </section>
  );
}

function RunningView({ status }: { status: VerificationStatus }) {
  const total = status.arms_total ?? 0;
  const done = status.arms_done ?? 0;
  const searching = status.step === "search_arms" && total > 0;
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
      <div className="flex items-center gap-2 text-sm text-zinc-700">
        <Spinner size="sm" />
        <span>{STEP_LABELS[status.step] ?? status.step}</span>
        {status.triplets ? (
          <span className="text-zinc-500">· {status.triplets} triplets</span>
        ) : null}
        {status.step === "review" && status.queue_total ? (
          <span className="text-zinc-500">
            · {status.queue_total} triplets queued for reading
          </span>
        ) : null}
      </div>
      <Progress
        aria-label="Verification progress"
        size="sm"
        value={searching ? done : undefined}
        maxValue={searching ? total : undefined}
        isIndeterminate={!searching}
        label={searching ? `${done} / ${total} arm queries` : undefined}
        showValueLabel={false}
      />
      <p className="text-xs text-zinc-500">
        Queries are rate-limited by NCBI and run one at a time across all jobs. You can leave
        this page; progress is stored with the job.
      </p>
    </div>
  );
}

function ResultView({
  result,
  config,
}: {
  result: VerificationResult;
  config: VerificationConfig | null;
}) {
  const [filter, setFilter] = useState<RowFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [detailId, setDetailId] = useState("");
  const [showCitations, setShowCitations] = useState(true);

  const verdicts = useMemo(() => verdictsByTriplet(result), [result]);
  const summary = result.summary;
  const review = result.review;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return result.rows.filter((r) => {
      const arms = armsSupported(r);
      switch (filter) {
        case "any":
          if (arms < 1) return false;
          break;
        case "two":
          if (arms < 2) return false;
          break;
        case "three":
          if (arms < 3) return false;
          break;
        case "same_paper":
          if (!isSamePaperHit(r)) return false;
          break;
        case "reviewed":
          if (!verdicts.has(tripletId(r))) return false;
          break;
      }
      if (!q) return true;
      return (
        r.miRNA.toLowerCase().includes(q) ||
        r.gene.toLowerCase().includes(q) ||
        r.lncRNA.toLowerCase().includes(q)
      );
    });
  }, [result, filter, query, verdicts]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);
  const detailRow = detailId
    ? result.rows.find((r) => tripletId(r) === detailId) ?? null
    : null;

  const tierCounts = (["tier1", "tier2", "tier3", "partial", "none"] as TripletTier[]).map(
    (t) => ({ tier: t, count: summary.triplet_tier?.[t] ?? 0 }),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Chip size="sm" variant="flat">
          {summary.triplets} triplets
        </Chip>
        {summary.truncated ? (
          <Chip size="sm" variant="flat" color="warning">
            top {summary.max_triplets} by score only
          </Chip>
        ) : null}
        {tierCounts
          .filter((t) => t.count > 0)
          .map((t) => (
            <Chip key={t.tier} size="sm" variant="flat" color={TRIPLET_TIER_COLOR[t.tier]}>
              {t.count} {TRIPLET_TIER_LABELS[t.tier]}
            </Chip>
          ))}
        <Chip size="sm" variant="flat" color={summary.same_paper_hits ? "success" : "default"}>
          {summary.same_paper_hits} same-paper
        </Chip>
        {summary.unsearchable_lncrna ? (
          <Chip size="sm" variant="bordered">
            {summary.unsearchable_lncrna} with unsearchable lncRNA
          </Chip>
        ) : null}
      </div>

      <ReviewStatusLine review={review} />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as RowFilter);
            setPage(0);
          }}
          className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        >
          {ROW_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Filter by miRNA, gene or lncRNA"
          className="w-56 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        />
        <label className="flex items-center gap-1.5 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={showCitations}
            onChange={(e) => setShowCitations(e.target.checked)}
            className="accent-teal-700"
          />
          Show citations
        </label>
        <span className="text-xs text-zinc-500">
          {rows.length} of {result.rows.length} triplets
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <tr className="border-b border-zinc-200">
              <th className="px-3 py-2 text-right">#</th>
              <th className="px-3 py-2 text-left">miRNA</th>
              <th className="px-3 py-2 text-left">Gene</th>
              <th className="px-3 py-2 text-left">lncRNA</th>
              <th className="px-3 py-2 text-left">Triplet</th>
              {ARMS.map((a) => (
                <th key={a.key} className="px-3 py-2 text-left">
                  {a.label}
                </th>
              ))}
              <th className="px-3 py-2 text-left">Same paper</th>
              <th className="px-3 py-2 text-left">Model verdict</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <Fragment key={tripletId(row)}>
              <tr
                onClick={() => setDetailId(tripletId(row))}
                className={`cursor-pointer align-top hover:bg-zinc-50/70 ${showCitations ? "" : "border-b border-zinc-100"}`}
              >
                <td className="px-3 py-2 text-right font-mono text-xs text-zinc-500">
                  {tripletId(row)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-800">
                  {row.miRNA}
                  {isVariantBridge(row) ? (
                    <span className="ml-1 text-[10px] text-teal-700">variant</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-800">{row.gene}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-700">{row.lncRNA}</td>
                <td className="px-3 py-2">
                  <Chip size="sm" variant="flat" color={TRIPLET_TIER_COLOR[row.triplet_tier]}>
                    {TRIPLET_TIER_LABELS[row.triplet_tier] ?? row.triplet_tier}
                  </Chip>
                </td>
                {ARMS.map((a) => (
                  <td key={a.key} className="px-3 py-2">
                    <ArmCell
                      tier={row[`${a.key}_tier`]}
                      url={row[`${a.key}_url`]}
                      note={row[`${a.key}_note`]}
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  {isSamePaperHit(row) ? (
                    <span className="text-xs">
                      <ExternalLink
                        href={row.same_paper_url}
                        title={parseNote(row.same_paper_note ?? "").citation || undefined}
                        mono
                      >
                        PMID {pmidOf(row.same_paper_url)}
                      </ExternalLink>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <VerdictChips verdicts={verdicts.get(tripletId(row)) ?? []} />
                </td>
              </tr>
              {showCitations ? (
                <LiteratureRow
                  row={row}
                  verdicts={verdicts.get(tripletId(row)) ?? []}
                  onClick={() => setDetailId(tripletId(row))}
                />
              ) : null}
              </Fragment>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-sm text-zinc-500">
                  No triplets match the current filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {rows.length > PAGE_SIZE ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500">
            <span>
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length}
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
        ) : null}
      </div>

      <HowToRead result={result} config={config} />

      <Modal
        isOpen={detailRow !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId("");
        }}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) =>
            detailRow ? (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <span>
                    Triplet #{tripletId(detailRow)}: {detailRow.miRNA} → {detailRow.gene} ⇢{" "}
                    {detailRow.lncRNA}
                  </span>
                  <span className="text-xs font-normal text-zinc-500">
                    ceRNA score {formatRowScore(detailRow.pair_score)} · bridge score{" "}
                    {formatRowScore(detailRow.bridge_score)} · node {detailRow.mirna_node}
                  </span>
                </ModalHeader>
                <ModalBody>
                  <TripletDetail
                    row={detailRow}
                    verdicts={verdicts.get(tripletId(detailRow)) ?? []}
                  />
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={onClose}>
                    Close
                  </Button>
                </ModalFooter>
              </>
            ) : null
          }
        </ModalContent>
      </Modal>
    </div>
  );
}

function ReviewStatusLine({ review }: { review: VerificationResult["review"] }) {
  switch (review.status) {
    case "disabled":
      return (
        <p className="text-xs text-zinc-500">
          Model review was not requested; tiers are keyword co-occurrence only.
        </p>
      );
    case "skipped":
      return (
        <p className="text-xs text-zinc-500">
          Model review requested, but no triplet qualified for reading (no same-paper record
          and no multi-arm hit).
        </p>
      );
    case "pending":
      return <p className="text-xs text-zinc-500">Model review pending.</p>;
    case "failed":
      return (
        <Alert
          color="warning"
          variant="flat"
          title="Model review failed; the PubMed tiers above are complete."
          description={review.error ?? undefined}
        />
      );
    case "succeeded":
    default:
      return (
        <p className="text-xs text-zinc-500">
          {review.model ?? "The model"} read {review.reviewed + review.cached} paper
          {review.reviewed + review.cached === 1 ? "" : "s"} for {review.queue_size} queued
          triplet{review.queue_size === 1 ? "" : "s"}
          {review.cached ? ` (${review.cached} from cache)` : ""}
          {review.errors ? `, ${review.errors} could not be read` : ""}. Click a row for the
          quoted sentences.
        </p>
      );
  }
}

function ArmCell({ tier, url, note }: { tier: ArmTier; url: string; note: string }) {
  if (tier === "none" || tier === "unsearchable" || !url) {
    return (
      <span className="text-xs text-zinc-400">
        {ARM_TIER_LABELS[tier] ?? tier}
      </span>
    );
  }
  const { count, citation } = parseNote(note);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={citation ? `Open in PubMed: ${citation}` : "Open in PubMed"}
      onClick={(e) => e.stopPropagation()}
      className="group inline-flex items-center gap-1 rounded-full text-teal-700 hover:text-teal-900"
    >
      <Chip
        size="sm"
        variant="flat"
        color={ARM_TIER_COLOR[tier]}
        className="transition group-hover:ring-1 group-hover:ring-teal-600"
      >
        {ARM_TIER_LABELS[tier]}
      </Chip>
      {count !== null ? (
        <span className="text-[11px] font-medium underline decoration-teal-700/40 underline-offset-2 group-hover:decoration-teal-900">
          n={count}
        </span>
      ) : null}
      <ExternalLinkIcon />
    </a>
  );
}

function VerdictChips({ verdicts }: { verdicts: VerificationVerdict[] }) {
  if (verdicts.length === 0) return <span className="text-xs text-zinc-400">—</span>;
  const counts = new Map<VerificationVerdict["verdict"], number>();
  for (const v of verdicts) counts.set(v.verdict, (counts.get(v.verdict) ?? 0) + 1);
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from(counts, ([verdict, n]) => (
        <Chip key={verdict} size="sm" variant="flat" color={VERDICT_COLOR[verdict] ?? "default"}>
          {VERDICT_LABELS[verdict] ?? verdict}
          {n > 1 ? ` ×${n}` : ""}
        </Chip>
      ))}
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-0.5 inline-block h-3 w-3 shrink-0 align-[-1px]"
    >
      <path d="M9 3h4v4M13 3 7 9M11 9.5V13H3V5h3.5" />
    </svg>
  );
}

/** A PubMed link that reads as a link: teal, underlined and marked with an
 *  external-link icon. Stops propagation so clicking it inside a table row
 *  opens the paper instead of the triplet detail modal. */
function ExternalLink({
  href,
  title,
  mono = false,
  children,
}: {
  href: string;
  title?: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      onClick={(e) => e.stopPropagation()}
      className={`font-medium text-teal-700 underline decoration-teal-700/40 underline-offset-2 hover:text-teal-900 hover:decoration-teal-900 ${mono ? "font-mono" : ""}`}
    >
      {children}
      <ExternalLinkIcon />
    </a>
  );
}

/** One citation: `<year> <journal>: <title>` linking to PubMed, falling back
 *  to the PMID when the note carries no title. */
function CitationLink({ url, note }: { url: string; note: string }) {
  const { citation } = parseNote(note);
  const text = citation.trim() || `PMID ${pmidOf(url)}`;
  return (
    <ExternalLink href={url} title={`Open in PubMed: ${text}`}>
      {text}
    </ExternalLink>
  );
}

/** Second table row of a triplet: the representative record of each arm
 *  search, the same-paper record and the papers the model read, spanning the
 *  full width so the chip columns above stay narrow. */
function LiteratureRow({
  row,
  verdicts,
  onClick,
}: {
  row: VerificationRow;
  verdicts: VerificationVerdict[];
  onClick: () => void;
}) {
  const items: { key: string; label: string; node: ReactNode }[] = [];
  for (const a of ARMS) {
    const url = row[`${a.key}_url`];
    if (!url) continue;
    const { count } = parseNote(row[`${a.key}_note`]);
    items.push({
      key: a.key,
      label: a.label,
      node: (
        <>
          <CitationLink url={url} note={row[`${a.key}_note`]} />
          {count !== null && count > 1 ? (
            <span className="text-zinc-400"> (+{count - 1} more)</span>
          ) : null}
        </>
      ),
    });
  }
  if (isSamePaperHit(row)) {
    items.push({
      key: "same_paper",
      label: "Same paper",
      node: <CitationLink url={row.same_paper_url} note={row.same_paper_note ?? ""} />,
    });
  }
  const seen = new Set<string>();
  for (const v of verdicts) {
    const k = `${v.pmid}:${v.verdict}`;
    if (seen.has(k)) continue;
    seen.add(k);
    items.push({
      key: `verdict-${k}`,
      label: "Model read",
      node: (
        <span title={v.sentences || undefined}>
          <ExternalLink href={pubmedUrl(v.pmid)} mono>
            PMID {v.pmid}
          </ExternalLink>
          <span className="text-zinc-500">
            {" "}
            → {VERDICT_LABELS[v.verdict] ?? v.verdict}
            {v.tissue ? ` in ${v.tissue}` : ""}
          </span>
        </span>
      ),
    });
  }
  return (
    <tr onClick={onClick} className="cursor-pointer border-b border-zinc-100 bg-zinc-50/40">
      <td colSpan={10} className="px-3 pb-2 pt-0 text-xs leading-snug">
        {items.length === 0 ? (
          <span className="text-zinc-400">No PubMed record for any arm.</span>
        ) : (
          <ul className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {items.map((it) => (
              <li key={it.key} className="min-w-0 max-w-[32rem]">
                <span className="text-zinc-500">{it.label}: </span>
                {it.node}
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

function TripletDetail({
  row,
  verdicts,
}: {
  row: VerificationRow;
  verdicts: VerificationVerdict[];
}) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Arms ({armsSupported(row)} of 3 found ·{" "}
          {TRIPLET_TIER_LABELS[row.triplet_tier] ?? row.triplet_tier})
        </p>
        <ul className="space-y-1.5">
          {ARMS.map((a) => {
            const tier = row[`${a.key}_tier`];
            const url = row[`${a.key}_url`];
            const { count, citation } = parseNote(row[`${a.key}_note`]);
            return (
              <li key={a.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="w-28 shrink-0 text-zinc-500">{a.label}</span>
                <span className="font-mono text-xs text-zinc-700">{row[`${a.key}_pair`]}</span>
                <Chip size="sm" variant="flat" color={ARM_TIER_COLOR[tier] ?? "default"}>
                  {ARM_TIER_LABELS[tier] ?? tier}
                </Chip>
                {url ? (
                  <span className="text-xs text-zinc-600">
                    {count !== null ? `${count} record${count === 1 ? "" : "s"}; ` : ""}
                    <ExternalLink href={url}>{citation || `PMID ${pmidOf(url)}`}</ExternalLink>
                  </span>
                ) : tier === "unsearchable" ? (
                  <span className="text-xs text-zinc-500">
                    the lncRNA has no HGNC symbol, so its Ensembl id cannot be searched
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Same-paper record
        </p>
        {isSamePaperHit(row) ? (
          <p className="text-zinc-700">
            One record names all three symbols:{" "}
            <ExternalLink href={row.same_paper_url} mono>
              PMID {pmidOf(row.same_paper_url)}
            </ExternalLink>
            {parseNote(row.same_paper_note ?? "").citation
              ? ` (${parseNote(row.same_paper_note ?? "").citation})`
              : ""}
            . Only a model verdict with its quoted sentence says whether it reports the axis.
          </p>
        ) : (
          <p className="text-zinc-500">No single record names all three symbols.</p>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Model verdicts
        </p>
        {verdicts.length === 0 ? (
          <p className="text-zinc-500">
            This triplet was not read by the model (not requested, or it did not qualify for the
            reading queue).
          </p>
        ) : (
          <ul className="space-y-3">
            {verdicts.map((v, i) => (
              <li key={`${v.pmid}-${v.scope}-${i}`} className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip size="sm" variant="flat" color={VERDICT_COLOR[v.verdict] ?? "default"}>
                    {VERDICT_LABELS[v.verdict] ?? v.verdict}
                  </Chip>
                  <span className="text-xs">
                    <ExternalLink href={pubmedUrl(v.pmid)} mono>
                      PMID {v.pmid}
                    </ExternalLink>
                  </span>
                  <span className="text-xs text-zinc-500">
                    found for {ARM_LABELS[v.scope] ?? v.scope.replace(/_/g, " ")}
                  </span>
                </div>
                <dl className="mt-2 grid gap-x-4 gap-y-0.5 text-xs text-zinc-600 sm:grid-cols-3">
                  <div>
                    <dt className="inline text-zinc-500">arm: </dt>
                    <dd className="inline">{v.arm_match}</dd>
                  </div>
                  <div>
                    <dt className="inline text-zinc-500">evidence: </dt>
                    <dd className="inline">{v.evidence_type}</dd>
                  </div>
                  <div>
                    <dt className="inline text-zinc-500">tissue: </dt>
                    <dd className="inline">{v.tissue || "unstated"}</dd>
                  </div>
                </dl>
                {v.sentences ? (
                  <blockquote className="mt-2 border-l-2 border-teal-600/60 pl-3 text-xs italic leading-relaxed text-zinc-700">
                    {v.sentences}
                  </blockquote>
                ) : null}
                {v.note ? <p className="mt-1.5 text-xs text-zinc-600">{v.note}</p> : null}
                <p className="mt-1.5 text-[11px] text-zinc-400">{VERDICT_HELP[v.verdict]}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HowToRead({
  result,
  config,
}: {
  result: VerificationResult;
  config: VerificationConfig | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs leading-relaxed text-zinc-600">
      <p className="font-semibold text-zinc-700">
        How to read this table (query version {result.query_version})
      </p>
      <p className="mt-1">
        An arm tier records that two symbols co-occur in one PubMed title or abstract:{" "}
        <strong>tier 1</strong> together with the chosen tissue&apos;s cancer terms,{" "}
        <strong>tier 2</strong> with any cancer term, <strong>tier 3</strong> the two symbols
        alone. A lower tier number means disease context was present, not stronger evidence,
        and the three arms usually come from three unrelated papers. The miRNA is searched at
        family level (the -3p/-5p suffix is dropped), so an arm hit may concern the other arm.
      </p>
      <p className="mt-1.5">
        <strong>Triplet</strong> is the worst arm tier when all three arms were found,{" "}
        <strong>partial</strong> with one or two, <strong>none</strong> otherwise.{" "}
        <strong>Unsearchable</strong> marks a lncRNA with no HGNC symbol: its Ensembl id never
        appears in abstracts, so those arms are unknown, not unsupported.
      </p>
      <p className="mt-1.5">
        The line under each triplet cites the first record PubMed returned for each search
        (year, journal, title) and the papers the model read; the other matching records are
        one click away on PubMed. <strong>Same paper</strong> is the only column pointing at a
        single record that names the whole axis. Even then, only a model verdict of{" "}
        <strong>reported interaction</strong>, with its quoted sentence, says the paper reports
        it; <strong>co-mention</strong> and <strong>look-alike</strong> hits are the common
        false positives of keyword search.
        {config?.llm_review_available
          ? " Verdicts are produced by a language model and are a reading aid; check the quoted sentence against the paper before citing it."
          : ""}
      </p>
    </div>
  );
}
