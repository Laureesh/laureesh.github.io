import { normalizeAnswer } from "./learn-engine";

type Props = { revealed: boolean; choices: string[]; correctAnswers: string[]; reasons?: Record<string, string>; reviewed: boolean; onReviewed: (value: boolean) => void };
export default function UnderstandAnswer({ revealed, choices, correctAnswers, reasons, reviewed, onReviewed }: Props) {
  const normalize = normalizeAnswer;
  return <section className="understand-answer" aria-label="Understand the answer">
    <h2>{revealed ? "Review your reasoning" : "Think it through"}</h2>
    <p>{revealed ? "Compare the explanation with your reasoning, then explain the difference between the choices in your own words." : "What is the question testing? Which detail rules out the other answers? Write your reasoning before choosing."}</p>
    <label className="understand-reflection">Your reasoning <small>Practice notes for this question · not graded or saved</small><textarea rows={3} placeholder="I think this answer fits because… The other choices don’t fit because…" /></label>
    {revealed && <>
      <div className="understand-choices">{choices.map(choice => {
        const correct = correctAnswers.some(answer => normalize(answer) === normalize(choice));
        const reason = reasons?.[choice];
        return <article key={choice} className={correct ? "is-correct" : "is-incorrect"}><strong>{correct ? "Correct answer" : "Incorrect answer"}</strong><h3>{choice}</h3><p>{typeof reason === "string" && reason.trim() ? reason : "No explanation saved for this choice. Add why it fits or fails in the set editor."}</p></article>;
      })}</div>
      <label className="understand-review"><input type="checkbox" checked={reviewed} onChange={event => onReviewed(event.target.checked)} />I’ve reviewed the reasoning and identified anything I still need to clarify.</label>
    </>}
  </section>;
}
