export const ROUTINE_TIME_ZONE = 'America/New_York';
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayMs = 86_400_000;

/** Calendar arithmetic uses UTC dates after extracting the Eastern calendar day. */
export function easternDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: ROUTINE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function calendarDate(key: string): Date { return new Date(`${key}T12:00:00Z`); }
export function weekStartKey(now = new Date()): string {
  const date = calendarDate(easternDateKey(now));
  return new Date(date.getTime() - date.getUTCDay() * dayMs).toISOString().slice(0, 10);
}
export function scheduledDate(day: number, now = new Date()): string {
  return new Date(calendarDate(weekStartKey(now)).getTime() + day * dayMs).toISOString().slice(0, 10);
}
export function displayDate(key: string): string {
  const [year, month, day] = key.split('-');
  return `${month}/${day}/${year}`;
}
export function schedulePeriod(repeat: string | null, now = new Date()): string | null {
  return repeat === 'daily' ? easternDateKey(now) : repeat === 'weekly' ? weekStartKey(now) : null;
}
export function scheduledCheckState(box: Element, now = new Date()): boolean {
  const period = schedulePeriod(box.closest('ul')?.getAttribute('data-checklist-repeat') ?? null, now);
  return box.hasAttribute('checked') && (!period || box.getAttribute('data-checklist-period') === period);
}
export function stampScheduledCheck(box: Element, checked: boolean, now = new Date()): void {
  box.toggleAttribute('checked', checked);
  const period = schedulePeriod(box.closest('ul')?.getAttribute('data-checklist-repeat') ?? null, now);
  if (period && checked) box.setAttribute('data-checklist-period', period);
  else if (!checked) box.removeAttribute('data-checklist-period');
}

const weeklyAssignments: [RegExp, number][] = [
  [/bedsheets|pillowcases/i, 0], [/wash.*(?:condition|hair)|condition.*hair/i, 0],
  [/fingernails/i, 1], [/combs|brushes|hair tools|styling tools/i, 2],
  [/hats|durags|bonnets/i, 3], [/facial hair/i, 4], [/shoes/i, 5], [/supplies/i, 6],
];
export function hygieneWeekday(title: string): number | null {
  const explicit = WEEKDAYS.findIndex(day => new RegExp(`\\b${day}\\b`, 'i').test(title));
  if (explicit >= 0) return explicit;
  return weeklyAssignments.find(([pattern]) => pattern.test(title))?.[1] ?? null;
}
export function isHygieneRoutine(html: string, title = ''): boolean {
  return /daily hygiene routine/i.test(`${title} ${html}`) && /notebook-todo/.test(html);
}

/** Opt-in migration: preserve existing checks as completions for the current period. */
export function enableHygieneSchedule(html: string, now = new Date()): string {
  const root = document.createElement('div'); root.innerHTML = html;
  let heading = '';
  for (const node of root.querySelectorAll('h1,h2,h3,h4,ul.notebook-todo')) {
    if (/^H/.test(node.tagName)) { heading = node.textContent ?? ''; continue; }
    const repeat = /\bweekly\b/i.test(heading) ? 'weekly' : /\bmorning|\bnight(?:time)?\b/i.test(heading) ? 'daily' : null;
    if (!repeat) continue;
    const alreadyScheduled = node.hasAttribute('data-checklist-repeat');
    node.setAttribute('data-checklist-repeat', repeat);
    node.setAttribute('data-checklist-timezone', ROUTINE_TIME_ZONE);
    for (const box of node.querySelectorAll(':scope > li > input[type="checkbox"]')) {
      if (repeat === 'weekly') {
        const day = hygieneWeekday(box.parentElement?.textContent ?? '');
        if (day !== null) box.setAttribute('data-checklist-weekday', String(day));
      }
      if (!alreadyScheduled && box.hasAttribute('checked')) stampScheduledCheck(box, true, now);
    }
  }
  for (const paragraph of root.querySelectorAll('p')) {
    if (/^My reset day:\s*[_\\\s]+$/.test(paragraph.textContent ?? '')) paragraph.textContent = 'My reset day: Sunday. A new weekly checklist starts each Sunday.';
  }
  if (!/Schedule: Eastern Time/i.test(root.textContent ?? '')) {
    const info = document.createElement('p');
    info.textContent = 'Schedule: Eastern Time. Daily tasks reset at midnight; weekly tasks reset on Sunday.';
    const title = root.querySelector('h1');
    if (title) title.after(info); else root.prepend(info);
  }
  return root.innerHTML;
}

/** Keep old completion dates for context, but expire checked attributes in a new period. */
export function refreshChecklistSchedule(html: string, now = new Date()): string {
  if (!html.includes('data-checklist-repeat')) return html;
  const root = document.createElement('div'); root.innerHTML = html;
  let changed = false;
  for (const box of root.querySelectorAll('ul[data-checklist-repeat] > li > input[type="checkbox"][checked]')) {
    if (!scheduledCheckState(box, now)) { box.removeAttribute('checked'); changed = true; }
  }
  return changed ? root.innerHTML : html;
}

export function taskDueLabel(box: Element, now = new Date()): { date: string; day: string; status: string } | null {
  const fixedDate = box.getAttribute('data-checklist-date');
  if (fixedDate && /^\d{4}-\d{2}-\d{2}$/.test(fixedDate)) {
    const today = easternDateKey(now);
    return { date: fixedDate, day: WEEKDAYS[calendarDate(fixedDate).getUTCDay()], status: box.hasAttribute('checked') ? 'Done' : fixedDate === today ? 'Due today' : fixedDate < today ? 'Overdue' : 'Upcoming' };
  }
  const repeat = box.closest('ul')?.getAttribute('data-checklist-repeat');
  if (!repeat) return null;
  const today = easternDateKey(now);
  const weekday = box.getAttribute('data-checklist-weekday');
  if (repeat === 'weekly' && (weekday === null || !/^[0-6]$/.test(weekday))) return null;
  const date = repeat === 'daily' ? today : scheduledDate(Number(weekday), now);
  return { date, day: repeat === 'daily' ? 'Every day' : WEEKDAYS[Number(weekday)], status: scheduledCheckState(box, now) ? 'Done' : date === today ? 'Due today' : date < today ? 'Overdue' : 'Upcoming' };
}
