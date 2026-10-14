/** Backspace at a timeline boundary removes the boundary, preserving both steps' blocks. */
export function mergeStepBackward(editor: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !selection.rangeCount || !selection.anchorNode) return false;
  const anchor = selection.anchorNode;
  const element = anchor instanceof Element ? anchor : anchor.parentElement;
  const step = element?.closest("li");
  if (!step || !editor.contains(step) || !step.parentElement?.matches("ol.notebook-steps")) return false;
  const previous = step.previousElementSibling;
  if (!previous || previous.tagName !== "LI") return false;

  const prefix = document.createRange();
  prefix.selectNodeContents(step);
  prefix.setEnd(anchor, selection.anchorOffset);
  const content = prefix.cloneContents();
  if (content.textContent || content.querySelector("br,img,video,audio,iframe,hr,pre,ol,ul")) return false;

  const offset = selection.anchorOffset;
  const boundary = previous.childNodes.length;
  previous.append(...step.childNodes);
  step.remove();
  const caret = document.createRange();
  // Moving nodes resets live ranges, so restore the original caret explicitly.
  caret.setStart(anchor === step ? previous : anchor, anchor === step ? boundary + offset : offset);
  caret.collapse(true);
  selection.removeAllRanges();
  selection.addRange(caret);
  return true;
}

/** Promote a heading at the caret to a timeline step, keeping its following content. */
export function splitStepAtHeading(editor: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !selection.rangeCount || !selection.anchorNode) return false;
  const anchor = selection.anchorNode;
  const heading = (anchor instanceof Element ? anchor : anchor.parentElement)?.closest("h1,h2,h3,h4,h5,h6");
  const step = heading?.parentElement;
  if (!heading || !step || !editor.contains(step) || step.tagName !== "LI" || !step.parentElement?.matches("ol.notebook-steps")) return false;

  const beforeCaret = selection.getRangeAt(0).cloneRange();
  beforeCaret.selectNodeContents(heading);
  beforeCaret.setEnd(selection.anchorNode, selection.anchorOffset);
  if (beforeCaret.toString().replace(/\u200b/g, "").trim()) return false;

  const beforeHeading = document.createRange();
  beforeHeading.selectNodeContents(step);
  beforeHeading.setEndBefore(heading);
  const prefix = beforeHeading.cloneContents();
  // The heading already has a circle if it starts the step. Do not add empty steps.
  if (!(prefix.textContent ?? "").trim() && !prefix.querySelector("img,video,audio,iframe,hr,pre,ol,ul")) return true;

  const nextStep = document.createElement("li");
  const tail = document.createRange();
  tail.selectNodeContents(step);
  tail.setStartBefore(heading);
  nextStep.append(tail.extractContents());
  step.after(nextStep);
  const caret = document.createRange();
  caret.selectNodeContents(heading);
  caret.collapse(true);
  selection.removeAllRanges();
  selection.addRange(caret);
  return true;
}

/** Exit an instruction list without splitting the surrounding timeline step. */
export function exitInstructionList(editor: HTMLElement, onlyIfEmpty = false): boolean {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !selection.anchorNode) return false;
  const anchor = selection.anchorNode;
  const item = (anchor instanceof Element ? anchor : anchor.parentElement)?.closest("li");
  const list = item?.parentElement;
  if (!item || !list || !editor.contains(item) || !/^(OL|UL)$/.test(list.tagName) || list.classList.contains("notebook-steps")) return false;
  const empty = !(item.textContent ?? "").replace(/\u200b/g, "").trim() && !item.querySelector("img,video,audio,iframe,hr,ol,ul");
  if (onlyIfEmpty && !empty) return false;
  const items = [...list.children];
  const index = items.indexOf(item);
  const tail = list.cloneNode(false) as HTMLElement;
  tail.removeAttribute("id");
  for (const next of items.slice(index + 1)) tail.append(next);
  if (list.tagName === "OL") {
    const reversed = list.hasAttribute("reversed");
    let number = Number(list.getAttribute("start") ?? (reversed ? items.length : 1));
    for (const before of items.slice(0, index + 1)) {
      if (before.hasAttribute("value")) number = Number(before.getAttribute("value"));
      number += reversed ? -1 : 1;
    }
    tail.setAttribute("start", String(number));
  }
  const paragraph = document.createElement("p"); paragraph.append(document.createElement("br"));
  list.after(paragraph);
  if (tail.children.length) paragraph.after(tail);
  if (empty) item.remove();
  if (!list.children.length) list.remove();
  const range = document.createRange(); range.setStart(paragraph, 0); range.collapse(true);
  selection.removeAllRanges(); selection.addRange(range);
  return true;
}
