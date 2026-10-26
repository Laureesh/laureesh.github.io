import { checklistRoot, checklistSelector, checklistTaskContent } from './checklistDocument.ts';
import { TASK_SCHEDULE_ATTRIBUTE } from './customTaskSchedule.ts';

export type TaskLink = { label: string; url: string };
export type TaskContent = { title: string; details: string; links: TaskLink[] };
export type ChecklistEdit = { kind: 'task'; index: number; content: TaskContent } | { kind: 'add-task'; index: number } | { kind: 'section'; index: number; title: string } | { kind: 'add-section' };
export const emptyTaskContent = (): TaskContent => ({ title: '', details: '', links: [] });
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export function taskContentError(content: TaskContent): string {
  if (!content.title.trim()) return 'Enter a task name.';
  if (content.links.some(link => !link.label.trim() || !/^(https?:\/\/\S+|mailto:\S+|\/\S*|#\S+)$/i.test(link.url.trim()))) return 'Give each link a name and a valid https://, http://, mailto:, / or # URL.';
  return '';
}
export function taskDetailsHtml(content: TaskContent): string {
  const text = content.details.split('\n').map(escape).join('<br>');
  return text + content.links.map((link, index) => `${text || index ? '<br>' : ''}<a href="${escape(link.url.trim())}">${escape(link.label.trim())}</a>`).join('');
}
export function readTaskContent(item: Element): TaskContent {
  const { title, detail } = checklistTaskContent(item);
  const links = [...detail.querySelectorAll('a')].map(anchor => ({ label: anchor.textContent ?? '', url: anchor.getAttribute('href') ?? '' }));
  detail.querySelectorAll('a').forEach(anchor => anchor.remove());
  detail.querySelectorAll('br').forEach(br => br.replaceWith(document.createTextNode('\n')));
  detail.querySelectorAll('p,div,li,blockquote,pre').forEach(node => node.append(document.createTextNode('\n')));
  return { title, details: (detail.textContent ?? '').trim(), links };
}
function lists(root: Element): Element[] { return [...root.querySelectorAll('ul.notebook-todo')]; }
export function sectionHeading(list: Element, root: Element): Element | null {
  let heading: Element | null = null;
  for (const node of root.querySelectorAll('h1,h2,h3,h4,ul.notebook-todo')) {
    if (node === list) return heading;
    // Don't rename a heading that is shared with a preceding list.
    heading = node.matches('ul') ? null : node;
  }
  return null;
}
export function editableSectionTitle(list: Element, root: Element): string {
  const custom = list.getAttribute('data-checklist-title');
  if (custom) return custom;
  const heading = sectionHeading(list, root)?.cloneNode(true) as Element | undefined;
  heading?.querySelectorAll('[data-weightloss-date]').forEach(node => node.remove());
  return (heading?.textContent ?? 'Checklist').replace(/[\s·–—-]+$/, '').trim();
}
export function saveChecklistContent(html: string, edit: ChecklistEdit, content: TaskContent): string {
  const root = checklistRoot(html);
  if (edit.kind === 'section' || edit.kind === 'add-section') {
    if (!content.title.trim()) throw new Error('Enter a section name.');
    if (edit.kind === 'add-section') {
      const heading = document.createElement('h2'); heading.textContent = content.title.trim();
      const list = document.createElement('ul'); list.className = 'notebook-todo'; list.setAttribute('data-checklist-title', content.title.trim());
      root.append(heading, list);
    } else {
      const list = lists(root)[edit.index];
      if (!list) throw new Error('This section no longer exists.');
      let heading = sectionHeading(list, root);
      if (!heading || heading.tagName === 'H1') { heading = document.createElement('h2'); list.before(heading); }
      const dates = [...heading.querySelectorAll('[data-weightloss-date]')];
      heading.textContent = content.title.trim();
      if (dates.length) {
        heading.append(document.createTextNode(' · '));
        dates.forEach((date, index) => { if (index) heading!.append(document.createTextNode(' – ')); heading!.append(date); });
      }
      list.setAttribute('data-checklist-title', content.title.trim());
    }
  } else {
    const error = taskContentError(content);
    if (error) throw new Error(error);
    if (edit.kind === 'add-task') {
      const list = lists(root)[edit.index];
      if (!list) throw new Error('This section no longer exists.');
      const item = document.createElement('li');
      const box = document.createElement('input'); box.type = 'checkbox';
      // Use a shared custom schedule when the whole section agrees; never guess from mixed dates.
      const schedules = [...list.querySelectorAll(':scope > li > input[type="checkbox"]')].map(input => input.getAttribute(TASK_SCHEDULE_ATTRIBUTE));
      if (schedules.length && schedules[0] && schedules.every(value => value === schedules[0])) box.setAttribute(TASK_SCHEDULE_ATTRIBUTE, schedules[0]);
      const title = document.createElement('strong'); title.textContent = content.title.trim();
      item.append(box, title);
      if (content.details || content.links.length) { item.append(document.createElement('br')); const detail = document.createElement('div'); detail.innerHTML = taskDetailsHtml(content); item.append(detail); }
      list.append(item);
    } else {
      const box = root.querySelectorAll(checklistSelector)[edit.index];
      const item = box?.parentElement;
      if (!item) throw new Error('This task no longer exists.');
      const original = readTaskContent(item);
      const detail = checklistTaskContent(item).detail;
      // Preserve rich formatting and links for title-only edits.
      const unchangedDetails = original.details === content.details && JSON.stringify(original.links) === JSON.stringify(content.links);
      const images = [...detail.querySelectorAll('img')].map(image => image.outerHTML).join('');
      const detailsHtml = unchangedDetails ? detail.innerHTML : taskDetailsHtml(content) + images;
      const title = document.createElement('strong'); title.textContent = content.title.trim();
      item.replaceChildren(box, title);
      if (detailsHtml) { item.append(document.createElement('br')); const updated = document.createElement('div'); updated.innerHTML = detailsHtml; item.append(updated); }
    }
  }
  return root.innerHTML;
}
export function removeChecklistTask(html: string, index: number): string {
  const root = checklistRoot(html);
  root.querySelectorAll(checklistSelector)[index]?.parentElement?.remove();
  return root.innerHTML;
}
