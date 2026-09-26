export type AutoAdvanceEvent = "question" | "choices" | "correct";

// Later steps in the card-entry workflow take precedence over earlier ones.
export function activeAutoAdvance(question: boolean, choices: boolean, correct: boolean): AutoAdvanceEvent | null {
  if (correct) return "correct";
  if (choices) return "choices";
  if (question) return "question";
  return null;
}
