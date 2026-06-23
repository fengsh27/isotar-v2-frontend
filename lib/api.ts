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
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed (${response.status})`;

    throw new ApiError(message, response.status);
  }

  return data as T;
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
      const data = JSON.parse(text) as unknown;
      if (
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
      ) {
        message = (data as { message: string }).message;
      }
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
  return toUrl(`/api/v1/jobs/${encodeURIComponent(jobId)}/enrichment/dotplot`);
}

export { ApiError };
