export type AutoAdvanceEvent = "question" | "choices" | "correct";

// Later steps in the card-entry workflow take precedence over earlier ones.
export function activeAutoAdvance(question: boolean, choices: boolean, correct: boolean): AutoAdvanceEvent | null {
  if (correct) return "correct";
  if (choices) return "choices";
  if (question) return "question";
  return null;
}

export function requestedAnswerCount(term: string): number | null {
  const text = term.replace(/&nbsp;|&#(?:x20|32);/gi, " ").replace(/\s+/g, " ");
  const match = text.match(/\b(?:choose|select|pick|check|mark)\s+(?:(?:the|any|exactly)\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
  if (!match) return null;
  const words = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const count = words.indexOf(match[1].toLowerCase()) + 1 || Number(match[1]);
  return Number.isInteger(count) && count > 0 ? count : null;
}

export function shouldAdvanceAfterCorrect(term: string, isMultiAnswer: boolean, count: number, added: boolean): boolean {
  if (!added) return false;
  const required = requestedAnswerCount(term);
  // Without an explicit count, a multi-answer card must stay open for more selections.
  if (isMultiAnswer || (required !== null && required > 1)) return required !== null && count === required;
  return count === 1;
}
