import Modal from "./Modal";
import ExplanationLinks from "./ExplanationLinks";

export type LearnAttempt = {
  sequence: number;
  prompt: string;
  answer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
  reasons: { answer: string; explanation: string }[];
};

export default function LearnHistory({ attempts, index, onIndex, onClose }: {
  attempts: LearnAttempt[]; index: number; onIndex: (index: number) => void; onClose: () => void;
}) {
  const attempt = attempts[index];
  return <Modal className="learn-history-modal" labelledBy="learn-history-title" onClose={onClose}>
    <header><h2 id="learn-history-title">Previously answered questions</h2><button className="button quiet" onClick={onClose} aria-label="Close answer review">×</button></header>
    <article aria-live="polite">
      <p>Question {attempt.sequence + 1} · {attempt.correct ? "Correct" : "Incorrect"}</p>
      <h3>{attempt.prompt}</h3>
      <section className={attempt.correct ? "history-correct" : "history-incorrect"}><strong>Your answer{attempt.correct ? " (correct)" : " (incorrect)"}</strong><p>{attempt.answer}</p></section>
      <section className="history-correct"><strong>Correct answer</strong><p>{attempt.correctAnswer}</p></section>
      <section><strong>Explanation</strong><p><ExplanationLinks text={attempt.explanation || "No explanation was saved for this question."} /></p></section>
      {attempt.reasons.map(reason => <section key={reason.answer}><strong>{reason.answer}</strong><p><ExplanationLinks text={reason.explanation} /></p></section>)}
    </article>
    <footer><button className="button quiet" disabled={index === 0} onClick={() => onIndex(index - 1)}>← Previous</button><span>{index + 1} of {attempts.length}</span><button className="button quiet" disabled={index === attempts.length - 1} onClick={() => onIndex(index + 1)}>Next →</button><button className="button primary" onClick={onClose}>Back to session</button></footer>
  </Modal>;
}
