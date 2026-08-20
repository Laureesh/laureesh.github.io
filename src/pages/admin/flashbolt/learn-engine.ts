export type GradingMode = "relaxed" | "moderate" | "strict";

export type LearnQuestionKind = "multiple-choice" | "true-false" | "select-all" | "written" | "flashcard";

export type LearnCardProgress = {
  confidence: number;
  attempts: number;
  correct: number;
  misses: number;
  correctStreak: number;
  lastSeenSequence: number;
};

export const EMPTY_LEARN_CARD_PROGRESS: LearnCardProgress = {
  confidence: 0,
  attempts: 0,
  correct: 0,
  misses: 0,
  correctStreak: 0,
  lastSeenSequence: -1,
};

export type LearnRoundState = {
  roundIds: string[];
  pendingIds: string[];
  retryIds: string[];
  index: number;
  round: number;
};

export type LearnRoundAdvance = LearnRoundState & {
  complete: boolean;
  startedRetry: boolean;
  startedRound: boolean;
};

export function shuffleValues<T>(values: T[]) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export function updateLearnCardProgress(
  previous: LearnCardProgress | undefined,
  wasCorrect: boolean,
  sequence: number,
): LearnCardProgress {
  const current = previous ?? EMPTY_LEARN_CARD_PROGRESS;
  return {
    confidence: wasCorrect ? Math.min(3, current.confidence + 1) : Math.max(0, current.confidence - 1),
    attempts: current.attempts + 1,
    correct: current.correct + (wasCorrect ? 1 : 0),
    misses: current.misses + (wasCorrect ? 0 : 1),
    correctStreak: wasCorrect ? current.correctStreak + 1 : 0,
    lastSeenSequence: sequence,
  };
}

export function learnConfidenceLabel(confidence: number) {
  if (confidence >= 3) return "Mastered";
  if (confidence === 2) return "Familiar";
  if (confidence === 1) return "Learning";
  return "New";
}

export function chooseAdaptiveQuestionKind(
  confidence: number,
  enabledKinds: LearnQuestionKind[],
  sequence: number,
  canSelectAll: boolean,
): LearnQuestionKind {
  const enabled: LearnQuestionKind[] = enabledKinds.length ? enabledKinds : ["multiple-choice"];
  const stagePreferences: LearnQuestionKind[][] = [
    ["multiple-choice", "flashcard", "true-false", "select-all", "written"],
    sequence % 2 === 0
      ? ["true-false", "select-all", "multiple-choice", "written", "flashcard"]
      : ["select-all", "true-false", "multiple-choice", "written", "flashcard"],
    ["written", "select-all", "true-false", "multiple-choice", "flashcard"],
    ["written", "true-false", "select-all", "multiple-choice", "flashcard"],
  ];
  const preferences = stagePreferences[Math.min(3, Math.max(0, confidence))];
  return preferences.find((kind) => enabled.includes(kind) && (kind !== "select-all" || canSelectAll))
    ?? enabled.find((kind) => kind !== "select-all" || canSelectAll)
    ?? "multiple-choice";
}

export function rankAdaptiveCardIds(
  cardIds: string[],
  progress: Record<string, LearnCardProgress>,
  shuffleEqualPriority = false,
) {
  const tieBreakers = new Map(cardIds.map((id) => [id, shuffleEqualPriority ? Math.random() : cardIds.indexOf(id)]));
  return [...cardIds].sort((leftId, rightId) => {
    const left = progress[leftId] ?? EMPTY_LEARN_CARD_PROGRESS;
    const right = progress[rightId] ?? EMPTY_LEARN_CARD_PROGRESS;
    if (left.confidence !== right.confidence) return left.confidence - right.confidence;
    if (left.misses !== right.misses) return right.misses - left.misses;
    if (left.lastSeenSequence !== right.lastSeenSequence) return left.lastSeenSequence - right.lastSeenSequence;
    return (tieBreakers.get(leftId) ?? 0) - (tieBreakers.get(rightId) ?? 0);
  });
}

export function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const insert = current[rightIndex - 1] + 1;
      const remove = previous[rightIndex] + 1;
      const replace = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(insert, remove, replace);
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

export function gradeWrittenAnswer(answer: string, expected: string, mode: GradingMode) {
  const actual = normalizeAnswer(answer);
  const correct = normalizeAnswer(expected);
  if (!actual || !correct) return false;
  if (actual === correct) return true;
  if (mode === "strict") return false;

  const distance = editDistance(actual, correct);
  const tolerance = mode === "moderate" ? 0.12 : 0.24;
  if (distance <= Math.max(1, Math.floor(correct.length * tolerance))) return true;
  if (mode === "moderate") return false;

  const stopWords = new Set(["and", "are", "for", "from", "that", "the", "this", "with"]);
  const contentWords = (value: string) => value
    .split(" ")
    .filter((word) => word.length > 2 && !stopWords.has(word));
  const actualWords = new Set(contentWords(actual));
  const correctWords = new Set(contentWords(correct));
  if (!correctWords.size) return false;
  const matches = [...correctWords].filter((word) => actualWords.has(word)).length;
  return matches / correctWords.size >= 0.55;
}

export function advanceLearnRound(state: LearnRoundState): LearnRoundAdvance {
  if (state.index < state.roundIds.length - 1) {
    return { ...state, index: state.index + 1, complete: false, startedRetry: false, startedRound: false };
  }

  if (state.retryIds.length) {
    return {
      ...state,
      roundIds: [...state.retryIds],
      retryIds: [],
      index: 0,
      complete: false,
      startedRetry: true,
      startedRound: false,
    };
  }

  if (state.pendingIds.length) {
    return {
      ...state,
      roundIds: state.pendingIds.slice(0, 7),
      pendingIds: state.pendingIds.slice(7),
      retryIds: [],
      index: 0,
      round: state.round + 1,
      complete: false,
      startedRetry: false,
      startedRound: true,
    };
  }

  return { ...state, complete: true, startedRetry: false, startedRound: false };
}

export function projectLearnQuestionTotal(
  cardIds: string[],
  masteredIds: string[],
  progress: Record<string, LearnCardProgress | undefined>,
  masteryTarget: number,
  answered: number,
) {
  const mastered = new Set(masteredIds);
  const remaining = cardIds.reduce((total, cardId) => {
    if (mastered.has(cardId)) return total;
    const confidence = progress[cardId]?.confidence ?? 0;
    // Every card not yet completed in this session is shown at least once.
    return total + Math.max(1, masteryTarget - confidence);
  }, 0);
  return answered + remaining;
}
