import type { ReviewCard } from "./review-engine";

export function StudyExplanation({ text }: { text?: string }) {
  return text?.trim() ? <aside className="study-explanation"><strong>Why this answer?</strong><p>{text}</p></aside> : null;
}

export default function StudySummary({ missed, onRetry }: { missed: ReviewCard[]; onRetry: () => void }) {
  return <section className="study-summary" aria-label="Session mistakes">
    <div className="study-summary-heading"><div><span className="eyebrow">Session review</span><h2>{missed.length ? `${missed.length} question${missed.length === 1 ? "" : "s"} to revisit` : "No mistakes this session"}</h2><p>{missed.length ? "These questions were missed at least once during this session." : "Great recall. Your next review dates are saved with your progress."}</p></div>{missed.length > 0 && <button className="button primary" onClick={onRetry}>Retry mistakes →</button>}</div>
    {missed.length > 0 && <ol className="study-mistakes">{missed.map((card, index) => <li key={`${card.id}-${index}`}><strong>{card.term}</strong><p><span>Correct answer</span>{card.definition}</p><StudyExplanation text={card.explanation} /></li>)}</ol>}
  </section>;
}
