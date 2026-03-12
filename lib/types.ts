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
  target_gene_ids?: string[];
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
  tool_count: number;
  tools: string[];
}

export interface VennData {
  sets: Record<string, number>;
  intersections: Record<string, number>;
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
  geneLabel?: string;
  sortBy?: "gene_label" | "tool_count";
  ascendOrDescend?: "asc" | "desc";
  offset?: number;
  number?: number;
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
