import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('imports all ten copied AWS HTML questions without headers or page controls', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const source = ts.transpile(readFileSync(new URL('../src/pages/admin/flashbolt/note-parser.ts', import.meta.url), 'utf8'), {
      module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022,
    }).replace(/^export /gm, '');
    await page.addScriptTag({ content: source });
    const html = readFileSync(new URL('./fixtures/aws-question-cards.html', import.meta.url), 'utf8');
    const cards = await page.evaluate(text => parseQuizResults(text), html);
    assert.equal(cards.length, 10);
    assert.equal(cards[0].term, 'Which cloud architectural concept is supported by a system that can scale in terms of users, traffic, or data quantity without sacrificing performance?');
    assert.deepEqual(cards[0].answerChoices, ['Think parallel', 'Implement elasticity', 'Decouple your components', 'Design for failure']);
    assert.deepEqual(cards[0].correctAnswers, ['Implement elasticity']);
    assert.equal(cards[1].explanation, undefined);
    for (const index of [3, 8]) {
      assert.equal(cards[index].questionType, 'select-all');
      assert.equal(cards[index].correctAnswers.length, 2);
    }
    for (const card of cards) {
      assert.doesNotMatch(card.term, /Question \d+|AWS Cloud concepts|Answer Shown|Discuss|Report/);
      assert.doesNotMatch(card.explanation ?? '', /Correct answer:|Answers? (is|are)/);
      assert(card.correctAnswers.every(answer => card.answerChoices.includes(answer)));
    }
    assert.match(cards[0].explanation, /Reference:/);
    assert.match(cards[8].explanation, /^rightsize and ability/);
  } finally {
    await browser.close();
  }
});

test('imports unrevealed questionList cards using their hidden answer keys', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const source = ts.transpile(readFileSync(new URL('../src/pages/admin/flashbolt/note-parser.ts', import.meta.url), 'utf8'), {
      module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022,
    }).replace(/^export /gm, '');
    await page.addScriptTag({ content: source });
    const html = readFileSync(new URL('./fixtures/aws-hidden-question-cards.html', import.meta.url), 'utf8');
    const cards = await page.evaluate(text => parseQuizResults('<div id="questionList">' + text + '</div>'), html);
    assert.equal(cards.length, 10);
    assert.equal(cards[0].term, 'What can users do using AWS Marketplace? (Select two.)');
    assert.equal(cards[0].answerChoices.length, 5);
    assert.deepEqual(cards[0].correctAnswers, [
      'Sell solutions to other AWS users.', 'Buy third-party software that runs on AWS.',
    ]);
    assert.equal(cards[0].questionType, 'select-all');
    assert.equal(cards[2].definition, 'Business agility');
    assert.equal(cards[2].questionType, 'multiple-choice');
    for (const card of cards) {
      assert.doesNotMatch(card.term, /Question \d+|AWS Cloud concepts|Show Answer/);
      assert(card.correctAnswers.every(answer => card.answerChoices.includes(answer)));
    }
    // A comma inside one answer must not split it into multiple answers.
    const commaCards = await page.evaluate(() => parseQuizResults(`<div id="questionList"><div class="question-card">
      <div class="q-text">Which option?</div><div class="options">
      <div class="option"><span>Users, traffic, and data</span></div>
      <div class="option"><span>Only users</span></div></div>
      <div class="q-answer">✅ <strong>Correct answer:</strong> Users, traffic, and data<br>Explanation.</div>
      </div></div>`));
    assert.deepEqual(commaCards[0].correctAnswers, ['Users, traffic, and data']);
  } finally {
    await browser.close();
  }
});
