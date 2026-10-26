import { checklistRoot, checklistSelector } from './checklistDocument.ts';
import { easternDateKey, enableHygieneSchedule, isHygieneRoutine, scheduledCheckState, taskDueLabel } from './checklistSchedule.ts';

export type ChecklistBadge = { kind: 'due' | 'done' | 'overdue' | 'idle'; label: string; detail: string };

/** Scheduled notes report today's work separately from missed earlier tasks. */
export function checklistStatusForBoxes(boxes: Element[], now = new Date()): ChecklistBadge[] {
  if (!boxes.length) return [];
  const today = easternDateKey(now);
  const tasks = boxes.map(box => ({
    checked: scheduledCheckState(box, now),
    due: taskDueLabel(box, now),
    title: box.parentElement?.querySelector('strong,b')?.textContent?.trim() || box.parentElement?.textContent?.trim() || 'Checklist task',
  }));
  const dated = tasks.filter(task => task.due);
  const detail = (items: typeof tasks) => items.slice(0, 3).map(item => item.title).join(' · ') + (items.length > 3 ? ` · +${items.length - 3} more` : '');
  if (!dated.length) {
    const remaining = tasks.filter(task => !task.checked);
    return [{ kind: remaining.length ? 'idle' : 'done', label: remaining.length ? `${remaining.length} task${remaining.length === 1 ? "" : "s"} left` : '✓ All done', detail: remaining.length ? detail(remaining) : 'Every checklist task is checked.' }];
  }
  const todaysTasks = dated.filter(task => task.due!.date === today);
  const dueToday = todaysTasks.filter(task => !task.checked);
  const overdue = dated.filter(task => task.due!.date < today && !task.checked);
  const badges: ChecklistBadge[] = dueToday.length
    ? [{ kind: 'due', label: `${dueToday.length} due today`, detail: detail(dueToday) }]
    : todaysTasks.length
      ? [{ kind: 'done', label: '✓ All done today', detail: `${todaysTasks.length} of ${todaysTasks.length} tasks scheduled for today are complete.` }]
      : [{ kind: 'idle', label: 'Nothing due today', detail: 'No tasks are scheduled for today.' }];
  if (overdue.length) badges.push({ kind: 'overdue', label: `${overdue.length} overdue`, detail: detail(overdue) });
  return badges;
}

export function noteChecklistStatus(html: string, title: string, now = new Date()): ChecklistBadge[] {
  if (!html.includes('notebook-todo')) return [];
  const autoEnable = isHygieneRoutine(html, title) && /Schedule: Eastern Time/i.test(html) && !html.includes('data-checklist-repeat');
  const root = checklistRoot(autoEnable ? enableHygieneSchedule(html, now) : html);
  return checklistStatusForBoxes([...root.querySelectorAll(checklistSelector)], now);
}
