import { stampScheduledCheck } from './checklistSchedule.ts';
function addCheckbox(item: HTMLLIElement) {
  if (item.querySelector(':scope > input[type="checkbox"]')) return;
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.contentEditable = 'false';
  checkbox.setAttribute('aria-label', 'Mark task complete');
  item.prepend(checkbox);
}

/** Turn the current paragraph or selected lines into an editable checklist. */
export function insertTodoList(editor: HTMLElement) {
  editor.focus();
  const selection = window.getSelection();
  if (!selection?.anchorNode || !editor.contains(selection.anchorNode)) return;
  const element = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode.parentElement;
  let list = element?.closest('ul');
  if (!list || !editor.contains(list)) {
    document.execCommand('insertUnorderedList');
    const anchor = selection.anchorNode;
    list = (anchor instanceof Element ? anchor : anchor?.parentElement)?.closest('ul') ?? null;
  }
  if (!list || !editor.contains(list)) return;
  list.classList.add('notebook-todo');
  for (const item of list.children) if (item instanceof HTMLLIElement) addCheckbox(item);
}

/** Split a task at the caret; the next task always starts unchecked. */
export function splitTodoItem(editor: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed || !selection.anchorNode) return false;
  const element = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode.parentElement;
  const item = element?.closest('li');
  if (!item || !editor.contains(item) || !item.parentElement?.matches('ul.notebook-todo')) return false;
  const tail = selection.getRangeAt(0).cloneRange();
  tail.setEnd(item, item.childNodes.length);
  const next = document.createElement('li');
  next.append(tail.extractContents());
  next.querySelectorAll('input[type="checkbox"]').forEach(input => input.remove());
  addCheckbox(next);
  if (!next.textContent && !next.querySelector('br,img')) next.append(document.createElement('br'));
  item.after(next);
  const caret = document.createRange();
  caret.setStart(next, 1);
  caret.collapse(true);
  selection.removeAllRanges();
  selection.addRange(caret);
  return true;
}

/** Checkbox properties must also be attributes to survive HTML autosave. */
export function saveTodoCheckbox(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLInputElement) || !target.matches('.notebook-todo input[type="checkbox"]')) return false;
  stampScheduledCheck(target, target.checked);
  return true;
}
