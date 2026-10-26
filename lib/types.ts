export type OperationType = "shift" | "modification";

export type WorkflowType = "mir-target" | "mir-lncrna" | "mir-network";

export type JobStatusValue =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "killed";

export interface WizardConfig {
  cores: number;
  maxRuntime: string;
  outputFormat: "standard" | "extended";
  referenceFile?: "hg19" | "hg38" | null;
}

export interface CreateJobPayload {
  mirna_id?: string;
  mirna_seq?: string;
  tools: string[];
  workflow: WorkflowType;
  genome?: string;
  cores?: number;
  modifications?: string[];
  shift?: string;
  pre_id?: string;
  targets?: string[];
}

/** Correlation magnitudes for one ceRNA pair, each `0 <= x <= 1`. Every key is
 *  optional: an omitted one is recorded by the backend in `corr_defaulted` and
 *  scores as 1, so a pair with no correlation data falls back to prediction
 *  consensus alone rather than scoring zero. Sent as magnitudes because the
 *  score multiplies all three — see `parsePairs`. */
export interface PairCorrelations {
  /** corr(miRNA, gene) */
  mirna_gene?: number;
  /** corr(miRNA, lncRNA) */
  mirna_lncrna?: number;
  /** corr(gene, lncRNA) */
  gene_lncrna?: number;
}

/** One hypothesized ceRNA (gene, lncRNA) pair supplied for a network job. */
export interface NetworkPairInput {
  gene: string;
  lncrna: string;
  /** Omitted entirely when the user supplied no correlations for this pair. */
  corr?: PairCorrelations;
}

/** One operation spec applied to a miRNA to produce a variant graph node.
 *  At least one of `shift` / `modifications` must be present (backend rejects
 *  a spec with neither). Both may be present, in which case the shift and
 *  modifications combine into a single variant. */
export interface NetworkVariantSpec {
  /** `"left|right"`, both integers (may be negative). Example: `"-7|1"`. */
  shift?: string;
  /** `"pos:from|to"` strings; 1-based position, nucleotides A/C/G/T/U. */
  modifications?: string[];
}

/** Payload for the mir-network workflow: a list of miRNAs run against both the
 *  gene and lncRNA pools, with optional ceRNA pairs. */
export interface CreateNetworkJobPayload {
  workflow: "mir-network";
  mirna_ids: string[];
  /** Optional per-miRNA precursor disambiguation: `{ "<mirna_id>": "<pre_id>" }`.
   *  Only multi-precursor miRNAs need an entry; omitted miRNAs use backend
   *  default resolution. */
  pre_ids?: Record<string, string>;
  /** Optional per-miRNA variant specs. Each spec becomes one variant graph
   *  node alongside the (always-emitted) WT node for that miRNA. */
  variants?: Record<string, NetworkVariantSpec[]>;
  tools: string[];
  genome?: string;
  cores?: number;
  /** Required by the wizard (discovery mode is not offered in the UI), though
   *  the backend still accepts a pairless job. */
  pairs?: NetworkPairInput[];
  /** Scan only the pairs' own gene/lncRNA targets instead of the whole
   *  reference. Sent whenever `pairs` is present — a pairs run only ever
   *  displays the pair bridges, so scanning the full genome to discard >99.9%
   *  of it just costs hours. Requires `pairs`; the backend rejects it without.
   *  Trade-off: /result and the result zip then carry only the pair targets,
   *  not the genome-wide table. */
  restrict_to_pairs?: boolean;
}

export type NetworkNodeType = "gene" | "mirna" | "lncrna";

export interface NetworkNode {
  id: string;
  type: NetworkNodeType;
  label: string;
  name?: string | null;
  /** miRNA nodes only: the parent miRNA id shared by a miRNA's WT and all
   *  its variant nodes. For non-variant nodes, `base === id`. Absent on
   *  gene/lncrna nodes. */
  base?: string;
}

export interface NetworkEdge {
  /** gene_id or mirna_id depending on `side`. */
  source: string;
  /** mirna_id or lncrna_id depending on `side`. */
  target: string;
  /** "gene" = gene↔miRNA edge; "lncrna" = miRNA↔lncRNA edge. */
  side: "gene" | "lncrna";
  tools: string[];
  tool_count: number;
}

/** One bridging miRNA node's support for a pair. Variants are separate nodes
 *  with their own tool counts, so a pair carries one row per bridge. */
