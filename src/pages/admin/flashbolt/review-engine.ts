import type { LearnCardProgress } from "./learn-engine";

export type ReviewProgress = Record<string, { cards: Record<string, LearnCardProgress>; updatedAt: string }>;
export type ReviewCard = { id: string; term: string; definition: string; explanation?: string; imageData?: string; matchingPairs?: Array<{ left: string; right: string }> };
export type ReviewSet = { id: string; title: string; cards: ReviewCard[] };
export type ReviewEntry = { setId: string; setTitle: string; card: ReviewCard; reason: string };

export function reviewReason(progress: LearnCardProgress | undefined, now = new Date()): string | null {
  if (!progress?.attempts) return "New card";
  if (progress.misses >= 2 && progress.correctStreak < 2) return "Frequently missed";
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const due = Date.parse(progress.nextReviewAt ?? "");
  return !Number.isFinite(due) || due <= endOfToday.getTime() ? "Due today" : null;
}

export function buildReviewQueue(sets: ReviewSet[], progress: ReviewProgress, now = new Date()): ReviewEntry[] {
  const priorities: Record<string, number> = { "Frequently missed": 0, "Due today": 1, "New card": 2 };
  return sets.flatMap(set => set.cards.flatMap(card => {
    if (!card.term.trim() || !card.definition.trim()) return [];
    const reason = reviewReason(progress[set.id]?.cards[card.id], now);
    return reason ? [{ setId: set.id, setTitle: set.title, card, reason }] : [];
  })).sort((a, b) => priorities[a.reason] - priorities[b.reason]);
}

// Merge each card separately so an untouched local copy cannot replace newer
// progress from a different device. Older libraries use the set timestamp.
export function mergeReviewProgress(cloud: ReviewProgress = {}, local: ReviewProgress = {}): ReviewProgress {
  const merged: ReviewProgress = {};
  for (const setId of new Set([...Object.keys(cloud), ...Object.keys(local)])) {
    const remote = cloud[setId];
    const device = local[setId];
    const cards = { ...remote?.cards };
    for (const [id, card] of Object.entries(device?.cards ?? {})) {
      const remoteTime = Date.parse(cards[id]?.lastReviewedAt ?? remote?.updatedAt ?? "") || 0;
      const localTime = Date.parse(card.lastReviewedAt ?? device?.updatedAt ?? "") || 0;
      if (!cards[id] || localTime >= remoteTime) cards[id] = card;
    }
    merged[setId] = { cards, updatedAt: [remote?.updatedAt ?? "", device?.updatedAt ?? ""].sort().at(-1)! };
  }
  return merged;
}
