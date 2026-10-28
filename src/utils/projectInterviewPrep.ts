export interface InterviewQuestion { question: string; answer: string }
export interface InterviewPrep { version: 1; projects: Record<string, InterviewQuestion[]> }

export function parseInterviewPrep(value: unknown): InterviewPrep {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 ||
      !("projects" in value) || !value.projects || typeof value.projects !== "object" || Array.isArray(value.projects)) {
    throw new Error("Choose a valid interview preparation JSON file (version 1).");
  }
  const entries = Object.entries(value.projects);
  if (!entries.length || entries.length > 100) throw new Error("The file must contain 1–100 projects.");
  const projects: Record<string, InterviewQuestion[]> = {};
  for (const [id, questions] of entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !Array.isArray(questions) || questions.length !== 10) {
      throw new Error("Each project needs a valid project ID and exactly 10 questions and answers.");
    }
    projects[id] = questions.map((item: unknown) => {
      if (!item || typeof item !== "object" || !("question" in item) || !("answer" in item) ||
          typeof item.question !== "string" || typeof item.answer !== "string" ||
          !item.question.trim() || !item.answer.trim() || item.question.length > 500 || item.answer.length > 4000) {
        throw new Error("Every question and answer must contain text within the length limits.");
      }
      return { question: item.question.trim(), answer: item.answer.trim() };
    });
  }
  return { version: 1, projects };
}
