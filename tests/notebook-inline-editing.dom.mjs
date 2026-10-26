import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { checklistRoot } from '../src/pages/admin/notebook/checklistDocument.ts';
import { cleanInlineHtml, inlineEditorHtml, editableInlineBlocks, saveInlineBlock, saveInlineTask, removeEmptyInlineParagraphs } from '../src/pages/admin/notebook/inlineChecklistEditing.ts';
import { changeWeightLossStart } from '../src/pages/admin/notebook/weightLossPlan.ts';
const { parseHTML, NodeFilter } = createRequire(import.meta.url)(process.env.DOM_TEST_MODULE || 'linkedom');
const { window } = parseHTML('<html><body></body></html>');
for (const name of ['document', 'Node', 'Element']) globalThis[name] = window[name];
globalThis.NodeFilter = NodeFilter;
const source = '<div data-weightloss-plan="personal" data-weightloss-start="2026-10-26" data-weightloss-count="1"><h1>My plan</h1><p>Plan start: <span data-weightloss-start-label>10/26/2026</span>. <strong>My instructions</strong></p><ul class="notebook-todo"><li><input type="checkbox" checked data-checklist-date="2026-10-26" data-weightloss-session="0"><strong>Lunch</strong><br><em>My meal</em><br><a href="https://example.com">Recipe</a><p data-fitness-links="[&quot;protein&quot;]">Protein (g): 160</p></li></ul></div>';
test('in-place paragraphs preserve formatting and generated dates', () => {
  assert.equal(editableInlineBlocks(checklistRoot(source)).length, 2);
  let html = saveInlineBlock(source, 0, 'My <em>new</em> plan');
  html = saveInlineBlock(html, 1, 'Starting: <span data-weightloss-start-label>wrong date</span>. <strong>New instructions</strong><br>Another line');
  let root = checklistRoot(html);
  assert.equal(root.querySelector('h1 em').textContent, 'new');
  assert.equal(root.querySelector('p strong').textContent, 'New instructions');
  assert.equal(root.querySelector('[data-weightloss-start-label]').textContent, '10/26/2026');
  root = checklistRoot(changeWeightLossStart(html, '2026-11-02'));
  assert.equal(root.querySelector('[data-weightloss-start-label]').textContent, '11/02/2026');
  assert(root.querySelector('input').hasAttribute('checked'));
});
test('task edits keep checkbox state, date, links, and linked values', () => {
  let html = saveInlineTask(source, 0, 'title', 'My lunch');
  let root = checklistRoot(html);
  assert.equal(root.querySelector('li strong').textContent, 'My lunch');
  assert.equal(root.querySelector('li em').textContent, 'My meal');
  html = saveInlineTask(html, 0, 'detail', '<strong>New meal</strong><br><a href="https://example.com/new">New recipe</a>');
  root = checklistRoot(html);
  assert(root.querySelector('input').hasAttribute('checked'));
  assert.equal(root.querySelector('input').getAttribute('data-checklist-date'), '2026-10-26');
  assert.equal(root.querySelector('input').getAttribute('data-weightloss-session'), '0');
  assert.equal(root.querySelector('a').getAttribute('href'), 'https://example.com/new');
  assert.equal(root.querySelector('[data-fitness-links]').textContent, 'Protein (g): 160');
  assert.equal(root.querySelector('[data-fitness-links]').getAttribute('data-fitness-links'), '["protein"]');
});
test('editing strips active HTML and temporary editing attributes', () => {
  const cleaned = cleanInlineHtml('<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)" onclick="bad()">bad</a><b contenteditable="true">safe</b>');
  assert.doesNotMatch(cleaned, /script|onerror|onclick|contenteditable/);
  assert.match(cleaned, /<b>safe<\/b>/);
  const editor = inlineEditorHtml('<span data-weightloss-date="0">Today</span>');
  assert.match(editor, /contenteditable="false"/);
  assert.doesNotMatch(cleanInlineHtml(editor), /contenteditable/);
});
test('empty blocks remain editable and sequential typing updates the same block', () => {
  let html = '<h1>Title</h1><p></p>';
  for (const text of ['H', 'He', 'Hello<br>there']) html = saveInlineBlock(html, 1, text);
  assert.equal(editableInlineBlocks(checklistRoot(html)).length, 2);
  assert.equal(checklistRoot(html).querySelector('p').innerHTML, 'Hello<br>there');
});
test('empty line cleanup preserves dates, bindings, images, table cells and tasks', () => {
  const keep = '<p>Friday, 10/30/2026</p><p><span data-weightloss-date="0"></span></p><p data-fitness-links="[]"></p><p><img src="/photo.png"></p><table><tr><td><br></td></tr></table><ul class="notebook-todo"><li><input type="checkbox" checked><p><br></p></li></ul>';
  const before = '<p><br></p><p>&nbsp;<strong> </strong>\u200B</p>' + keep;
  const after = removeEmptyInlineParagraphs(before);
  assert.equal(after, checklistRoot(keep).innerHTML);
  assert.equal(removeEmptyInlineParagraphs(after), after);
});
test('removing one empty paragraph preserves adjacent paragraphs and their edit indices', () => {
  const before = '<p>Before</p><p><br></p><p>After</p><p></p>';
  assert.equal(removeEmptyInlineParagraphs(before, 0), before);
  const after = removeEmptyInlineParagraphs(before, 1);
  assert.equal(after, '<p>Before</p><p>After</p><p></p>');
  assert.equal(saveInlineBlock(after, 1, 'Changed'), '<p>Before</p><p>Changed</p><p></p>');
});
