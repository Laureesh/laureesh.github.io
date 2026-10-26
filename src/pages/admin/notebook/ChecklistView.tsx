import { groupFitnessHistory } from './fitnessHistory';
import InlineChecklistText from './InlineChecklistText';
import { editableInlineBlocks, isEmptyInlineParagraph, removeEmptyInlineParagraphs, saveInlineBlock, saveInlineTask } from './inlineChecklistEditing';
import { numberText } from './fitnessCalculations';
import FitnessCalculators from './FitnessCalculators';
import { refreshFitnessDocument, shoppingTotal } from './fitnessDocument';
import ChecklistContentEditor from "./ChecklistContentEditor";
import { editableSectionTitle, readTaskContent, removeChecklistTask, saveChecklistContent, type ChecklistEdit } from "./checklistEditing";
import ChecklistScheduleEditor from "./ChecklistScheduleEditor";
import { editableTaskSchedule, TASK_SCHEDULE_ATTRIBUTE, type TaskSchedule } from "./customTaskSchedule";
import { changeWeightLossStart, validPlanDate, weightLossDates } from "./weightLossPlan";
import { calendarDate, displayDate, easternDateKey, enableHygieneSchedule, isHygieneRoutine, refreshChecklistSchedule, scheduledCheckState, scheduledDate, taskDueLabel, WEEKDAYS, weekStartKey } from './checklistSchedule';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { checklistRoot, checklistSelector, checklistTaskContent, checklistTitle, formatChecklistReference, readableHeading, setChecklistChecked, setTaskSchedules } from './checklistDocument';
import './ChecklistView.css';

type Props = { title?: string; html: string; fontSize: number; onChange: (html: string) => void };

