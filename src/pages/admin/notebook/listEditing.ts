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
