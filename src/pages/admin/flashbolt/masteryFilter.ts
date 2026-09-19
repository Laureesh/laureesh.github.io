export type MasteryFilter = { mode: "all" | "above" | "below"; percentage: number };
export const DEFAULT_MASTERY_FILTER: MasteryFilter = { mode: "all", percentage: 50 };
export const MASTERY_FILTER_KEY = "flashbolt.local.v1.masteryFilter";

export function normalizeMasteryFilter(value: unknown): MasteryFilter {
  const candidate = value && typeof value === "object" ? value as Partial<MasteryFilter> : {};
  return {
    mode: candidate.mode === "above" || candidate.mode === "below" ? candidate.mode : "all",
    percentage: typeof candidate.percentage === "number" && Number.isFinite(candidate.percentage)
      ? Math.max(0, Math.min(100, Math.round(candidate.percentage))) : 50,
  };
}

export function masteryPercentage(cards: { id: string }[], masteredIds: string[] = []): number {
  if (!cards.length) return 0;
  const mastered = new Set(masteredIds);
  return Math.round(100 * cards.filter(card => mastered.has(card.id)).length / cards.length);
}

export function matchesMasteryFilter(percentage: number, filter: MasteryFilter): boolean {
  if (filter.mode === "above") return percentage <= filter.percentage;
  if (filter.mode === "below") return percentage >= filter.percentage;
  return true;
}