export default function ChecklistView({ title, html, fontSize, onChange }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 30_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const today = easternDateKey(now);
  const scheduledHtml = useMemo(() => {
    const autoEnable = isHygieneRoutine(html, title) && /Schedule: Eastern Time/i.test(html) && !html.includes('data-checklist-repeat');
    return refreshFitnessDocument(refreshChecklistSchedule(autoEnable ? enableHygieneSchedule(html, now) : html, now));
  }, [html, title, now]);
  useEffect(() => { if (scheduledHtml !== html) onChange(scheduledHtml); }, [scheduledHtml, html, onChange]);
  const root = useMemo(() => { const document = checklistRoot(scheduledHtml); editableInlineBlocks(document).forEach((node, index) => node.setAttribute('data-inline-index', String(index))); formatChecklistReference(document); groupFitnessHistory(document); return document; }, [scheduledHtml]);
  const customSchedules = Boolean(root.querySelector('[data-task-schedule]'));
  const scheduled = customSchedules || Boolean(root.querySelector('ul[data-checklist-repeat]'));
  const canSchedule = !scheduled && isHygieneRoutine(html, title);
  const boxes = [...root.querySelectorAll(checklistSelector)];
  const lists = [...root.querySelectorAll('ul.notebook-todo')];
  const plan = root.querySelector('[data-weightloss-plan]');
  const planStart = plan?.getAttribute('data-weightloss-start');
  const planCount = Number(plan?.getAttribute('data-weightloss-count')) || 156;
  const weekCount = Math.ceil(planCount / 3);
  const [selectedPlanWeek, setPlanWeek] = useState(0);
  const planWeek = Math.min(selectedPlanWeek, weekCount - 1);
  const planDates = planStart && validPlanDate(planStart) ? weightLossDates(planStart, planCount, plan?.getAttribute('data-weightloss-align') === 'monday') : [];
  const visibleLists = lists.filter(list => !list.closest('[data-weightloss-week]') || list.closest('[data-weightloss-week]')?.getAttribute('data-weightloss-week') === String(planWeek));
  const completed = boxes.filter(box => scheduledCheckState(box, now)).length;
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [undo, setUndo] = useState<{ before: string; after: string; message: string } | null>(null);
  const prefix = useId();
  const [contentEdit, setContentEdit] = useState<ChecklistEdit | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<{ indices: number[]; title: string; initial: TaskSchedule; mixed: boolean } | null>(null);
  const openSchedule = (indices: number[], title: string) => {
    const schedules = indices.map(index => editableTaskSchedule(boxes[index], today));
    setScheduleTarget({ indices, title, initial: schedules[0], mixed: schedules.some(schedule => JSON.stringify(schedule) !== JSON.stringify(schedules[0])) });
  };
  const toggleSection = (index: number) => setCollapsed(current => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });
  const reset = (indices: number[]) => {
    const next = setChecklistChecked(scheduledHtml, indices, false, now);
    setUndo({ before: scheduledHtml, after: next, message: "Checklist reset." });
    onChange(next);
  };
  const saveInline = (next: string) => {
    if (next === scheduledHtml) return;
    onChange(refreshFitnessDocument(next));
  };
  const removeEmptyLines = (index?: number) => {
    const next = refreshFitnessDocument(removeEmptyInlineParagraphs(scheduledHtml, index));
    if (next === scheduledHtml) return;
    setUndo({ before: scheduledHtml, after: next, message: 'Empty lines removed.' });
    onChange(next);
  };
  const hasEmptyLines = editableInlineBlocks(root).some(isEmptyInlineParagraph);
  // Render only document content. Scripts, copied event handlers, and editor UI are excluded.
  const renderChildren = (node: Node): ReactNode[] => [...node.childNodes].map((child, index) => renderNode(child, index));
  const renderNode = (node: Node, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element)) return null;
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH', 'TEMPLATE', 'INPUT', 'BUTTON'].includes(node.tagName)) return null;
    if (node.hasAttribute('data-fitness-values')) return null;
    if (node.hasAttribute('data-weightloss-week') && node.getAttribute('data-weightloss-week') !== String(planWeek)) return null;
    if (node.hasAttribute('data-inline-index')) return <InlineChecklistText key={key} as={node.tagName.toLowerCase()} html={node.innerHTML} label={/^H/.test(node.tagName) ? 'Edit heading' : 'Edit note text'} onRemoveEmpty={node.tagName === 'P' ? () => removeEmptyLines(Number(node.getAttribute('data-inline-index'))) : undefined} onChange={edited => saveInline(saveInlineBlock(scheduledHtml, Number(node.getAttribute('data-inline-index')), edited))} />;
    if (lists.includes(node)) {
      const sectionIndex = lists.indexOf(node);
      const title = checklistTitle(node, root, sectionIndex);
      const sectionBoxes = [...node.querySelectorAll(':scope > li > input[type="checkbox"]')];
      const indices = sectionBoxes.map(box => boxes.indexOf(box));
      const done = sectionBoxes.filter(box => scheduledCheckState(box, now)).length;
      const isCollapsed = collapsed.has(sectionIndex);
      const purchases = shoppingTotal(node);
      return <section key={key} id={`${prefix}-section-${sectionIndex}`} className={`checklist-card${sectionBoxes.length > 0 && done === sectionBoxes.length ? ' is-complete' : ''}`} aria-label={title}>
        <header className="checklist-card-header">
          <button type="button" className="checklist-disclosure" aria-expanded={!isCollapsed} aria-controls={`${prefix}-tasks-${sectionIndex}`} onClick={() => toggleSection(sectionIndex)}><span aria-hidden="true">{isCollapsed ? '›' : '⌄'}</span>{title}</button>
          <button type="button" className="checklist-edit-schedule" disabled={!indices.length} aria-label={`Edit schedule for section ${title}`} onClick={() => openSchedule(indices, title)}>Edit schedule</button>
          <button type="button" className="checklist-edit-schedule" aria-label={`Edit section ${title}`} onClick={() => setContentEdit({ kind: 'section', index: sectionIndex, title: editableSectionTitle(node, root) })}>Edit section</button>
          <span className="checklist-count" aria-live="polite">{done}/{sectionBoxes.length} completed</span>
        </header>
        {sectionBoxes.some(box => box.hasAttribute(TASK_SCHEDULE_ATTRIBUTE)) && <p className="checklist-custom-schedule-note">Custom schedules · use the dates shown on each task.</p>}
        <progress max={sectionBoxes.length || 1} value={done} aria-label={`${title} progress`} />
        <div id={`${prefix}-tasks-${sectionIndex}`} hidden={isCollapsed}>
          <ul className="checklist-rows">
            {[...node.children].map((item, itemIndex) => {
              const box = item.querySelector(':scope > input[type="checkbox"]');
              if (!box) return <li key={itemIndex}>{renderChildren(item)}</li>;
              const index = boxes.indexOf(box);
              const { title: taskTitle, detail } = checklistTaskContent(item);
              const checked = scheduledCheckState(box, now);
              const due = taskDueLabel(box, now);
              const isToday = due?.date === today;
              return <li key={itemIndex} className={[checked && 'is-done', isToday && 'is-today'].filter(Boolean).join(' ')}>
                <div className="checklist-task-label">
                  <input type="checkbox" aria-label={`Mark ${taskTitle} complete`} disabled={due?.status === "Ended"} checked={checked} onChange={event => { setUndo(null); onChange(setChecklistChecked(scheduledHtml, [index], event.target.checked, now)); }} />
                  <InlineChecklistText as="span" html={(() => { const span = document.createElement('span'); span.textContent = taskTitle; return span.innerHTML; })()} label="Edit task name" onChange={edited => saveInline(saveInlineTask(scheduledHtml, index, 'title', edited))} />
                </div>
                {due && <div className={`checklist-due status-${due.status.toLowerCase().replace(' ', '-')}`}><span>{due.day}</span><time dateTime={due.date} aria-current={isToday ? 'date' : undefined}>{displayDate(due.date)}</time><strong>{isToday && checked ? 'Done · Today' : due.status}</strong></div>}
                <button type="button" className="checklist-edit-schedule task-schedule-button" aria-label={`Edit task ${taskTitle}`} onClick={() => setContentEdit({ kind: 'task', index, content: readTaskContent(item) })}>Edit task</button>
                <button type="button" className="checklist-edit-schedule task-schedule-button" aria-label={`Edit schedule for ${taskTitle}`} onClick={() => openSchedule([index], taskTitle)}>Edit schedule</button>
                {!compact && <InlineChecklistText className="checklist-task-detail" html={detail.innerHTML} label="Edit task details" onChange={edited => saveInline(saveInlineTask(scheduledHtml, index, 'detail', edited))} />}
              </li>;
            })}
          </ul>
          {purchases.count > 0 && <p className="checklist-custom-schedule-note" aria-live="polite">Shopping subtotal: ${numberText(purchases.total)} · {purchases.count} calculated items (before tax)</p>}
          {!sectionBoxes.length && <p className="checklist-custom-schedule-note">No tasks yet. Add your first task below.</p>}
          <button type="button" className="checklist-add-task" onClick={() => setContentEdit({ kind: 'add-task', index: sectionIndex })}>＋ Add task</button>
          <button type="button" className="checklist-reset" disabled={!done} onClick={() => reset(indices)}>↺ Reset {title.toLowerCase()}</button>
        </div>
      </section>;
    }
    const children = renderChildren(node);
    switch (node.tagName) {
      case 'H1': return <h1 key={key}>{readableHeading(node.textContent ?? '')}</h1>;
      case 'H2': return <h2 key={key}>{readableHeading(node.textContent ?? '')}</h2>;
      case 'H3': return <h3 key={key}>{readableHeading(node.textContent ?? '')}</h3>;
      case 'H4': case 'H5': case 'H6': return <h4 key={key}>{children}</h4>;
      case 'DETAILS': return <details key={key} className={node.hasAttribute('data-fitness-history') ? 'checklist-history' : undefined}>{children}</details>;
      case 'SUMMARY': return <summary key={key}>{children}</summary>;
      case 'SPAN': return <span key={key}>{children}</span>;
      case 'P': return <p key={key}>{children}</p>;
      case 'BR': return <br key={key} />;
      case 'HR': return <hr key={key} />;
      case 'STRONG': case 'B': return <strong key={key}>{children}</strong>;
      case 'EM': case 'I': return <em key={key}>{children}</em>;
      case 'U': return <u key={key}>{children}</u>;
      case 'S': case 'DEL': return <s key={key}>{children}</s>;
      case 'UL': return <ul key={key}>{children}</ul>;
      case 'OL': return <ol key={key} start={Number(node.getAttribute('start')) || 1}>{children}</ol>;
      case 'LI': return <li key={key}>{children}</li>;
      case 'TABLE': return <div key={key} className="checklist-table-scroll"><table>{children}</table></div>;
      case 'THEAD': return <thead key={key}>{children}</thead>;
      case 'TBODY': return <tbody key={key}>{children}</tbody>;
      case 'TR': return <tr key={key}>{children}</tr>;
      case 'TH': return <th key={key}>{children}</th>;
      case 'TD': return <td key={key}>{children}</td>;
      case 'BLOCKQUOTE': return <blockquote key={key}>{children}</blockquote>;
      case 'PRE': return <pre key={key}>{children}</pre>;
      case 'CODE': return <code key={key}>{children}</code>;
      case 'A': {
        const href = node.getAttribute('href') ?? '';
        return /^(https?:|mailto:|#|\/)/i.test(href) ? <a key={key} href={href}>{children}</a> : <span key={key}>{children}</span>;
      }
      case 'IMG': {
        const src = node.getAttribute('src') ?? '';
        return /^(https?:|data:image\/|\/)/i.test(src) ? <img key={key} src={src} alt={node.getAttribute('alt') ?? ''} /> : null;
      }
      default: return <div key={key}>{children}</div>;
    }
  };
  return <article className={`checklist-document${compact ? ' is-compact' : ''}`} style={{ fontSize }}>
    {contentEdit && <ChecklistContentEditor fitness={Boolean(plan || root.querySelector('[data-fitness-values]'))} edit={contentEdit} onClose={() => setContentEdit(null)} onSave={content => {
      const next = refreshFitnessDocument(saveChecklistContent(scheduledHtml, contentEdit, content));
      setUndo({ before: scheduledHtml, after: next, message: "Checklist updated." });
      onChange(next);
      setContentEdit(null);
    }} onDelete={() => {
      if (contentEdit.kind !== 'task') return;
      const next = removeChecklistTask(scheduledHtml, contentEdit.index);
      setUndo({ before: scheduledHtml, after: next, message: "Task deleted." });
      onChange(next);
      setContentEdit(null);
    }} />}
    {scheduleTarget && <ChecklistScheduleEditor title={scheduleTarget.title} count={scheduleTarget.indices.length} mixed={scheduleTarget.mixed} initial={scheduleTarget.initial} today={today} onClose={() => setScheduleTarget(null)} onSave={schedule => {
      setUndo(null);
      onChange(setTaskSchedules(scheduledHtml, scheduleTarget.indices, schedule, now));
      setScheduleTarget(null);
    }} />}
    {(plan || root.querySelector('[data-fitness-values]')) && <FitnessCalculators html={scheduledHtml} onChange={next => { setUndo({ before: scheduledHtml, after: next, message: 'Linked values updated.' }); onChange(next); }} />}
    {!plan && !root.querySelector('[data-fitness-values]') && <button type="button" className="checklist-add-section" onClick={() => onChange(refreshFitnessDocument(scheduledHtml, {}))}>＋ Add linked value calculators</button>}
    {planStart && <div className="weightloss-schedule-controls">
      <label>Start date<input type="date" value={planStart} min="1900-01-01" max="9998-12-31" onChange={event => { if (validPlanDate(event.target.value)) { setUndo(null); onChange(changeWeightLossStart(scheduledHtml, event.target.value)); } }} /></label>
      <label>Workout week<select value={planWeek} onChange={event => setPlanWeek(Number(event.target.value))}>{Array.from({ length: weekCount }, (_, index) => <option key={index} value={index}>Week {index + 1} · {planDates[index * 3] ? displayDate(planDates[index * 3]) : ''}</option>)}</select></label>
      <div className="weightloss-week-buttons"><button disabled={planWeek === 0} onClick={() => setPlanWeek(planWeek - 1)}>← Previous week</button><button disabled={planWeek === weekCount - 1} onClick={() => setPlanWeek(planWeek + 1)}>Next week →</button></div>
      <p>Changing the start date updates all {weekCount} weeks. {plan?.getAttribute('data-weightloss-align') === 'monday' ? 'Session 1 starts on the first Monday on or after your start date.' : 'Workouts stay on Monday, Wednesday and Friday.'} Your checkmarks stay saved. Custom task schedules stay unchanged.</p>
    </div>}
    {canSchedule && <div className="checklist-schedule-setup"><div><strong>Give your routine a schedule</strong><p>Daily morning and night tasks, plus a Sunday–Saturday plan for weekly chores.</p></div><button onClick={() => onChange(enableHygieneSchedule(html, now))}>Add recurring schedule</button></div>}
    {scheduled && !planStart && <div className="checklist-calendar" aria-live="polite">
      <div className="checklist-today-heading"><span className="checklist-today-badge">Today</span><strong>{WEEKDAYS[calendarDate(today).getUTCDay()]}, {displayDate(today)}</strong></div>
      <span>Eastern Time · Week of {displayDate(weekStartKey(now))}</span>
      <div className="checklist-week" role="group" aria-label="This week in Eastern Time">
        {WEEKDAYS.map((day, index) => {
          const date = scheduledDate(index, now);
          const isToday = date === today;
          return <time key={day} dateTime={date} aria-current={isToday ? 'date' : undefined} aria-label={`${day}, ${displayDate(date)}${isToday ? ', today' : ''}`}>
            <span>{day.slice(0, 3)}</span><strong>{calendarDate(date).getUTCDate()}</strong><small>{isToday ? 'Today' : '\u00a0'}</small>
          </time>;
        })}
      </div>
      <small>{customSchedules ? "Custom schedules use each task’s selected days · Eastern Time" : "Daily reset at midnight · Weekly reset on Sunday"}</small>
    </div>}
    <div className="checklist-overview">
      <div><span className="checklist-eyebrow">YOUR CHECKLISTS</span><strong>{boxes.length > 0 && completed === boxes.length ? 'All done. Nicely done.' : 'One step at a time.'}</strong><span aria-live="polite">{completed} of {boxes.length} tasks complete</span></div>
      <button type="button" aria-pressed={compact} onClick={() => setCompact(value => !value)}>{compact ? 'Show details' : 'Hide details'}</button>
      <progress max={boxes.length || 1} value={completed} aria-label="Overall checklist progress" />
    </div>
    <nav className="checklist-jump" aria-label="Jump to checklist">{visibleLists.map((list) => <button key={lists.indexOf(list)} onClick={() => document.getElementById(`${prefix}-section-${lists.indexOf(list)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{checklistTitle(list, root, lists.indexOf(list))}</button>)}</nav>
    <button type="button" className="checklist-add-section" onClick={() => setContentEdit({ kind: 'add-section' })}>＋ Add section</button>
    {hasEmptyLines && <button type="button" onClick={() => removeEmptyLines()}>Remove empty lines</button>}
    {undo && undo.after === html && <div className="checklist-undo" role="status">{undo.message}<button onClick={() => { onChange(undo.before); setUndo(null); }}>{undo.message === "Checklist reset." ? "Undo reset" : "Undo"}</button></div>}
    <p className="checklist-inline-hint">Click any heading, paragraph, task name, or detail to edit it here. Text saves automatically. Press Backspace on an empty paragraph to remove it. Use schedule and calculator controls for linked dates and values.</p>
    <div className="checklist-note-body">{!root.querySelector('h1') && title && <h1>{title}</h1>}{renderChildren(root)}</div>
  </article>;
}
