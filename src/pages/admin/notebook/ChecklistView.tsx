import { changeWeightLossStart, validPlanDate, weightLossDates } from "./weightLossPlan";
import { calendarDate, displayDate, easternDateKey, enableHygieneSchedule, isHygieneRoutine, refreshChecklistSchedule, scheduledCheckState, scheduledDate, taskDueLabel, WEEKDAYS, weekStartKey } from './checklistSchedule';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { checklistRoot, checklistSelector, checklistTaskContent, checklistTitle, formatChecklistReference, readableHeading, setChecklistChecked } from './checklistDocument';
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
    return refreshChecklistSchedule(autoEnable ? enableHygieneSchedule(html, now) : html, now);
  }, [html, title, now]);
  useEffect(() => { if (scheduledHtml !== html) onChange(scheduledHtml); }, [scheduledHtml, html, onChange]);
  const root = useMemo(() => { const document = checklistRoot(scheduledHtml); formatChecklistReference(document); return document; }, [scheduledHtml]);
  const scheduled = Boolean(root.querySelector('ul[data-checklist-repeat]'));
  const canSchedule = !scheduled && isHygieneRoutine(html, title);
  const boxes = [...root.querySelectorAll(checklistSelector)];
  const lists = [...root.querySelectorAll('ul.notebook-todo')].filter(list => list.querySelector(':scope > li > input[type="checkbox"]'));
  const planStart = root.querySelector('[data-weightloss-plan]')?.getAttribute('data-weightloss-start');
  const [planWeek, setPlanWeek] = useState(0);
  const planDates = planStart && validPlanDate(planStart) ? weightLossDates(planStart) : [];
  const visibleLists = lists.filter(list => !list.closest('[data-weightloss-week]') || list.closest('[data-weightloss-week]')?.getAttribute('data-weightloss-week') === String(planWeek));
  const completed = boxes.filter(box => scheduledCheckState(box, now)).length;
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [undo, setUndo] = useState<{ before: string; after: string } | null>(null);
  const prefix = useId();
  const toggleSection = (index: number) => setCollapsed(current => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });
  const reset = (indices: number[]) => {
    const next = setChecklistChecked(scheduledHtml, indices, false, now);
    setUndo({ before: scheduledHtml, after: next });
    onChange(next);
  };
  // Render only document content. Scripts, copied event handlers, and editor UI are excluded.
  const renderChildren = (node: Node): ReactNode[] => [...node.childNodes].map((child, index) => renderNode(child, index));
  const renderNode = (node: Node, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element)) return null;
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH', 'TEMPLATE', 'INPUT', 'BUTTON'].includes(node.tagName)) return null;
    if (node.hasAttribute('data-weightloss-week') && node.getAttribute('data-weightloss-week') !== String(planWeek)) return null;
    if (lists.includes(node)) {
      const sectionIndex = lists.indexOf(node);
      const title = checklistTitle(node, root, sectionIndex);
      const sectionBoxes = [...node.querySelectorAll(':scope > li > input[type="checkbox"]')];
      const indices = sectionBoxes.map(box => boxes.indexOf(box));
      const done = sectionBoxes.filter(box => scheduledCheckState(box, now)).length;
      const isCollapsed = collapsed.has(sectionIndex);
      return <section key={key} id={`${prefix}-section-${sectionIndex}`} className={`checklist-card${done === sectionBoxes.length ? ' is-complete' : ''}`} aria-label={title}>
        <header className="checklist-card-header">
          <button type="button" className="checklist-disclosure" aria-expanded={!isCollapsed} aria-controls={`${prefix}-tasks-${sectionIndex}`} onClick={() => toggleSection(sectionIndex)}><span aria-hidden="true">{isCollapsed ? '›' : '⌄'}</span>{title}</button>
          <span className="checklist-count" aria-live="polite">{done}/{sectionBoxes.length} completed</span>
        </header>
        <progress max={sectionBoxes.length} value={done} aria-label={`${title} progress`} />
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
                <label className="checklist-task-label">
                  <input type="checkbox" checked={checked} onChange={event => { setUndo(null); onChange(setChecklistChecked(scheduledHtml, [index], event.target.checked, now)); }} />
                  <span>{taskTitle}</span>
                </label>
                {due && <div className={`checklist-due status-${due.status.toLowerCase().replace(' ', '-')}`}><span>{due.day}</span><time dateTime={due.date} aria-current={isToday ? 'date' : undefined}>{displayDate(due.date)}</time><strong>{isToday && checked ? 'Done · Today' : due.status}</strong></div>}
                {!compact && detail.textContent?.trim() && <div className="checklist-task-detail">{renderChildren(detail)}</div>}
              </li>;
            })}
          </ul>
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
    {planStart && <div className="weightloss-schedule-controls">
      <label>Start date<input type="date" value={planStart} min="1900-01-01" max="9998-12-31" onChange={event => { if (validPlanDate(event.target.value)) { setUndo(null); onChange(changeWeightLossStart(scheduledHtml, event.target.value)); } }} /></label>
      <label>Workout week<select value={planWeek} onChange={event => setPlanWeek(Number(event.target.value))}>{Array.from({ length: 52 }, (_, index) => <option key={index} value={index}>Week {index + 1} · {planDates[index * 3] ? displayDate(planDates[index * 3]) : ''}</option>)}</select></label>
      <div className="weightloss-week-buttons"><button disabled={planWeek === 0} onClick={() => setPlanWeek(week => week - 1)}>← Previous week</button><button disabled={planWeek === 51} onClick={() => setPlanWeek(week => week + 1)}>Next week →</button></div>
      <p>Changing the start date updates all 52 weeks. Workouts stay on Monday, Wednesday and Friday; your checkmarks stay saved.</p>
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
      <small>Daily reset at midnight · Weekly reset on Sunday</small>
    </div>}
    <div className="checklist-overview">
      <div><span className="checklist-eyebrow">YOUR CHECKLISTS</span><strong>{completed === boxes.length ? 'All done. Nicely done.' : 'One step at a time.'}</strong><span aria-live="polite">{completed} of {boxes.length} tasks complete</span></div>
      <button type="button" aria-pressed={compact} onClick={() => setCompact(value => !value)}>{compact ? 'Show details' : 'Hide details'}</button>
      <progress max={boxes.length || 1} value={completed} aria-label="Overall checklist progress" />
    </div>
    <nav className="checklist-jump" aria-label="Jump to checklist">{visibleLists.map((list) => <button key={lists.indexOf(list)} onClick={() => document.getElementById(`${prefix}-section-${lists.indexOf(list)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{checklistTitle(list, root, lists.indexOf(list))}</button>)}</nav>
    {undo && undo.after === html && <div className="checklist-undo" role="status">Checklist reset.<button onClick={() => { onChange(undo.before); setUndo(null); }}>Undo reset</button></div>}
    <div className="checklist-note-body">{!root.querySelector('h1') && title && <h1>{title}</h1>}{renderChildren(root)}</div>
  </article>;
}
