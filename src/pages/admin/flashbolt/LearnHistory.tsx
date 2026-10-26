import ExplanationLinks from "./ExplanationLinks";
import { referenceUrl } from "./referenceUrl";

export type LearnAttempt = {
  sequence: number;
  prompt: string;
  answer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
  reasons: { answer: string; explanation: string }[];
  cardId?: string;
  kind?: string;
  choices?: string[];
  selectedAnswers?: string[];
  correctAnswers?: string[];
  references?: string[];
  stage?: string;
  feedback?: string;
  imageData?: string;
  round?: number;
  roundSize?: number;
  roundIndex?: number;
  retries?: number;
  pending?: number;
  retryPass?: boolean;
};

export default function LearnHistory({ attempt, onNext, onReturn, explanation, references }: {
  attempt: LearnAttempt; onNext: () => void; onReturn: () => void; explanation?: string; references?: string[];
}) {
  const choices = attempt.choices ?? [...new Set([attempt.answer, attempt.correctAnswer])];
  const correctAnswers = attempt.correctAnswers ?? [attempt.correctAnswer];
  const selectedAnswers = attempt.selectedAnswers ?? [attempt.answer];
  const links = references ?? attempt.references ?? [];
  return <div className="learn-question-main learn-history-question">
    <div className="learn-question-status has-feedback">
      <div className={`answer-feedback ${attempt.correct ? "correct" : "incorrect"}`}>
        <div className="feedback-copy"><strong>{attempt.correct ? "Nice work." : "Not quite yet."}</strong><p>{attempt.feedback ?? (attempt.correct ? "You answered this question correctly." : `The correct answer is ${attempt.correctAnswer}.`)}</p></div>
        <div className="learn-continue-action"><small>Previously answered · Question {attempt.sequence + 1}</small><button className="button primary" onClick={onNext}>Next question →</button><button className="button quiet" onClick={onReturn}>Return to current question</button></div>
        <div className="feedback-explanation learn-explanation-editor">
          {(explanation ?? attempt.explanation) && <p><ExplanationLinks text={explanation ?? attempt.explanation} /></p>}
          {!!links.length && <div className="learn-reference-links"><strong>References</strong><ul>{links.map((link, index) => <li key={index}>{referenceUrl(link) ? <a href={referenceUrl(link)!} target="_blank" rel="noopener noreferrer">{link}</a> : link}</li>)}</ul></div>}
        </div>
      </div>
    </div>
    <div className="question-card ready-to-continue">
      <div className="learn-question-stage"><span className="eyebrow">{attempt.stage ?? "Choose the definition"}</span></div>
      <h1>{attempt.prompt}</h1>
      {attempt.imageData && <img width={320} height={185} className="learn-question-image" src={attempt.imageData} alt="Question study aid" />}
      {attempt.kind === "written" || attempt.kind === "flashcard" ? <div className="written-answer"><label><span>Your answer</span><input value={attempt.answer} disabled /></label><p>Correct answer: <strong>{attempt.correctAnswer}</strong></p></div> :
        <div className="answer-grid">{choices.map((option, index) => {
          const correct = correctAnswers.includes(option);
          const selected = selectedAnswers.includes(option);
          const reason = attempt.reasons.find(reason => reason.answer === option)?.explanation;
          return <button key={option} disabled className={`${correct ? "correct" : selected ? "incorrect" : "muted"}${reason ? " has-explanation" : ""}`} aria-label={`${option}${selected ? ", your answer" : ""}${correct ? ", correct answer" : ""}`}>
            <span>{String.fromCharCode(65 + index)}</span><span className="answer-choice-copy"><strong className="answer-choice-title">{option}</strong>{selected && <small className="learn-history-selection">Your answer</small>}{reason && <span className="answer-choice-explanation"><span className="answer-explanation-label">Explanation</span><ExplanationLinks text={reason} /></span>}</span>
          </button>;
        })}</div>}
    </div>
  </div>;
}