export interface NetworkPairBridge {
  /** miRNA node id — the base id for WT, the full variant header otherwise. */
  mirna: string;
  is_variant: boolean;
  /** Tools predicting this miRNA node against the pair's gene / lncRNA. */
  gene_tools: number;
  lncrna_tools: number;
  /** `sqrt((gene_tools / total) * (lncrna_tools / total))`, 0..1. */
  consensus: number;
  /** `corr_product * consensus`. */
  score: number;
}

export interface NetworkPair {
  gene: string;
  gene_input?: string | null;
  gene_label: string;
  lncrna: string;
  /** Effective correlations used for scoring (defaults filled in). */
  corr: Required<PairCorrelations>;
  /** Correlation keys the user left blank, which scored as 1. */
  corr_defaulted: (keyof PairCorrelations)[];
  /** Product of the three correlations — constant across this pair's bridges. */
  corr_product: number;
  /** The WT node's score: a pair-level score is a claim about the real miRNA,
   *  so an in-silico variant never sets it. `null` when WT does not bridge the
   *  pair at all — the pair is still returned, since a variant bridging what WT
   *  cannot is itself a result. */
  score: number | null;
  score_version: number;
  /** Highest-scoring node whether or not it is WT. */
  best_bridge: { mirna: string; score: number; is_variant: boolean };
  bridges: NetworkPairBridge[];
  bridge_mirnas: string[];
}

export interface NetworkSummary {
  mode: "pairs" | "discovery";
  gene_count: number;
  mirna_count: number;
  lncrna_count: number;
  edge_count: number;
  pair_count: number;
  truncated: boolean;
  score_version: number;
  /** Score denominators: tools actually run per pool (lncRNA drops TargetScan). */
  tool_totals: { gene: number; lncrna: number };
}

export interface NetworkResponse {
  job_id: string;
  mode: "pairs" | "discovery";
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  pairs: NetworkPair[];
  summary: NetworkSummary;
}

export interface MirnaValidationResponse {
  valid: boolean;
  canonical_id?: string;
  message?: string;
  metadata?: {
    name?: string;
    family?: string;
    length_nt?: number;
    source?: string;
  };
}

export type TargetMatchedBy =
  | "symbol"
  | "accession"
  | "transcript"
  | "gene"
  | null;

export interface TargetValidationResult {
  target: string;
  valid: boolean;
  matched_by: TargetMatchedBy;
}

export interface TargetValidationResponse {
  genome: string;
  species: string;
  target_type: "gene" | "lncrna";
  results: TargetValidationResult[];
  valid_count: number;
  invalid: string[];
}

export interface CreateJobResponse {
  job_id: string;
  task_id: string;
}

export interface KillJobResponse {
  job_id: string;
  status: "killed";
}

export type JobStepValue = "processing" | "predicting";

export type ToolProgressStatus = "pending" | "running" | "done" | "failed";

export interface ToolProgress {
  status: ToolProgressStatus;
  /** First time this tool started (across miRNAs and, for mir-network, pools). */
  started_at: number | null;
  /** Last time it finished. With `started_at` this brackets the tool's work but
   *  is NOT its duration — the bracket also spans other tools' runs. */
  finished_at: number | null;
  /** Seconds of actual work, accumulated over every run of this tool. This is
   *  the real "time costed". Null on jobs predating the field. */
  elapsed?: number | null;
  /** Start of the in-flight run, so a running tool can live-count from
   *  `elapsed`. Null when the tool is not currently running. */
  running_since?: number | null;
}

export interface JobProgressInfo {
  total_tools: number;
  completed_tools: number;
  current_tool: string;
  updated_at: number;
  tools_status: Record<string, ToolProgress>;
}

export type JsonRecord = Record<string, unknown>;

export interface JobResultsData {
  summary?: JsonRecord;
  predicted_targets?: JsonRecord[];
  enrichment?: JsonRecord[];
}

export interface GeneRecord {
  gene_id: string;
  gene_label: string;
  gene_name: string;
  tool_count: number;
  tools: string[];
}

/** One exclusive region of an UpSet plot: targets predicted by *exactly* these tools. */
export interface VennCombination {
  /** Tools present in this region — a subset of the keys in `VennData.sets`. */
  tools: string[];
  /** Number of targets predicted by exactly these tools and no others. */
  size: number;
}

