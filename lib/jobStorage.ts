const JOB_STORAGE_KEY = "isotar.job_ids";

function normalizeJobIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  value.forEach((item) => {
    if (typeof item === "string" && item.trim()) {
      unique.add(item.trim());
    }
  });

  return Array.from(unique);
}

export function readTrackedJobIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(JOB_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return normalizeJobIds(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeTrackedJobIds(ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(normalizeJobIds(ids)));
}

export function trackJobId(jobId: string): string[] {
  const existing = readTrackedJobIds();
  const merged = normalizeJobIds([jobId, ...existing]);
  writeTrackedJobIds(merged);
  return merged;
}

export function untrackJobId(jobId: string): string[] {
  const next = readTrackedJobIds().filter((item) => item !== jobId);
  writeTrackedJobIds(next);
  return next;
}

export function clearTrackedJobs(): void {
  writeTrackedJobIds([]);
}
