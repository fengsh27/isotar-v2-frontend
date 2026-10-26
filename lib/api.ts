import type {
  CreateJobPayload,
  CreateJobResponse,
  CreateNetworkJobPayload,
  EnrichmentResult,
  EnrichmentRunRequest,
  EnrichmentRunResponse,
  JobRecord,
  JobResultsParams,
  JobResultsResponse,
  KillJobResponse,
  MirnaValidationResponse,
  NetworkResponse,
  TargetValidationResponse,
  VerificationConfig,
  VerificationParams,
  VerificationStartResponse,
  VerificationStatus,
} from "@/lib/types";

// When empty the browser sends relative requests (e.g. /api/v1/jobs), which are
// transparently proxied to Flask by the Next.js rewrites in next.config.ts.
// Set NEXT_PUBLIC_API_BASE only if you need to bypass the proxy (e.g. a separate
// production deployment where the API lives on a different origin).
const API_BASE =  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function toUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(toUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const raw = await response.text();
  const data = raw ? (JSON.parse(raw) as unknown) : null;

  if (!response.ok) {
    throw new ApiError(errorMessage(data, response.status), response.status);
  }

  return data as T;
}

/** The backend reports failures as `{error, hint?}` (a few older endpoints as
 *  `{message}`); fold them into one readable line. */
function errorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null) {
    const rec = data as { error?: unknown; message?: unknown; hint?: unknown };
    const main =
      typeof rec.error === "string"
        ? rec.error
        : typeof rec.message === "string"
          ? rec.message
          : null;
    if (main) {
      return typeof rec.hint === "string" ? `${main} (${rec.hint})` : main;
    }
  }
  return `Request failed (${status})`;
}

export async function validateMiRNA(
  id: string,
): Promise<MirnaValidationResponse> {
  const trimmed = id.trim();

  if (!trimmed) {
    return {
      valid: false,
      message: "miRNA ID is required before validation.",
    };
  }

  return fetchJson<MirnaValidationResponse>(
    `/mirna/validate?id=${encodeURIComponent(trimmed)}`,
  );
}

export async function validateTargets(
  targets: string[],
  genome: string,
  targetType: "gene" | "lncrna",
): Promise<TargetValidationResponse> {
  return fetchJson<TargetValidationResponse>("/api/v1/targets/validate", {
    method: "POST",
    body: JSON.stringify({ targets, genome, target_type: targetType }),
  });
}

export async function createJob(
  payload: CreateJobPayload,
): Promise<CreateJobResponse> {
  return fetchJson<CreateJobResponse>("/api/v1/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createNetworkJob(
  payload: CreateNetworkJobPayload,
): Promise<CreateJobResponse> {
  return fetchJson<CreateJobResponse>("/api/v1/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getJob(jobId: string): Promise<JobRecord> {
  return fetchJson<JobRecord>(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
}

export async function getNetwork(
  jobId: string,
  params: { topGenes?: number; topLncrna?: number } = {},
): Promise<NetworkResponse> {
  const query = new URLSearchParams();
  if (params.topGenes !== undefined) query.set("topGenes", String(params.topGenes));
  if (params.topLncrna !== undefined) query.set("topLncrna", String(params.topLncrna));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return fetchJson<NetworkResponse>(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/network${qs}`,
  );
}

export async function killJob(jobId: string): Promise<KillJobResponse> {
  return fetchJson<KillJobResponse>(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/kill`,
    { method: "POST" },
  );
}

export async function getJobResults(
  jobId: string,
  params: JobResultsParams = {},
): Promise<JobResultsResponse> {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.ascendOrDescend) query.set("ascendOrDescend", params.ascendOrDescend);
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.number !== undefined) query.set("number", String(params.number));

  const qs = query.toString() ? `?${query.toString()}` : "";
  return fetchJson<JobResultsResponse>(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/result${qs}`,
  );
}

export async function getJobResult(jobId: string): Promise<Blob> {
  const response = await fetch(
    toUrl(`/api/v1/jobs/${encodeURIComponent(jobId)}/result`),
    { cache: "no-store" },
  );

  if (!response.ok) {
    const text = await response.text();
    let message = `Request failed (${response.status})`;
    try {
      message = errorMessage(JSON.parse(text) as unknown, response.status);
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, response.status);
  }

  return response.blob();
}

export async function runEnrichment(
  jobId: string,
  payload: EnrichmentRunRequest,
): Promise<EnrichmentRunResponse> {
  return fetchJson<EnrichmentRunResponse>(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/enrichment`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getEnrichment(jobId: string): Promise<EnrichmentResult> {
  return fetchJson<EnrichmentResult>(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/enrichment`,
  );
}

export function getEnrichmentDotplotUrl(jobId: string): string {
  // Always same-origin: this URL is rendered in an <img src>, and browsers
  // block insecure image loads on HTTPS pages. The Next.js rewrites in
  // next.config.ts proxy this to the backend server-side, so we deliberately
  // skip NEXT_PUBLIC_API_BASE here.
  return `/api/v1/jobs/${encodeURIComponent(jobId)}/enrichment/dotplot`;
}

export async function getVerificationConfig(): Promise<VerificationConfig> {
  return fetchJson<VerificationConfig>("/api/v1/verification/config");
}

export async function runVerification(
  jobId: string,
  params: VerificationParams,
): Promise<VerificationStartResponse> {
  return fetchJson<VerificationStartResponse>(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/verification`,
    { method: "POST", body: JSON.stringify(params) },
  );
}

/** Progress record plus, once succeeded, the full result. Throws an ApiError
 *  with status 404 while no verification has been started for the job. */
export async function getVerification(jobId: string): Promise<VerificationStatus> {
  return fetchJson<VerificationStatus>(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/verification`,
  );
}

export function getVerificationDownloadUrl(jobId: string): string {
  // Same-origin for the same reason as the result zip: a download on an HTTPS
  // page from an HTTP backend is blocked as mixed content.
  return `/api/v1/jobs/${encodeURIComponent(jobId)}/verification/download`;
}

export { ApiError };
