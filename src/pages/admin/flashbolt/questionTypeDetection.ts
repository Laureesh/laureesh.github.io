export type DetectedQuestionType = "multiple-choice" | "select-all" | "true-false" | "written" | "matching";

export function detectQuestionType(term: string): DetectedQuestionType | null {
  const text = term.replace(/&nbsp;|&#(?:x20|32);/gi, " ").replace(/\s+/g, " ").trim();
  // Explicit multi-answer instructions take priority over single-answer wording.
  if (/\b(?:choose|select|pick|check|mark)\s+(?:(?:the|any|exactly)\s+)?(?:[2-9]|[1-9]\d+|two|three|four|five|six|seven|eight|nine|ten)\b|\b(?:select|choose|check|mark)\s+all\s+(?:that\s+apply|correct|applicable)|\b(?:more than one|multiple)\s+(?:answer|response|option|choice)s?\s+(?:may|can|are|is)\b/i.test(text)) return "select-all";
  if (/(?:^|[.?!:(])\s*true\s*(?:or|\/)\s*false\b|\b(?:is|whether)\s+(?:this\s+|the\s+)?(?:following\s+)?statement\s+(?:is\s+)?true\s+or\s+false\b|\b(?:state|determine|indicate)\b[^.!?]{0,70}\btrue\s+or\s+false\b/i.test(text)) return "true-false";
  if (/\b(?:choose|select|pick)\s+(?:(?:the|a)\s+)?(?:(?:single|one)\s+)?(?:best|correct|most appropriate)\s+(?:answer|response|option|choice)\b|\b(?:choose|select|pick)\s+(?:one|1|a single)\s*(?:answer|response|option|choice)?\b/i.test(text)) return "multiple-choice";
  if (/\bmatch\s+(?:each|the following)\b|\bmatching\s+(?:pairs|question|exercise)\b/i.test(text)) return "matching";
  if (/\bfill\s+in\s+the\s+blank(?:s)?\b|\b(?:write|type|enter)\s+(?:a\s+)?(?:short|written)\s+answer\b/i.test(text)) return "written";
  return null;
}

type AutoTypeCard = {
  id: string; term: string; definition: string;
  questionType?: DetectedQuestionType | "flashcard";
  questionTypeMode?: "auto" | "manual";
  answerChoices?: string[];
  correctAnswers?: string[];
  autoTypePreviousChoices?: string[];
  matchingPairs?: { id: string; left: string; right: string }[];
};

export function withCorrectChoiceAnswers<T extends AutoTypeCard>(card: T): T {
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  let answers = card.correctAnswers;
  if (!answers?.length && card.answerChoices?.length) {
    const parts = card.definition.split(/;\s*/).filter(part => part.trim());
    const matched = parts.map(part => card.answerChoices?.find(choice => normalize(choice) === normalize(part)));
    if (parts.length > 1 && matched.every((answer): answer is string => Boolean(answer))) answers = matched;
  }
  if (!answers?.length) return card;
  const distinct = [...new Map(answers.map(answer => [normalize(answer), answer])).values()];
  return { ...card, correctAnswers: distinct, ...(distinct.length > 1 && card.questionTypeMode !== "manual" ? { questionType: "select-all" as const } : {}) };
}

export function applyDetectedQuestionType<T extends AutoTypeCard>(card: T): T {
  if (card.questionTypeMode === "manual") return card;
  card = withCorrectChoiceAnswers(card);
  const questionType = (card.correctAnswers?.length ?? 0) > 1 ? "select-all" : detectQuestionType(card.term);
  if (!questionType) return card;
  const next = { ...card, questionType };
  if (questionType === "true-false") {
    if (card.answerChoices?.some(choice => choice.trim() && !/^(true|false)$/i.test(choice.trim()))) {
      next.autoTypePreviousChoices = [...card.answerChoices];
    }
    next.answerChoices = ["True", "False"];
    // Never guess a correct answer or replace the supplied definition.
  } else {
    if (card.autoTypePreviousChoices) {
      next.answerChoices = [...card.autoTypePreviousChoices];
      delete next.autoTypePreviousChoices;
    }
    if ((questionType === "multiple-choice" || questionType === "select-all") && (!next.answerChoices || next.answerChoices.length < 2)) {
      next.answerChoices = ["", "", "", ""];
    }
  }
  if (questionType === "matching" && !card.matchingPairs?.length) {
    next.matchingPairs = Array.from({ length: 4 }, (_, index) => ({ id: `${card.id}-auto-pair-${index}`, left: "", right: "" }));
  }
  return next;
}
