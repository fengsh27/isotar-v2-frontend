export type OperationType = "shift" | "modification";

export type WorkflowType = "mir-target" | "mir-lncrna";

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

export interface CreateJobResponse {
  job_id: string;
  task_id: string;
}

export interface KillJobResponse {
  job_id: string;
  status: "killed";
}

export type JobStepValue = "processing" | "predicting";

export type ToolProgressStatus = "pending" | "running" | "done";

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
