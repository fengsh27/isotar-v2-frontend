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

/** One hypothesized ceRNA (gene, lncRNA, score) triple supplied for a network
 *  job. `score` is a caller-provided ranking / correlation for the pair — the
 *  backend requires it (a finite number, not bool) and carries it through
 *  untouched for downstream use, though the frontend does not consume it yet. */
export interface NetworkPairInput {
  gene: string;
  lncrna: string;
  score: number;
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
  pairs?: NetworkPairInput[];
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

export interface NetworkPair {
  gene: string;
  gene_input?: string | null;
  gene_label: string;
  lncrna: string;
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
  started_at: number | null;
  finished_at: number | null;
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
