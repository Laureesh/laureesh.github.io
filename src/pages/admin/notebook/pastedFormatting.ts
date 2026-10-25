import { isRoutineChecklistHeading } from './pastedMarkdown.ts';

function inferredRoutineTasks(root: HTMLElement): Set<Element> {
  const tasks = new Set<Element>();
  let checklistSection = false;
  for (const element of root.querySelectorAll('h1, h2, h3, h4, h5, h6, ul > li')) {
    if (element.closest('pre, code')) continue;
    if (/^H[1-6]$/.test(element.tagName)) {
      checklistSection = isRoutineChecklistHeading(element.textContent ?? '');
      continue;
    }
    if (!checklistSection) continue;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let first = walker.nextNode();
    while (first && !first.textContent?.trim()) first = walker.nextNode();
    if (first?.parentElement?.closest('strong, b')) tasks.add(element);
  }
  return tasks;
}

/** Repair Markdown markers left behind by a partially formatted rich-text paste. */
export function repairPastedFormatting(html: string): string {
  const root = document.createElement('div');
  root.innerHTML = html;
  const inferred = inferredRoutineTasks(root);
  for (const item of root.querySelectorAll('ul > li')) {
    if (item.closest('pre, code') || item.querySelector('input')) continue;
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    let first = walker.nextNode();
    while (first && !first.textContent?.trim()) first = walker.nextNode();
    const match = first?.textContent?.match(/^\s*(?:\[([ xX])\]|([□☐☑☒]))\s*/);
    if (!first || (!match && !inferred.has(item))) continue;
    if (match) first.textContent = first.textContent!.slice(match[0].length);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.contentEditable = 'false';
    checkbox.setAttribute('aria-label', 'Mark task complete');
    if (match && /[xX☑☒]/.test(match[1] ?? match[2])) checkbox.setAttribute('checked', '');
    item.prepend(checkbox);
    item.parentElement!.classList.add('notebook-todo');
  }
  for (const block of root.querySelectorAll('p, div')) {
    if (block.closest('pre, code') || block.children.length) continue;
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(block.textContent ?? '')) block.replaceWith(document.createElement('hr'));
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    if (node.parentElement?.closest('pre, code, em, strong, a, script, style')) continue;
    const pattern = /\*\*([^*\n]+)\*\*|(?<!\*)\*([^*\n]+)\*(?!\*)/g;
    const text = node.data;
    const matches = [...text.matchAll(pattern)];
    if (!matches.length) continue;
    const fragment = document.createDocumentFragment();
    let end = 0;
    for (const match of matches) {
      fragment.append(text.slice(end, match.index));
      const emphasis = document.createElement(match[1] ? 'strong' : 'em');
      emphasis.textContent = match[1] ?? match[2];
      fragment.append(emphasis);
      end = match.index! + match[0].length;
    }
    fragment.append(text.slice(end));
    node.replaceWith(fragment);
  }
  return root.innerHTML;
}

/** Preserve a copied checklist's structure without importing styles or executable HTML. */
export function notebookRichPasteHtml(source: string): string | null {
  if (!source) return null;
  const root = document.createElement('div');
  root.innerHTML = source;
  const hasTasks = root.querySelector('li input[type="checkbox"]') || [...root.querySelectorAll('li')].some(item => /^\s*(?:\[[ xX]\]|[□☐☑☒])\s*/.test(item.textContent ?? ''));
  if (!hasTasks && !inferredRoutineTasks(root).size) return null;
  const allowed = new Set(['P', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'BLOCKQUOTE', 'PRE', 'CODE']);
  const clean = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? '');
    const fragment = document.createDocumentFragment();
    if (!(node instanceof Element) || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH', 'TEMPLATE'].includes(node.tagName)) return fragment;
    if (node.matches('input[type="checkbox"]') && node.closest('li')) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.contentEditable = 'false';
      checkbox.setAttribute('aria-label', 'Mark task complete');
      if (node.hasAttribute('checked')) checkbox.setAttribute('checked', '');
      return checkbox;
    }
    const result = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : fragment;
    for (const child of node.childNodes) result.appendChild(clean(child));
    return result;
  };
  const sanitized = document.createElement('div');
  for (const child of root.childNodes) sanitized.appendChild(clean(child));
  for (const list of sanitized.querySelectorAll('ul')) {
    if (list.querySelector(':scope > li > input[type="checkbox"]')) list.classList.add('notebook-todo');
  }
  return repairPastedFormatting(sanitized.innerHTML);
}
