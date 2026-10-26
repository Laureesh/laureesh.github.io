import { checklistRoot, checklistSelector, checklistTaskContent } from './checklistDocument.ts';
const protectedSelector = '[data-weightloss-date],[data-weightloss-start-label],[data-fitness-links],[data-fitness-calculation]';
const tags = new Set('P DIV SPAN BR STRONG B EM I U S DEL A UL OL LI BLOCKQUOTE PRE CODE H1 H2 H3 H4 H5 H6 IMG'.split(' '));
/** Keep inline formatting, but never execute pasted HTML or retain editor attributes. */
export function cleanInlineHtml(html: string): string {
  const root = checklistRoot(html);
  const clean = (parent: Element) => {
    for (const node of [...parent.children]) {
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH', 'TEMPLATE', 'INPUT', 'BUTTON'].includes(node.tagName)) { node.remove(); continue; }
      clean(node);
      if (!tags.has(node.tagName)) { node.replaceWith(...node.childNodes); continue; }
      for (const attr of [...node.attributes]) {
        const allowed = ['href', 'src', 'alt', 'title', 'start', 'data-weightloss-date', 'data-weightloss-start-label', 'data-fitness-links', 'data-fitness-calculation'].includes(attr.name);
        if (!allowed || (attr.name === 'href' && !/^(https?:|mailto:|#|\/(?!\/))/i.test(attr.value)) || (attr.name === 'src' && !/^(https?:|data:image\/(?:png|jpeg|gif|webp);|\/(?!\/))/i.test(attr.value))) node.removeAttribute(attr.name);
      }
    }
  };
  clean(root);
  return root.innerHTML;
}
export function inlineEditorHtml(html: string): string {
  const root = checklistRoot(cleanInlineHtml(html));
  root.querySelectorAll(protectedSelector).forEach(node => { node.setAttribute('contenteditable', 'false'); node.setAttribute('title', 'Updates from the schedule or linked calculators'); });
  return root.innerHTML;
}
export function editableInlineBlocks(root: Element): Element[] {
  return [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,td,th,li,blockquote,pre')].filter(node =>
    !node.closest('ul.notebook-todo,[data-fitness-values]') && !node.querySelector('h1,h2,h3,h4,h5,h6,p,td,th,li,blockquote,pre,ul,ol,input'));
}
/** Only remove blank text paragraphs, never task rows, table cells or generated values. */
export function isEmptyInlineParagraph(node: Element): boolean {
  return node.tagName === 'P' && !node.matches(protectedSelector) &&
    !node.closest('ul.notebook-todo,[data-fitness-values]') &&
    !(node.textContent ?? '').replace(/[\s\u200B\uFEFF]/g, '') &&
    [...node.querySelectorAll('*')].every(child =>
      ['BR', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL'].includes(child.tagName) && !child.matches(protectedSelector));
}
export function removeEmptyInlineParagraphs(html: string, index?: number): string {
  const root = checklistRoot(html);
  const blocks = editableInlineBlocks(root);
  let changed = false;
  blocks.forEach((block, position) => {
    if ((index === undefined || position === index) && isEmptyInlineParagraph(block)) {
      block.remove();
      changed = true;
    }
  });
  return changed ? root.innerHTML : html;
}
function preservedHtml(original: Element, edited: string): string {
  const root = checklistRoot(cleanInlineHtml(edited));
  const originals = [...original.querySelectorAll(protectedSelector)];
  const replacements = [...root.querySelectorAll(protectedSelector)];
  // Generated values are controlled by their inputs, including when pasted over.
  originals.forEach((node, index) => {
    const copy = node.cloneNode(true) as Element;
    copy.removeAttribute('contenteditable');
    if (replacements[index]) replacements[index].replaceWith(copy);
    else root.append(copy);
  });
  replacements.slice(originals.length).forEach(node => node.replaceWith(document.createTextNode(node.textContent ?? '')));
  return root.innerHTML;
}
export function saveInlineBlock(html: string, index: number, edited: string): string {
  const root = checklistRoot(html);
  const block = editableInlineBlocks(root)[index];
  if (!block) return html;
  block.innerHTML = preservedHtml(block, edited);
  return root.innerHTML;
}
export function saveInlineTask(html: string, index: number, part: 'title' | 'detail', edited: string): string {
  const root = checklistRoot(html);
  const box = root.querySelectorAll(checklistSelector)[index];
  const item = box?.parentElement;
  if (!item) return html;
  const { title, detail } = checklistTaskContent(item);
  const heading = document.createElement('strong');
  heading.textContent = part === 'title' ? checklistRoot(edited).textContent || 'Task' : title;
  if (part === 'detail') detail.innerHTML = preservedHtml(detail, edited);
  item.replaceChildren(box, heading, document.createElement('br'), ...detail.childNodes);
  return root.innerHTML;
}
