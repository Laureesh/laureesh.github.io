// A small, deliberately HTML-free subset for notes copied as Markdown.
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (text: string): string => text.split(/(`[^`]+`)/g).map(part => {
  if (part.startsWith('`') && part.endsWith('`')) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
  return escapeHtml(part).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
}).join('');
const task = (line: string) => line.match(/^\s*(?:[-*+]\s+)?\[([ xX])\]\s+(.+)$/);
export const hasNoteMarkdown = (text: string): boolean => /^(?:#{1,6}\s+|\s*(?:[-*+]\s+)?\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|```|---+\s*$)/m.test(text);

/** Returns null for ordinary prose, leaving the browser's normal paste intact. */
export function pastedMarkdownToHtml(text: string): string | null {
  if (!hasNoteMarkdown(text)) return null;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let list: 'todo' | 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  const closeList = () => { if (list) output.push(list === 'ol' ? '</ol>' : '</ul>'); list = null; };
  const flushParagraph = () => { if (paragraph.length) output.push(`<p>${paragraph.map(inline).join('<br>')}</p>`); paragraph = []; };
  const beginList = (kind: 'todo' | 'ul' | 'ol') => {
    flushParagraph();
    if (list !== kind) { closeList(); output.push(kind === 'todo' ? '<ul class="notebook-todo">' : `<${kind}>`); list = kind; }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { flushParagraph(); closeList(); continue; }
    if (/^```/.test(line)) {
      flushParagraph(); closeList();
      const code: string[] = [];
      while (++i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i]);
      output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { flushParagraph(); closeList(); output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) { flushParagraph(); closeList(); output.push('<hr>'); continue; }
    if (line.trim().startsWith('|') && /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[i + 1] ?? '')) {
      flushParagraph(); closeList();
      const cells = (row: string, tag: string) => `<tr>${row.trim().replace(/^\||\|$/g, '').split('|').map(cell => `<${tag}>${inline(cell.trim())}</${tag}>`).join('')}</tr>`;
      output.push('<table><thead>', cells(line, 'th'), '</thead><tbody>');
      i++;
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) output.push(cells(lines[++i], 'td'));
      output.push('</tbody></table>'); continue;
    }
    const todo = task(line);
    if (todo) {
      beginList('todo');
      output.push(`<li><input type="checkbox" contenteditable="false" aria-label="Mark task complete"${todo[1].toLowerCase() === 'x' ? ' checked' : ''}>${inline(todo[2])}</li>`); continue;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || numbered) { beginList(bullet ? 'ul' : 'ol'); output.push(`<li>${inline((bullet ?? numbered)![1])}</li>`); continue; }
    closeList(); paragraph.push(line);
  }
  flushParagraph(); closeList();
  return output.join('');
}