export interface VennData {
  /** Total targets predicted per tool, keyed by tool name. */
  sets: Record<string, number>;
  /**
   * Inclusive ("shared by at least") counts, keyed by `&`-joined tool names
   * (e.g. `"Targetscan&miRanda"`). Used for the 2- and 3-set circle Venn.
   */
  intersections: Record<string, number>;
  /**
   * Exclusive intersection sizes for UpSet-style display when there are 4+ tools.
   * Optional — older backends may omit it, in which case the table fallback is used.
   */
  combinations?: VennCombination[];
  /**
   * Consensus distribution: number of targets predicted by exactly k tools,
   * keyed `"1"`..`"N"`. Optional — derived from `combinations` when absent.
   */
  degrees?: Record<string, number>;
}

export interface JobResultsResponse {
  job_id: string;
  total_genes: number;
  total: number;
  offset: number;
  number: number;
  sort_by: string;
  order: string;
  genes: GeneRecord[];
  venn?: VennData;
}

export interface JobResultsParams {
  keyword?: string;
  sortBy?: "gene_label" | "tool_count";
  ascendOrDescend?: "asc" | "desc";
  offset?: number;
  number?: number;
}

export interface EnrichmentRunRequest {
  genes: string[];
  organism?: string;
  cutoff?: number;
}

export interface EnrichmentRunResponse {
  job_id: string;
  outdir: string;
}

export interface EnrichmentTerm {
  term: string;
  overlap: string;
  p_value: number | null;
  adjusted_p_value: number | null;
  odds_ratio: number | null;
  combined_score: number | null;
  genes: string[];
}

export interface EnrichmentResult {
  job_id: string;
  databases: Record<string, EnrichmentTerm[]>;
  has_dotplot: boolean;
}

export interface JobRecord {
  job_id: string;
  task_id: string;
  status: JobStatusValue;
  step?: JobStepValue;
  created_at?: number;
  started_at?: number;
  finished_at?: number;
  genome?: string;
  workflow?: WorkflowType;
  mirna_id?: string;
  mirna_ids?: string[];
  pair_count?: number;
  operations?: string[];
  tools?: string[];
  cores?: number;
  result_path?: string;
  error?: string;
  progress?: JobProgressInfo;
  modifications?: string[];
  shift?: string | null;
  pre_id?: string | null;
}

// ---------------------------------------------------------------------------
// Literature verification (mir-network jobs) — `/api/v1/jobs/<id>/verification`
// ---------------------------------------------------------------------------

/** What the deployment can do, from `GET /api/v1/verification/config`. */
export interface VerificationConfig {
  /** False until the backend has an NCBI API key; POST then returns 503. */
  enabled: boolean;
  /** False until an Anthropic-compatible gateway is configured on the backend. */
  llm_review_available: boolean;
  /** Model name as the gateway exposes it; null when review is unavailable. */
  model: string | null;
  /** Tissue presets accepted by `tissue` (besides `none` and a raw boolean). */
  tissues: string[];
  /** Genomes a verification may run on (the search terms are human). */
  genomes: string[];
  /** Top-ranked triplets searched per job. */
  max_triplets: number;
  /** Papers the model reads per job (cached verdicts are not counted). */
  max_papers: number;
}

export interface VerificationParams {
  /** A preset name, `none` (tier 1 skipped) or a raw PubMed boolean with
   *  `[tiab]`/`[mh]` fields. Default `lung`. */
  tissue: string;
  llm_review: boolean;
}

export interface VerificationStartResponse {
  job_id: string;
  status: "queued";
  task_id: string;
  params: VerificationParams;
}

export type VerificationStatusValue = "queued" | "running" | "succeeded" | "failed";

export type VerificationStep =
  | "queued"
  | "triplets"
  | "search_arms"
  | "same_paper"
  | "summaries"
  | "rollup"
  | "review"
  | "done"
  | "failed";

/** Evidence tier of one arm. `"1"` tissue cancer terms, `"2"` any cancer term,
 *  `"3"` the two symbols only, `none` no record, `unsearchable` when the lncRNA
 *  has no HGNC symbol. A lower number records disease context, not stronger
 *  evidence. */
export type ArmTier = "1" | "2" | "3" | "none" | "unsearchable";

/** Roll-up of the three arms: `tier{worst arm}` when all three hit, `partial`
 *  with one or two, `none` otherwise. */
export type TripletTier = "tier1" | "tier2" | "tier3" | "partial" | "none";

export type VerificationArm = "mir_gene" | "mir_lnc" | "gene_lnc";

/** One triplet (pair × bridge miRNA) of the verification table. The arm
 *  fields are flattened as `<arm>_pair|tier|url|note` in the backend TSV and
 *  JSON alike; `pmid` columns are not sent, the `url` carries it. Numeric
 *  fields arrive as strings because the TSV is the source of the JSON rows. */
