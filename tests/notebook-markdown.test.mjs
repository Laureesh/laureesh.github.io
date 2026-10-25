import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { pastedMarkdownToHtml } from '../src/pages/admin/notebook/pastedMarkdown.ts';
import { clipboardNoteChanges } from '../src/pages/admin/notebook/clipboardNote.ts';

test('the complete hygiene note becomes native editable Notebook content', async () => {
  const text = await readFile(new URL('../notes/daily-hygiene.md', import.meta.url), 'utf8');
  const html = pastedMarkdownToHtml(text);
  assert.match(html, /<h1>My daily hygiene routine<\/h1>/);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 18);
  assert.equal((html.match(/class="notebook-todo"/g) ?? []).length, 3);
  assert.match(html, /<table><thead><tr><th>Use<\/th><th>Product<\/th>/);
  assert.match(html, /<hr>/);
  assert.match(html, /<em>Optional:/);
  assert.doesNotMatch(html, /\[ \]|\*\*|<p>---/);
  assert.ok(html.indexOf('🌙 Night') < html.indexOf('🚿 Shower guide'));
  assert.equal(clipboardNoteChanges(text, 'body').html, html);
});
test('bare tasks from the original source and completed tasks are supported', () => {
  assert.equal(pastedMarkdownToHtml('[ ] First\r\n[x] Second\r\n- [X] Third').match(/ checked/g).length, 2);
  assert.match(pastedMarkdownToHtml('[ ] 1. Brush your teeth'), />1\. Brush your teeth<\/li>/);
});
test('ordinary prose uses the existing paste behavior', () => {
  assert.equal(pastedMarkdownToHtml('A normal paragraph\nwith a second line'), null);
});
test('pasted HTML and code are escaped rather than executed', () => {
  const html = pastedMarkdownToHtml('# Notes\n<script>alert(1)</script>\n\n- [ ] <img src=x onerror=alert(1)>\n\n```html\n- [x] **literal**\n<script>bad()</script>\n```');
  assert.doesNotMatch(html, /<script|<img/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<pre><code>- \[x\] \*\*literal\*\*/);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1);
});
test('task lists do not absorb ordinary lists or paragraphs', () => {
  assert.match(pastedMarkdownToHtml('- [ ] Task\n- Reminder\n1. Step\nParagraph'), /<\/ul><ul><li>Reminder<\/li><\/ul><ol><li>Step<\/li><\/ol><p>Paragraph<\/p>/);
});
test('inline code keeps emphasis markers literal', () => {
  assert.match(pastedMarkdownToHtml('# Test\n`**literal**` and **bold** and *italic*'), /<code>\*\*literal\*\*<\/code> and <strong>bold<\/strong> and <em>italic<\/em>/);
});

test('the exact visual-checkbox routine detects headings, grouped tasks, and six shower steps', async () => {
  const text = await readFile(new URL('../notes/daily-hygiene-paste.txt', import.meta.url), 'utf8');
  const html = pastedMarkdownToHtml(text);
  assert.match(html, /^<h1>MY DAILY HYGIENE ROUTINE<\/h1>/);
  assert.match(html, /<h2>☀️ MORNING — GET READY<\/h2>/);
  assert.match(html, /<h2>TEETH<\/h2>/);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 18);
  assert.equal((html.match(/class="notebook-todo"/g) ?? []).length, 3);
  assert.match(html, /<strong>Teeth &amp; tongue<\/strong><br>Brush for 2 minutes[^]*?Gently clean your tongue\.<\/li>/);
  const shower = html.match(/<ol>(.*?)<\/ol>/s)[1];
  assert.equal((shower.match(/<li>/g) ?? []).length, 6);
  assert.match(shower, /<li>FACE<br>Use clean hands/);
  assert.match(html, /<li>Outdoors,[^]*?or swimming, following the label\.<\/li>/);
  assert.doesNotMatch(html, /□/);
  assert.equal(clipboardNoteChanges(text, 'body').html, html);
});
test('all visual task symbols and completion states are recognized', () => {
  const html = pastedMarkdownToHtml('□ First\n☐ Second\n☑ Third\n☒ Fourth');
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 4);
  assert.equal((html.match(/ checked/g) ?? []).length, 2);
});
test('visual tasks do not cause uppercase prose or fenced code to be reformatted', () => {
  assert.equal(pastedMarkdownToHtml('IMPORTANT\nNormal prose'), null);
  const html = pastedMarkdownToHtml('```text\n□ Literal\n```\n\nPLAIN TEXT');
  assert.match(html, /<pre><code>□ Literal<\/code><\/pre><p>PLAIN TEXT<\/p>/);
});
