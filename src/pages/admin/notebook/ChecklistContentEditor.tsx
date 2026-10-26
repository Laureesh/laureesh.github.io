import { calculationText, fitnessLabels, type FitnessKey } from './fitnessCalculations';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { emptyTaskContent, taskContentError, type ChecklistEdit, type TaskContent } from './checklistEditing';

type Props = { fitness?: boolean; edit: ChecklistEdit; onSave: (content: TaskContent) => void; onDelete: () => void; onClose: () => void };
export default function ChecklistContentEditor({ fitness, edit, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<TaskContent>(() => edit.kind === 'task' ? edit.content : edit.kind === 'section' ? { ...emptyTaskContent(), title: edit.title } : emptyTaskContent());
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const section = edit.kind === 'section' || edit.kind === 'add-section';
  const adding = edit.kind === 'add-task' || edit.kind === 'add-section';
  const error = section ? (!draft.title.trim() ? 'Enter a section name.' : '') : taskContentError(draft);
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current!; dialog.showModal();
    return () => { dialog.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="checklist-schedule-editor checklist-content-editor" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={id}>{adding ? 'Add' : 'Edit'} {section ? 'section' : 'task'}</h2><button type="button" aria-label="Close checklist editor" onClick={onClose}>×</button></header>
    <form onSubmit={event => { event.preventDefault(); if (!error) onSave(draft); }}>
      <label>{section ? 'Section name' : 'Task name'}<input autoFocus value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} required /></label>
      {!section && <>
        <label>Details<textarea rows={6} value={draft.details} onChange={event => setDraft({ ...draft, details: event.target.value })} placeholder="Instructions, meals, reps, or notes…" /></label>
        {fitness && <fieldset><legend>Linked values</legend><p>Choose values from My values & calculators. These stay up to date automatically; numbers typed in your task text stay as written.</p><div className="fitness-link-options">{(Object.keys(fitnessLabels) as FitnessKey[]).map(key => <label key={key}><input type="checkbox" checked={draft.linkedValues?.includes(key) ?? false} onChange={event => setDraft({ ...draft, linkedValues: event.target.checked ? [...(draft.linkedValues ?? []), key] : draft.linkedValues?.filter(value => value !== key) })} />{fitnessLabels[key]}</label>)}</div></fieldset>}
        <fieldset><legend>Task calculator</legend><label>Calculation<select value={draft.calculation?.kind ?? ''} onChange={event => setDraft({ ...draft, calculation: event.target.value ? { kind: event.target.value as 'shopping' | 'workout', a: 1, b: 0, unit: 'reps' } : undefined })}><option value="">None</option><option value="shopping">Shopping: quantity × price</option><option value="workout">Workout: sets/rounds × amount per set</option></select></label>
          {draft.calculation && <><div className="fitness-fields">{(['a', 'b'] as const).map(key => <label key={key}>{draft.calculation!.kind === 'shopping' ? key === 'a' ? 'Quantity' : 'Price each ($)' : key === 'a' ? 'Sets / rounds' : 'Amount per set'}<input type="number" min="0" max="10000000" step="any" required value={Number.isFinite(draft.calculation![key]) ? draft.calculation![key] : ''} onChange={event => setDraft({ ...draft, calculation: { ...draft.calculation!, [key]: event.target.value === '' ? NaN : Number(event.target.value) } })} /></label>)}{draft.calculation.kind === 'workout' && <label>Unit<input maxLength={40} value={draft.calculation.unit} onChange={event => setDraft({ ...draft, calculation: { ...draft.calculation!, unit: event.target.value } })} placeholder="reps, seconds, reps per leg…" /></label>}</div><output aria-live="polite">{calculationText(draft.calculation)}</output><p>Saved below your task. Edit these inputs to update the total. Original instructions remain as written.</p></>}
        </fieldset>
        <fieldset><legend>Links</legend>{draft.links.map((link, index) => <div className="checklist-link-fields" key={index}>
          <label>Link name<input value={link.label} onChange={event => setDraft({ ...draft, links: draft.links.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} /></label>
          <label>URL<input value={link.url} onChange={event => setDraft({ ...draft, links: draft.links.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) })} /></label>
          <button type="button" onClick={() => setDraft({ ...draft, links: draft.links.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Remove link ${index + 1}`}>Remove link</button>
        </div>)}<button type="button" onClick={() => setDraft({ ...draft, links: [...draft.links, { label: '', url: '' }] })}>＋ Add link</button></fieldset>
      </>}
      {error && <p className="schedule-error" role="status">{error}</p>}
      {edit.kind === 'task' && <p className="schedule-help">Your checkmark and schedule stay unchanged when you edit the text.</p>}
      <footer>{edit.kind === 'task' && <button className="delete-checklist-task" type="button" onClick={onDelete}>Delete task</button>}<button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={Boolean(error)}>Save {section ? 'section' : 'task'}</button></footer>
    </form>
  </dialog>, document.body);
}
