import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = await readFile(new URL('../src/pages/admin/notebook/stepLayout.ts', import.meta.url), 'utf8');
const script = ts.transpile(source.replace(/export /g, ''), { target: ts.ScriptTarget.ES2022 });
const activity = await readFile(new URL('./fixtures/notebook-question-activity.md', import.meta.url), 'utf8');

test('question activities activate ten steps for Markdown and rich text without moving evidence or answers', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: script });
    const results = await page.evaluate(activity => {
      const rich = labMarkdownToHtml(activity);
      const plain = document.createElement('div'); plain.textContent = activity;
      return [plain.innerHTML, rich, `<article>${rich}</article>`].map(input => {
        const automatic = detectStepLayout(input);
        const manual = formatStepLayout(input);
        const doc = new DOMParser().parseFromString(automatic, 'text/html');
        const list = doc.querySelector('.notebook-steps');
        const original = new DOMParser().parseFromString(rich, 'text/html');
        return {
          matchesManual: automatic === manual,
          titles: getLayoutSteps(automatic).map(step => step.title),
          introductoryHeadings: [...doc.body.children].filter(node => node.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).map(node => node.textContent),
          after: list.nextElementSibling?.textContent,
          code: [...doc.querySelectorAll('pre')].map(node => node.textContent),
          originalCode: [...original.querySelectorAll('pre')].map(node => node.textContent),
          textPreserved: doc.body.textContent.replace(/\s/g, '') === original.body.textContent.replace(/\s/g, ''),
          roundTrip: removeStepLayout(automatic) === rich,
          repeat: detectStepLayout(automatic),
          choices: list.firstElementChild.textContent,
        };
      });
    }, activity);
    for (const result of results) {
      assert.equal(result.matchesManual, true);
      assert.deepEqual(result.titles, Array.from({ length: 10 }, (_, i) => `Question ${i + 1}`));
      assert.ok(result.introductoryHeadings.includes('Scenario'));
      assert.ok(result.introductoryHeadings.includes('Packet Capture'));
      assert.equal(result.after, 'Final Answer Key');
      assert.deepEqual(result.code, result.originalCode);
      assert.equal(result.textPreserved, true);
      assert.equal(result.roundTrip, true);
      assert.equal(result.repeat, null);
      assert.match(result.choices, /A\. 1 address/);
      assert.match(result.choices, /Correct Answer: D\. 6 addresses/);
    }
    assert.deepEqual(await page.evaluate(() => [
      detectStepLayout('<h3>Question 1</h3><p>Only one question.</p>'),
      detectStepLayout('<pre>Question 1\nQuestion 2</pre>'),
      detectStepLayout('<h1>Answer Key</h1><ol><li>HTTP</li><li>Spoofed</li></ol>'),
    ]), [null, null, null]);
  } finally { await browser.close(); }
});
