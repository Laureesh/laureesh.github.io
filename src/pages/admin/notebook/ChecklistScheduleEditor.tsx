import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WEEKDAYS, displayDate } from './checklistSchedule';
import { nextTaskDate, scheduleError, type TaskSchedule } from './customTaskSchedule';

type Props = { title: string; count: number; mixed: boolean; initial: TaskSchedule; today: string; onSave: (schedule: TaskSchedule) => void; onClose: () => void };
export default function ChecklistScheduleEditor({ title, count, mixed, initial, today, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const error = scheduleError(draft);
  const next = error ? null : nextTaskDate(draft, today);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="checklist-schedule-editor" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={`${id}-title`}>Edit schedule</h2><button type="button" onClick={onClose} aria-label="Close schedule editor">×</button></header>
    <p className="schedule-target">{title}</p>
    <p>{count === 1 ? 'Applies to this task.' : `Applies to all ${count} tasks in this section.`}{mixed && ' These tasks currently have different schedules.'}</p>
    <form onSubmit={event => { event.preventDefault(); if (!error) onSave(draft); }}>
      <label>Repeat<select value={draft.repeat} onChange={event => setDraft({ ...draft, repeat: event.target.value as TaskSchedule['repeat'], start: draft.start || (event.target.value === 'never' ? '' : today) })}><option value="never">Never (one time)</option><option value="daily">Every day</option><option value="weekdays">Selected weekdays</option></select></label>
      <label>{draft.repeat === 'never' ? 'Due date (optional)' : 'Starts'}<input type="date" min="1900-01-01" max="9998-12-31" value={draft.start} onChange={event => setDraft({ ...draft, start: event.target.value })} required={draft.repeat !== 'never'} /></label>
      {draft.repeat === 'weekdays' && <fieldset><legend>Repeat on</legend><div className="schedule-weekdays">{WEEKDAYS.map((day, index) => <button key={day} type="button" aria-label={day} aria-pressed={draft.days.includes(index)} onClick={() => setDraft({ ...draft, days: draft.days.includes(index) ? draft.days.filter(day => day !== index) : [...draft.days, index].sort() })}>{day.slice(0, 3)}</button>)}</div></fieldset>}
      {draft.repeat !== 'never' && <label>Ends (optional)<input type="date" min={draft.start || '1900-01-01'} max="9998-12-31" value={draft.end} onChange={event => setDraft({ ...draft, end: event.target.value })} /></label>}
      {error ? <p role="alert" className="schedule-error">{error}</p> : <p aria-live="polite">{next ? `Next due: ${displayDate(next)}` : draft.repeat === 'never' ? 'No due date.' : 'This repeating schedule has ended.'}</p>}
      <p className="schedule-help">Dates use Eastern Time. Repeating tasks reset on each scheduled day; missed repeat days do not carry over. Changing a due date resets that task’s checkmark. Keeping the same due date preserves it.</p>
      <footer><button type="button" onClick={() => setDraft({ repeat: 'never', start: '', end: '', days: [] })}>Clear schedule</button><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={Boolean(error)}>Save schedule</button></footer>
    </form>
  </dialog>, document.body);
}
