import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sources = await Promise.all(['checklistSchedule', 'todoList', 'listEditing'].map(name => readFile(new URL(`../src/pages/admin/notebook/${name}.ts`, import.meta.url), 'utf8')));
const script = ts.transpile(sources.join('\n').replace(/^import .*;$/gm, '').replace(/export /g, ''), { target: ts.ScriptTarget.ES2022 });

test('tasks convert selected text, split unchecked, persist completion, and exit on empty Enter', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<button id="add">To-do list</button><div id="editor" contenteditable><p>First task</p><p>Second task</p></div>');
    await page.addScriptTag({ content: script });
    await page.evaluate(() => {
      const editor = document.querySelector('#editor');
      document.querySelector('#add').onmousedown = event => event.preventDefault();
      document.querySelector('#add').onclick = () => insertTodoList(editor);
      editor.onchange = event => { saveTodoCheckbox(event.target); window.saved = editor.innerHTML; };
      editor.onkeydown = event => {
        if (event.key === 'Enter' && (exitInstructionList(editor, true) || splitTodoItem(editor))) event.preventDefault();
      };
      editor.focus();
      const range = document.createRange(); range.selectNodeContents(editor);
      getSelection().removeAllRanges(); getSelection().addRange(range);
    });
    await page.locator('#add').click();
    assert.equal(await page.locator('.notebook-todo > li > input').count(), 2);
    await page.locator('input').first().check();
    assert.match(await page.evaluate(() => window.saved), /checked/);
    await page.evaluate(() => {
      const editor = document.querySelector('#editor'); editor.innerHTML = window.saved;
      editor.focus();
      const range = document.createRange(); range.selectNodeContents(editor.querySelector('li')); range.collapse(false);
      getSelection().removeAllRanges(); getSelection().addRange(range);
    });
    assert.equal(await page.locator('input').first().isChecked(), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.notebook-todo > li').count(), 3);
    assert.equal(await page.locator('input').nth(1).isChecked(), false);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.notebook-todo > li').count(), 2);
    await page.keyboard.type('Outside list');
    assert.equal(await page.locator('#editor > p').filter({ hasText: 'Outside list' }).innerText(), 'Outside list');
    assert.match(await page.locator('#editor').innerText(), /Second task/);
  } finally { await browser.close(); }
});
