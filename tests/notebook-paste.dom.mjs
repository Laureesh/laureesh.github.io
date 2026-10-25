// Run with DOM_TEST_MODULE pointing to an installed linkedom package.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { notebookRichPasteHtml, repairPastedFormatting } from '../src/pages/admin/notebook/pastedFormatting.ts';
import { saveTodoCheckbox } from '../src/pages/admin/notebook/todoList.ts';
const { parseHTML, NodeFilter } = createRequire(import.meta.url)(process.env.DOM_TEST_MODULE || 'linkedom');
const { window } = parseHTML('<html><body></body></html>');
for (const name of ['document', 'Node', 'Element', 'HTMLInputElement']) globalThis[name] = window[name];
globalThis.NodeFilter = NodeFilter;

test('formatted routine retains headings, tables, and 18 native tasks', async () => {
  const source = await readFile(new URL('../notes/daily-hygiene-notebook.html', import.meta.url), 'utf8');
  const result = notebookRichPasteHtml(source);
  const root = document.createElement('div'); root.innerHTML = result;
  assert.equal(root.querySelectorAll('.notebook-todo > li > input').length, 18);
  assert.equal(root.querySelector('h1').textContent, 'My daily hygiene routine');
  assert.equal(root.querySelectorAll('table').length, 1);
  const checkbox = root.querySelector('input'); checkbox.checked = true;
  assert.equal(saveTodoCheckbox(checkbox), true);
  const restored = document.createElement('div'); restored.innerHTML = root.innerHTML;
  assert.equal(restored.querySelector('input').hasAttribute('checked'), true);
});
test('rendered chat paste repairs task markers without losing headings or emphasis', () => {
  const result = notebookRichPasteHtml('<h2>Morning</h2><ul><li>[ ] <b>Brush</b> carefully</li><li>[x] Done</li></ul><p>---</p><p>*Optional*</p>');
  const root = document.createElement('div'); root.innerHTML = result;
  assert.equal(root.querySelectorAll('input').length, 2);
  assert.equal(root.querySelectorAll('input[checked]').length, 1);
  assert.equal(root.querySelector('b').textContent, 'Brush');
  assert.equal(root.querySelector('em').textContent, 'Optional');
  assert.ok(root.querySelector('hr'));
  assert.equal(repairPastedFormatting(result), result);
});
test('checklist rich paste drops scripts, event handlers, external styles and embedded objects', () => {
  const result = notebookRichPasteHtml('<script>alert(1)</script><style>body{display:none}</style><ul onclick="bad()"><li>[ ] Task <img src=x onerror="bad()"><iframe src="https://example.com"></iframe><a href="javascript:bad()">text</a></li></ul>');
  assert.doesNotMatch(result, /script|style|onclick|onerror|iframe|javascript:|<img/);
  assert.match(result, /Task text/);
});
test('ordinary rich text is left to normal browser paste', () => {
  assert.equal(notebookRichPasteHtml('<h1>Normal heading</h1><p>Text</p>'), null);
});
