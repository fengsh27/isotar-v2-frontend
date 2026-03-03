import type {
  CreateJobPayload,
  CreateJobResponse,
  JobRecord,
  KillJobResponse,
  MirnaValidationResponse,
} from "@/lib/types";

// When empty the browser sends relative requests (e.g. /api/v1/jobs), which are
// transparently proxied to Flask by the Next.js rewrites in next.config.ts.
// Set NEXT_PUBLIC_API_BASE only if you need to bypass the proxy (e.g. a separate
// production deployment where the API lives on a different origin).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";

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

export async function getJob(jobId: string): Promise<JobRecord> {
  return fetchJson<JobRecord>(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
}

export async function killJob(jobId: string): Promise<KillJobResponse> {
  return fetchJson<KillJobResponse>(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/kill`,
    { method: "POST" },
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

export { ApiError };
