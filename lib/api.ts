import type {
  CreateJobPayload,
  CreateJobResponse,
  JobRecord,
  JobsListResponse,
  MirnaValidationResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function toUrl(path: string): string {
  if (!API_BASE) {
    return path;
  }

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

export function getApiBase(): string {
  return API_BASE;
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
  return fetchJson<CreateJobResponse>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getJobs(): Promise<JobRecord[]> {
  const data = await fetchJson<JobsListResponse | JobRecord[]>("/jobs");

  if (Array.isArray(data)) {
    return data;
  }

  return data.jobs;
}

export async function getJob(jobId: string): Promise<JobRecord> {
  return fetchJson<JobRecord>(`/jobs/${encodeURIComponent(jobId)}`);
}

export { ApiError };
