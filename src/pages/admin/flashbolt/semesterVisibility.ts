export type SemesterVisibility = Record<string, { hidden: boolean; updatedAt: number }>;

export function normalizeSemesterVisibility(value: unknown): SemesterVisibility {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry && typeof entry === "object"
    && typeof entry.hidden === "boolean" && Number.isFinite(entry.updatedAt) && entry.updatedAt >= 0));
}

// Keep explicit `hidden: false` entries so an older device cannot re-hide a
// semester after the user restores it. Merge independently for each semester.
export function mergeSemesterVisibility(cloud: unknown, local: unknown): SemesterVisibility {
  const merged = normalizeSemesterVisibility(cloud);
  for (const [semester, preference] of Object.entries(normalizeSemesterVisibility(local))) {
    if (!Object.hasOwn(merged, semester) || preference.updatedAt > merged[semester].updatedAt) {
      Object.defineProperty(merged, semester, { value: preference, enumerable: true, configurable: true, writable: true });
    }
  }
  return merged;
}
