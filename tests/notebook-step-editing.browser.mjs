import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const { chromium } = createRequire(import.meta.url)('playwright');
const source = await readFile(new URL('../src/pages/admin/notebook/listEditing.ts', import.meta.url), 'utf8');
const script = ts.transpile(source.replace(/export function /g, 'function '), { target: ts.ScriptTarget.ES2022 });

test('Enter before a later heading splits at that heading without empty steps or lost content', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="editor" contenteditable><ol class="notebook-steps"><li data-completed="true"><h3>Connect subnet</h3><ol><li>Select subnet</li><li>Save associations</li></ol><h3><strong>Task 3 — Create security group</strong></h3><p>Keep these instructions.</p></li><li><h3>Next task</h3></li></ol></div>');
    await page.addScriptTag({ content: script });
    await page.evaluate(() => {
      const editor = document.querySelector('#editor');
      editor.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey && (splitStepAtHeading(editor) || exitInstructionList(editor, true))) event.preventDefault();
      });
      editor.focus();
      const caret = document.createRange();
      caret.setStart(editor.querySelector('strong').firstChild, 0);
      caret.collapse(true);
      getSelection().removeAllRanges();
      getSelection().addRange(caret);
    });
    await page.keyboard.press('Enter');
    const steps = page.locator('.notebook-steps > li');
    assert.equal(await steps.count(), 3);
    assert.equal(await steps.nth(0).innerText(), 'Connect subnet\nSelect subnet\nSave associations');
    assert.equal(await steps.nth(1).innerText(), 'Task 3 — Create security group\n\nKeep these instructions.');
    assert.equal(await steps.nth(1).getAttribute('data-completed'), null);
    assert.equal(await steps.nth(2).innerText(), 'Next task');
    await page.keyboard.press('Enter');
    assert.equal(await steps.count(), 3);
    await page.keyboard.type('New ');
    assert.equal(await steps.nth(1).locator('h3').innerText(), 'New Task 3 — Create security group');

    // Ordinary numbered instructions still get a new item on Enter.
    await page.evaluate(() => {
      const item = document.querySelector('.notebook-steps > li ol > li');
      const caret = document.createRange();
      caret.selectNodeContents(item);
      caret.collapse(false);
      getSelection().removeAllRanges();
      getSelection().addRange(caret);
    });
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.notebook-steps > li ol > li').count(), 3);
    assert.equal(await steps.count(), 3);
  } finally {
    await browser.close();
  }
});

test('Backspace merges a step into its predecessor while preserving headings, instructions, and caret', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="editor" contenteditable><ol class="notebook-steps" start="8"><li><h3>Task 3 — Create the Security Group</h3></li><li><h3><strong>Create Web Security Group</strong></h3><ol><li>Click Security groups.</li><li>Create security group.</li></ol><p>Enter:</p></li><li><h3>Next step</h3></li></ol></div>');
    await page.addScriptTag({ content: script });
    await page.evaluate(() => {
      const editor = document.querySelector('#editor');
      editor.addEventListener('keydown', event => {
        if (event.key === 'Backspace' && mergeStepBackward(editor)) event.preventDefault();
      });
      editor.focus();
      const caret = document.createRange();
      caret.setStart(editor.querySelector('strong').firstChild, 0);
      caret.collapse(true);
      getSelection().removeAllRanges();
      getSelection().addRange(caret);
    });
    await page.keyboard.press('Backspace');
    const steps = page.locator('.notebook-steps > li');
    assert.equal(await steps.count(), 2);
    assert.deepEqual(await steps.nth(0).locator('h3').allTextContents(), ['Task 3 — Create the Security Group', 'Create Web Security Group']);
    assert.deepEqual(await steps.nth(0).locator('ol > li').allTextContents(), ['Click Security groups.', 'Create security group.']);
    assert.equal(await steps.nth(0).locator('p').innerText(), 'Enter:');
    assert.equal(await steps.nth(1).innerText(), 'Next step');
    await page.keyboard.type('New ');
    assert.equal(await steps.nth(0).locator('strong').innerText(), 'New Create Web Security Group');
    await page.keyboard.press('Backspace');
    assert.equal(await steps.nth(0).locator('strong').innerText(), 'NewCreate Web Security Group');
    assert.equal(await steps.count(), 2);
    const boundaries = await page.evaluate(() => {
      const editor = document.querySelector('#editor');
      const attempt = node => {
        const caret = document.createRange();
        caret.selectNodeContents(node);
        caret.collapse(true);
        getSelection().removeAllRanges();
        getSelection().addRange(caret);
        return mergeStepBackward(editor);
      };
      return [attempt(editor.querySelector('h3')), attempt(editor.querySelector('ol ol li'))];
    });
    assert.deepEqual(boundaries, [false, false]);
  } finally {
    await browser.close();
  }
});
