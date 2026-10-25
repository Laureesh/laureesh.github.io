// A small, deliberately HTML-free subset for notes copied as Markdown.
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (text: string): string => text.split(/(`[^`]+`)/g).map(part => {
  if (part.startsWith('`') && part.endsWith('`')) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
  return escapeHtml(part).replace(/\\+_/g, '_').replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
}).join('');
const task = (line: string) => {
  const match = line.match(/^\s*(?:[-*+]\s+)?(?:\[([ xX])\]|([□☐☑☒]))\s+(.+)$/);
  return match ? { checked: /[xX☑☒]/.test(match[1] ?? match[2]), title: match[3] } : null;
};
const plainHeading = (line: string) => {
  const title = line.trim();
  return title.length > 1 && title.length <= 90 && /\p{L}/u.test(title)
    && title === title.toLocaleUpperCase() && !/^[\d□☐☑☒•*+#`[-]/.test(title)
    && !/[.!?:]$/.test(title);
};
// Infer missing task markers only in routine/checklist sections, not arbitrary bold lists.
export const isRoutineChecklistHeading = (title: string): boolean => /\b(?:morning|night(?:time)?|weekly|checklist)\b/i.test(title);
export const hasNoteMarkdown = (text: string): boolean => /^(?:#{1,6}\s+|\s*(?:[-*+]\s+)?(?:\[[ xX]\]|[□☐☑☒])\s+|[-*+•]\s+|\d+[.)]\s+|```|---+\s*$)/m.test(text);

/** Returns null for ordinary prose, leaving the browser's normal paste intact. */
export function pastedMarkdownToHtml(text: string): string | null {
  if (!hasNoteMarkdown(text)) return null;
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n');
  let inCode = false;
  const hardBreaks: boolean[] = [];
  const lines = rawLines.map(line => {
    if (/^```/.test(line)) inCode = !inCode;
    if (!inCode) line = line.split(/(`[^`]+`)/g).map((part, index) => index % 2 ? part : part.replace(/&#(?:x20|32);|&nbsp;/gi, ' ')).join('').replace(/^(\s*\d+)\\([.)])(?=\s)/, '$1$2');
    const hardBreak = !inCode && /(?<!\\)\\[ \t]*$/.test(line);
    hardBreaks.push(hardBreak);
    return hardBreak ? line.replace(/\\[ \t]*$/, '') : line;
  });
  // Only infer unmarked headings/descriptions for the visual-checkbox note format.
  // Ignore checkbox examples inside fenced code.
  let fenced = false;
  const structured = lines.some(line => {
    if (/^```/.test(line)) { fenced = !fenced; return false; }
    return !fenced && /^\s*(?:[-*+]\s+)?[□☐☑☒]\s+/.test(line);
  });
  const firstContent = lines.findIndex(line => line.trim());
  const isHeading = (index: number) => structured && plainHeading(lines[index])
    && (index === firstContent || !lines[index - 1]?.trim());
  const output: string[] = [];
  let list: 'todo' | 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  let checklistSection = false;
  const closeList = () => { if (list) output.push(list === 'ol' ? '</ol>' : '</ul>'); list = null; };
  const flushParagraph = () => { if (paragraph.length) output.push(`<p>${paragraph.map(inline).join('<br>')}</p>`); paragraph = []; };
  const beginList = (kind: 'todo' | 'ul' | 'ol') => {
    flushParagraph();
    if (list !== kind) { closeList(); output.push(kind === 'todo' ? '<ul class="notebook-todo">' : `<${kind}>`); list = kind; }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      flushParagraph();
      const next = lines.slice(i + 1).find(value => value.trim()) ?? '';
      if (!structured || !((list === 'todo' && task(next)) || (list === 'ol' && /^\s*\d+[.)]\s+/.test(next)))) closeList();
      continue;
    }
    // Descriptions stay inside their task/step rather than becoming loose paragraphs.
    const description = () => {
      const parts: string[] = [];
      while (i + 1 < lines.length && lines[i + 1].trim()
        && (structured || hardBreaks[i] || /^\s{2,}\S/.test(lines[i + 1]))
        && !task(lines[i + 1]) && !/^(?:\s*[-*+•]\s+|\s*\d+[.)]\s+|#|```)/.test(lines[i + 1])
        && !isHeading(i + 1)) parts.push(inline(lines[++i].trimStart()));
      return parts.length ? `<br>${parts.join('<br>')}` : '';
    };
    if (/^```/.test(line)) {
      flushParagraph(); closeList();
      const code: string[] = [];
      while (++i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i]);
      output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); continue;
    }
    if (isHeading(i)) {
      flushParagraph(); closeList();
      checklistSection = isRoutineChecklistHeading(line);
      const level = i === firstContent ? 1 : 2;
      output.push(`<h${level}>${inline(line.trim())}</h${level}>`); continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { checklistSection = isRoutineChecklistHeading(heading[2]); flushParagraph(); closeList(); output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
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
      output.push(`<li><input type="checkbox" contenteditable="false" aria-label="Mark task complete"${todo.checked ? ' checked' : ''}>${structured ? `<strong>${inline(todo.title)}</strong>` : inline(todo.title)}${description()}</li>`); continue;
    }
    const bullet = line.match(/^\s*[-*+•]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const inferredTask = Boolean(checklistSection && bullet && /^\*\*[^*]+\*\*\s*$/.test(bullet[1]));
      beginList(inferredTask ? 'todo' : bullet ? 'ul' : 'ol'); output.push(`<li>${inferredTask ? '<input type="checkbox" contenteditable="false" aria-label="Mark task complete">' : ''}${inline((bullet ?? numbered)![1])}${description()}</li>`); continue; }
    closeList(); paragraph.push(line);
  }
  flushParagraph(); closeList();
  return output.join('');
}
