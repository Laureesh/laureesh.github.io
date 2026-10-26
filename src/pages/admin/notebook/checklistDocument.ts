import { scheduleError, TASK_SCHEDULE_ATTRIBUTE, type TaskSchedule } from './customTaskSchedule.ts';
import { scheduledCheckState, taskDueLabel, stampScheduledCheck } from './checklistSchedule.ts';
/** Checklist state lives in the note HTML; presentation controls never do. */
export const checklistSelector = 'ul.notebook-todo > li > input[type="checkbox"]';

export function checklistRoot(html: string): HTMLDivElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

export function setChecklistChecked(html: string, indices: number[], checked: boolean, now = new Date()): string {
  const root = checklistRoot(html);
  const targets = new Set(indices);
  root.querySelectorAll(checklistSelector).forEach((box, index) => {
    if (targets.has(index)) stampScheduledCheck(box, checked, now);
  });
  return root.innerHTML;
}

export function checklistTitle(list: Element, root: Element, index: number): string {
  let heading = '';
  for (const node of root.querySelectorAll('h1,h2,h3,h4,ul.notebook-todo')) {
    if (node === list) break;
    if (/^H/.test(node.tagName)) heading = node.textContent?.trim() ?? '';
  }
  const routine = heading.match(/\b(morning|nighttime|night|weekly)\b/i)?.[1].toLowerCase();
  if (routine) return `${routine === 'night' ? 'Night' : routine[0].toUpperCase() + routine.slice(1)} checklist`;
  return heading ? readableHeading(heading) : `Checklist ${index + 1}`;
}

export function readableHeading(text: string): string {
  if (text !== text.toLocaleUpperCase()) return text;
  return text.toLocaleLowerCase().replace(/\p{L}/u, letter => letter.toLocaleUpperCase());
}

export function checklistTaskContent(item: Element): { title: string; detail: HTMLElement } {
  const detail = document.createElement('div');
  detail.innerHTML = item.innerHTML;
  detail.querySelectorAll('input[type="checkbox"]').forEach(input => input.remove());
  const walker = document.createTreeWalker(detail, NodeFilter.SHOW_TEXT);
  let first = walker.nextNode();
  while (first && !first.textContent?.trim()) first = walker.nextNode();
  const bold = first?.parentElement?.closest('strong,b');
  const title = (bold?.textContent ?? first?.textContent ?? 'Task').trim();
  if (bold) bold.remove();
  else first?.parentNode?.removeChild(first);
  // Remove the line break left by the title, including the common <p><strong>…</strong><br> wrapper.
  const container = detail.firstElementChild?.tagName === 'P' ? detail.firstElementChild : detail;
  while (container.firstChild && (!container.firstChild.textContent?.trim() && (container.firstChild.nodeType === Node.TEXT_NODE || (container.firstChild as Element).tagName === 'BR'))) container.firstChild.remove();
  return { title, detail };
}

/** Present a pasted product shelf as a compact table without changing the saved note. */
export function formatChecklistReference(root: HTMLElement): void {
  const heading = [...root.querySelectorAll('h2,h3')].find(node => /bathroom shelf|essential product/i.test(node.textContent ?? ''));
  if (!heading) return;
  const groups: { title: string; content: Element[] }[] = [];
  const consumed: Element[] = [];
  let next = heading.nextElementSibling;
  while (next) {
    if (/^H[2-4]$/.test(next.tagName)) {
      const title = next.textContent?.trim() ?? '';
      if (!/^(teeth|face|body|lips|hair|other|underarms|cleaning|fragrance)$/i.test(title)) break;
      groups.push({ title: readableHeading(title), content: [] });
    } else if (next.tagName === 'P' && groups.length) groups[groups.length - 1].content.push(next);
    else break;
    consumed.push(next);
    next = next.nextElementSibling;
  }
  if (groups.length < 2 || groups.some(group => !group.content.length)) return;
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Area</th><th>Products</th></tr></thead><tbody></tbody>';
  for (const group of groups) {
    const row = document.createElement('tr');
    const area = document.createElement('td'); area.textContent = group.title;
    const products = document.createElement('td');
    for (const paragraph of group.content) products.append(paragraph.cloneNode(true));
    row.append(area, products); table.lastElementChild!.append(row);
  }
  heading.after(table);
  consumed.forEach(node => node.remove());
}

/** Save overrides in task HTML, leaving unrelated content and the original plan intact. */
export function setTaskSchedules(html: string, indices: number[], schedule: TaskSchedule, now = new Date()): string {
  const error = scheduleError(schedule);
  if (error) throw new Error(error);
  const root = checklistRoot(html);
  const targets = new Set(indices);
  root.querySelectorAll(checklistSelector).forEach((box, index) => {
    if (!targets.has(index)) return;
    setBoxTaskSchedule(box, schedule, now);
  });
  return root.innerHTML;
}

export function setBoxTaskSchedule(box: Element, schedule: TaskSchedule, now = new Date()): void {
  const error = scheduleError(schedule);
  if (error) throw new Error(error);
  const checked = scheduledCheckState(box, now);
  const previousDate = taskDueLabel(box, now)?.date;
  box.setAttribute(TASK_SCHEDULE_ATTRIBUTE, JSON.stringify(schedule));
  const nextDate = taskDueLabel(box, now)?.date;
  stampScheduledCheck(box, checked && (previousDate === nextDate || schedule.repeat === 'never' && !schedule.start), now);
}
