import { useEffect, useRef, useState } from "react";
import { buildReviewQueue, type ReviewEntry, type ReviewProgress, type ReviewSet } from "./review-engine";
import StudySummary, { StudyExplanation } from "./StudySummary";

export default function ReviewToday({ sets, progress, onAnswer, onComplete }: {
  sets: ReviewSet[];
  progress: ReviewProgress;
  onAnswer: (setId: string, cardId: string, correct: boolean) => void;
  onComplete: () => void;
}) {
  const [clock, setClock] = useState(() => new Date());
  const [session, setSession] = useState<ReviewEntry[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [missed, setMissed] = useState<ReviewEntry[]>([]);
  const answering = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { heading.current?.focus(); }, [index, session]);
  const queue = buildReviewQueue(sets, progress, clock);
  const current = session?.[index];
  const complete = session !== null && !current;
  function start(entries: ReviewEntry[]) {
    setSession(entries);
    setIndex(0);
    setMissed([]);
    setRevealed(false);
    answering.current = false;
  }
  function answer(correct: boolean) {
    if (!current || !revealed || answering.current) return;
    answering.current = true;
    onAnswer(current.setId, current.card.id, correct);
    if (!correct) setMissed(items => [...items, current]);
    if (index === session!.length - 1) onComplete();
    setIndex(value => value + 1);
    setRevealed(false);
  }
  useEffect(() => { answering.current = false; }, [index]);
  return <section className="review-today">
    <div className="page-heading"><span className="eyebrow">A little practice, every day</span><h1 ref={heading} tabIndex={-1}>{complete ? "Review complete" : "Review today"}</h1><p>Recall the answer, reveal it, then rate how you did. Frequently missed questions come first.</p></div>
    {!session && <>
      <div className="review-stats">{["Frequently missed", "Due today", "New card"].map(label => <div key={label}><strong>{queue.filter(entry => entry.reason === label).length}</strong><span>{label === "New card" ? "New cards" : label}</span></div>)}</div>
      {queue.length ? <><div className="review-start"><div><h2>{queue.length} cards ready</h2><p>Correct answers space reviews 1, 2, 4 days apart, up to 30 days. Missed cards return sooner.</p></div><button className="button primary" onClick={() => start(queue)}>Start review →</button></div><div className="review-set-list">{sets.map(set => { const entries = queue.filter(entry => entry.setId === set.id); return entries.length ? <article key={set.id}><div><h3>{set.title}</h3><span>{entries.length} cards ready</span></div><button className="button quiet" onClick={() => start(entries)} aria-label={`Review ${set.title}`}>Review set →</button></article> : null; })}</div></> : <div className="empty-state"><h2>{sets.some(set => set.cards.length) ? "You're caught up" : "Your review starts here"}</h2><p>{sets.some(set => set.cards.length) ? "Come back when your next cards are due." : "Add questions to a set to start reviewing."}</p></div>}
    </>}
    {current && <div className="review-session"><div className="review-session-meta"><span>{index + 1} / {session!.length} · {current.setTitle}</span><button className="button quiet" onClick={() => setSession(null)}>Exit review</button></div><progress aria-label="Review progress" value={index} max={session!.length} /><article className="question-card"><span className="eyebrow">{current.reason}</span><h2>{current.card.term}</h2>{current.card.imageData && <img className="review-image" src={current.card.imageData} alt="Question study aid" />}{revealed ? <><div className="review-answer"><span className="eyebrow">Answer</span><p>{current.card.definition}</p></div><StudyExplanation text={current.card.explanation} /><div className="button-row"><button className="button quiet" onClick={() => answer(false)}>Missed it</button><button className="button primary" onClick={() => answer(true)}>Got it ✓</button></div></> : <button className="button primary" onClick={() => setRevealed(true)}>Reveal answer</button>}</article></div>}
    {complete && <><div className="review-stats"><div><strong>{session.length}</strong><span>Reviewed</span></div><div><strong>{session.length - missed.length}</strong><span>Recalled correctly</span></div><div><strong>{missed.length}</strong><span>Missed</span></div></div><StudySummary missed={missed.map(entry => entry.card)} onRetry={() => start(missed)} /><button className="button quiet" onClick={() => setSession(null)}>Back to today's review</button></>}
  </section>;
}
