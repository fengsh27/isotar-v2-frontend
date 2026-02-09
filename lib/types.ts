export type OperationType = "shift" | "modification";

export type JobStatusValue =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface WizardConfig {
  cores: number;
  maxRuntime: string;
  outputFormat: "standard" | "extended";
}

export interface CreateJobPayload {
  mirna_id: string;
  operation: OperationType;
  tools: string[];
  species: string;
  configuration: WizardConfig;
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
}

export interface JobProgressInfo {
  percent?: number;
  stage?: string;
  message?: string;
  log_url?: string;
}

export interface JobErrorInfo {
  code?: string;
  message: string;
  details?: string;
}

export type JsonRecord = Record<string, unknown>;

export interface JobResultsData {
  summary?: JsonRecord;
  predicted_targets?: JsonRecord[];
  enrichment?: JsonRecord[];
}

export interface JobRecord {
  job_id: string;
  status: JobStatusValue;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  progress?: JobProgressInfo;
  results?: JobResultsData;
  error?: JobErrorInfo;
}

export interface JobsListResponse {
  jobs: JobRecord[];
}
