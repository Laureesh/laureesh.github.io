import { useEffect, useRef } from "react";
import { learnRoundSummary } from "./learnRoundSummary";
import UiIcon from "./UiIcon";

type Props = { round: number; size: number; index: number; answered: boolean; retries: number; pending: number };

export default function LearnRoundPanel({ round, size, index, answered, retries, pending }: Props) {
  const summary = learnRoundSummary(round, size, index, answered, retries, pending);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const current = list.current?.querySelector<HTMLElement>('[aria-current="step"]');
    if (current && list.current) list.current.scrollTop = current.offsetTop - list.current.offsetTop;
  }, [round]);

  return (
    <aside className="learn-rounds-panel" aria-label="Session rounds">
      <div className="learn-panel-heading"><UiIcon symbol="◴" /><h2>Your rounds</h2></div>
      <div className="learn-round-focus">
        <div className="learn-round-focus-title"><span>Round {round}</span><small>In progress</small></div>
        <p className="learn-round-remaining" aria-live="polite" aria-atomic="true"><strong>{summary.remaining}</strong><span>left in this round</span></p>
        <progress value={summary.completed} max={Math.max(1, size)} aria-label="Current pass progress" />
        <div className="learn-round-pass"><span>{summary.completed} of {size} answered this pass</span><b>{summary.percent}%</b></div>
        {retries > 0 && <p className="learn-round-retries">{retries} {retries === 1 ? "retry" : "retries"} included</p>}
      </div>
      <div className="learn-round-list-heading"><span>Round overview</span><span>{summary.scheduledRounds} scheduled</span></div>
      <ol ref={list} className="learn-round-list" tabIndex={0} aria-label="Scheduled rounds">
        {Array.from({ length: summary.scheduledRounds }, (_, index) => {
          const number = index + 1;
          const state = number < round ? "complete" : number === round ? "current" : "upcoming";
          return <li key={number} className={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="learn-round-step">{state === "complete" ? <UiIcon symbol="✓" /> : number}</span>
            <span><strong>Round {number}</strong><small>{state === "complete" ? "Completed" : state === "current" ? "You are here" : "Up next"}</small></span>
            {state === "current" && <i aria-hidden="true" />}
          </li>;
        })}
      </ol>
      <p className="learn-rounds-note">Rounds adapt as you learn. More may be added.</p>
    </aside>
  );
}
