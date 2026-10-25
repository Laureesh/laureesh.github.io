/** Repair Markdown markers left behind by a partially formatted rich-text paste. */
export function repairPastedFormatting(html: string): string {
  const root = document.createElement('div');
  root.innerHTML = html;
  for (const item of root.querySelectorAll('ul > li')) {
    if (item.closest('pre, code') || item.querySelector('input')) continue;
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    let first = walker.nextNode();
    while (first && !first.textContent?.trim()) first = walker.nextNode();
    const match = first?.textContent?.match(/^\s*\[([ xX])\]\s*/);
    if (!first || !match) continue;
    first.textContent = first.textContent!.slice(match[0].length);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.contentEditable = 'false';
    checkbox.setAttribute('aria-label', 'Mark task complete');
    if (match[1].toLowerCase() === 'x') checkbox.setAttribute('checked', '');
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
