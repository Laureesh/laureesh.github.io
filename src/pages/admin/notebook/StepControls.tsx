import type { StepChange } from "./stepLayout";

type Props = {
  steps: { title: string; completed: boolean }[];
  onChange: (change: StepChange) => void;
  onEdit: (index: number) => void;
  onUndo: () => void;
  canUndo: boolean;
};

export default function StepControls({ steps, onChange, onEdit, onUndo, canUndo }: Props) {
  const completed = steps.filter(step => step.completed).length;
  return <section className="notebook-step-controls" aria-label="Step controls">
    <header><div><strong>Steps</strong><span aria-live="polite">{completed} of {steps.length} complete</span></div><button onClick={() => onChange({ type: "add", index: steps.length })}>＋ Add step</button></header>
    <progress value={completed} max={Math.max(1, steps.length)} aria-label="Step completion" />
    <p>Edit titles below, or select Edit content to jump to a step’s instructions. Changes save automatically.</p>
    <details open><summary>Manage steps</summary>
      {steps.map((step, index) => <div className="notebook-step-control-row" key={index}>
        <label className="step-complete-toggle"><input type="checkbox" checked={step.completed} onChange={() => onChange({ type: "complete", index })} aria-label={`Mark step ${index + 1} complete`} /><span>{index + 1}</span></label>
        <input key={step.title} className="step-title-input" aria-label={`Step ${index + 1} title`} defaultValue={step.title} maxLength={180} onBlur={event => { if (event.target.value !== step.title) onChange({ type: "title", index, title: event.target.value }); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
        <div className="step-row-actions">
          <button onClick={() => onEdit(index)}>Edit content</button>
          <button disabled={index === 0} onClick={() => onChange({ type: "up", index })} aria-label={`Move step ${index + 1} up`}>↑</button>
          <button disabled={index === steps.length - 1} onClick={() => onChange({ type: "down", index })} aria-label={`Move step ${index + 1} down`}>↓</button>
          <button onClick={() => onChange({ type: "duplicate", index })} aria-label={`Duplicate step ${index + 1}`}>Duplicate</button>
          <button onClick={() => onChange({ type: "add", index: index + 1 })} aria-label={`Add step after step ${index + 1}`}>＋ After</button>
          <button className="danger" onClick={() => onChange({ type: "remove", index })} aria-label={`Delete step ${index + 1}`}>Delete</button>
        </div>
      </div>)}
      {!steps.length && <p>No steps yet. Use Add step to start again.</p>}
    </details>
    <button disabled={!canUndo} onClick={onUndo}>Undo last step change</button>
  </section>;
}
