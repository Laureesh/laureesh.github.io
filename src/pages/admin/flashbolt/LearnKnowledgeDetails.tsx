import Modal from "./Modal";

export type KnowledgeLevel = "new" | "learning" | "familiar" | "mastered";
type Question = { id: string; prompt: string; level: KnowledgeLevel };
export default function LearnKnowledgeDetails({ level, questions, currentId, nextId, answered, onClose }: {
  level: KnowledgeLevel; questions: Question[]; currentId?: string; nextId?: string; answered: boolean; onClose: () => void;
}) {
  const current = questions.find(question => question.id === currentId);
  const next = questions.find(question => question.id === nextId);
  const filtered = questions.filter(question => question.level === level);
  return <Modal className="learn-knowledge-modal" labelledBy="knowledge-title" onClose={onClose}>
    <header><div><small>Knowledge overview</small><h2 id="knowledge-title">{level} <span>{filtered.length}</span></h2></div><button type="button" onClick={onClose} aria-label="Close knowledge overview">×</button></header>
    <div className="knowledge-position">
      <section><strong>Current question{answered ? " · Answered" : ""}</strong><p>{current?.prompt ?? "No current question"}</p></section>
      <section><strong>Next scheduled</strong><p>{next?.prompt ?? (answered ? "Session complete after this question" : "Answer this question to see what comes next")}</p></section>
    </div>
    {!answered && <p className="knowledge-hint">Your next question may change based on your answer.</p>}
    <p className="knowledge-hint">Questions in this level · original set order</p>
    <ol className="knowledge-question-list">
      {filtered.map(question => <li key={question.id} className={question.id === currentId ? "is-current" : ""} aria-current={question.id === currentId ? "true" : undefined}>
        <span className="knowledge-question-number">{questions.indexOf(question) + 1}</span>
        <div><p>{question.prompt}</p><div className="knowledge-question-tags">{question.id === currentId && <strong>Current question</strong>}{question.id === nextId && <strong>Up next</strong>}</div></div>
      </li>)}
    </ol>
    {!filtered.length && <p className="knowledge-empty">No questions in {level} yet. This list updates as you answer.</p>}
  </Modal>;
}