export interface VerificationRow {
  /** Rank, 1-based. A number in the JSON result, a string in verdict rows. */
  id: number | string;
  miRNA: string;
  gene: string;
  lncRNA: string;
  triplet_tier: TripletTier;
  arms_supported: number | string;
  /** `1` when one PubMed record names all three symbols, `0` when none does,
   *  `""` when the triplet could not be searched for one. */
  same_paper_hit: number | string;
  same_paper_url: string;
  mir_gene_pair: string;
  mir_gene_tier: ArmTier;
  mir_gene_url: string;
  /** `n=<count>; <year> <journal>: <title>` of the representative record. */
  mir_gene_note: string;
  mir_lnc_pair: string;
  mir_lnc_tier: ArmTier;
  mir_lnc_url: string;
  mir_lnc_note: string;
  gene_lnc_pair: string;
  gene_lnc_tier: ArmTier;
  gene_lnc_url: string;
  gene_lnc_note: string;
  /** RefSeq id of the gene node, matching `NetworkPair.gene`. */
  gene_id: string;
  /** Ensembl transcript id of the lncRNA node, matching `NetworkPair.lncrna`. */
  lncrna_id: string;
  /** miRNA node id, matching `NetworkPairBridge.mirna`. */
  mirna_node: string;
  /** `""` when WT does not bridge the pair. */
  pair_score: number | string;
  bridge_score: number | string;
  bridge_is_variant: boolean | string;
}

export interface VerificationSummary {
  triplets: number;
  with_any_arm: number;
  with_two_arms: number;
  with_three_arms: number;
  same_paper_hits: number;
  unsearchable_lncrna: number;
  triplet_tier: Partial<Record<TripletTier, number>>;
  /** True when more triplets existed than `max_triplets`. */
  truncated: boolean;
  max_triplets: number;
}

export type VerificationQueueReason =
  | "same_paper"
  | "three_arms"
  | "two_arms_tissue"
  | "two_arms_experimental";

/** One triplet handed to the model, with the records it should read. */
export interface VerificationQueueItem {
  id: number | string;
  miRNA: string;
  gene: string;
  lncRNA: string;
  reason: VerificationQueueReason;
  arms_supported: number | string;
  triplet_tier: TripletTier;
  /** `[scope, pmid]` pairs; scope is `same_paper` or an arm name. */
  pmids: [string, string][];
  terms: string[];
}

export type VerdictValue =
  | "reported_interaction"
  | "opposite_arm"
  | "co_mention"
  | "look_alike"
  | "editorial_notice"
  | "not_accessible";

export interface VerificationVerdict {
  /** Triplet id (rank) the verdict belongs to; compare via `String()`. */
  id: number | string;
  /** `same_paper` or the arm the record was found for. */
  scope: string;
  pmid: string;
  verdict: VerdictValue;
  arm_match: "same" | "opposite" | "unstated" | "na";
  /** Tissue or disease context the paper reports, free text. */
  tissue: string;
  evidence_type: "reporter" | "rip" | "expression" | "computational" | "review" | "none";
  /** Sentences quoted verbatim from the paper that support the verdict. */
  sentences: string;
  note: string;
}

export interface VerificationReview {
  status: "disabled" | "skipped" | "pending" | "succeeded" | "failed";
  model: string | null;
  queue_size: number;
  reviewed: number;
  cached: number;
  errors: number;
  error: string | null;
  verdicts: VerificationVerdict[];
}

export interface VerificationResult {
  query_version: number;
  params: VerificationParams & { tissue_terms: string | null };
  genome: string;
  started_at: number;
  finished_at: number;
  summary: VerificationSummary;
  columns: string[];
  rows: VerificationRow[];
  queue: VerificationQueueItem[];
  review: VerificationReview;
}

/** `GET /api/v1/jobs/<id>/verification`: the progress record, with `result`
 *  filled in once `status` is `succeeded`. 404 until a run was started. */
export interface VerificationStatus {
  job_id: string;
  status: VerificationStatusValue;
  step: VerificationStep;
  params: VerificationParams;
  task_id?: string;
  queued_at?: number;
  started_at?: number;
  finished_at?: number;
  updated_at?: number;
  /** Distinct (arm, symbols) queries searched so far / in total. */
  arms_done?: number;
  arms_total?: number;
  triplets?: number;
  queue_total?: number;
  reviewed?: number;
  error: string | null;
  result: VerificationResult | null;
}
