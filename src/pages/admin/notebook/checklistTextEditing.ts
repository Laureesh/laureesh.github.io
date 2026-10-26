import { checklistRoot } from './checklistDocument.ts';
export function editableTextBlocks(root: Element): Element[] {
  return [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p')].filter(node => !node.closest('ul.notebook-todo, [data-fitness-values]') && !node.querySelector('ul,ol,p,h1,h2,h3,h4,h5,h6'));
}
export function textParts(block: Element): { node: Text; label: string; locked: boolean }[] {
  const result: { node: Text; label: string; locked: boolean }[] = [];
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent?.trim()) return;
      const parent = node.parentElement;
      const locked = Boolean(parent?.closest('[data-weightloss-date],[data-weightloss-start-label],[data-fitness-links],[data-fitness-calculation]'));
      result.push({ node: node as Text, locked, label: locked ? 'Scheduled date (use Start date to change)' : parent?.closest('a') ? 'Link text' : parent?.closest('strong,b') ? 'Bold text' : 'Text' });
    } else node.childNodes.forEach(visit);
  };
  visit(block);
  if (!result.length) {
    const node = document.createTextNode(''); block.append(node);
    result.push({ node, label: 'Text', locked: false });
  }
  return result;
}
export function saveChecklistText(html: string, index: number, values: string[]): string {
  const root = checklistRoot(html);
  const block = editableTextBlocks(root)[index];
  if (!block) throw new Error('This text section no longer exists.');
  const parts = textParts(block);
  if (parts.length !== values.length) throw new Error('This text changed. Reopen the editor.');
  parts.forEach((part, i) => { if (!part.locked) part.node.textContent = values[i]; });
  return root.innerHTML;
}
