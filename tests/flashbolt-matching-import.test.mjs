import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseQuizResults } from '../src/pages/admin/flashbolt/note-parser.ts';
import { applyDetectedQuestionType } from '../src/pages/admin/flashbolt/questionTypeDetection.ts';

const text = readFileSync(new URL('./fixtures/cyberdefense-matching.txt', import.meta.url), 'utf8');
const expected = [
  ['XSS Attack', 'Use rigid specifications to validate all headers, cookie query strings, hidden fields, and form fields.'],
  ['Injection Attack', 'Perform input validation. Do not permit dangerous characters in the input.'],
  ['CSRF Attack', "Log off immediately after using a web application. Clear History after using a web application, and don't allow your browser to save your login details."],
  ['DoS Attack', 'Secure remote administration and connectivity testing. Perform extensive input validation. Configure the firewall to deny ICMP traffic. Stop data processed by the attacker from being executed.'],
  ['Directory Traversal', 'Update web servers with security patches on a regular basis. Limit access to the secure areas of the website.'],
];

for (const [name, input] of [
  ['plain copied review', text],
  ['Markdown with joined status', text.replace('Question 7\nIncorrect', '## Question\u00a07Incorrect').replace('\nExplanation\n', '\n### Explanation\n')],
]) {
  test(`${name}: imports all five correct matching pairs`, () => {
    const cards = parseQuizResults(input);
    assert.equal(cards.length, 1);
    const card = applyDetectedQuestionType(cards[0]);
    assert.equal(card.questionType, 'matching');
    assert.equal(card.term, 'Match each attack on the left to the appropriate defense on the right.');
    assert.deepEqual(card.matchingPairs.map(({ left, right }) => [left, right]), expected);
    assert.equal(new Set(card.matchingPairs.map(pair => pair.id)).size, 5);
    assert.match(card.explanation, /To guard against injection attacks/);
    assert.doesNotMatch(card.definition, /Incorrect Answer|Keyboard Instructions/);
  });
}

test('matching import preserves adjacent multiple-choice questions', () => {
  const next = '\nQuestion 8\nCorrect\nWhich option?\nanswer\nA\nFirst\nCorrect Answer:\nCorrect\nB\nSecond\nExplanation\nFirst is correct.';
  const cards = parseQuizResults(text + next);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].matchingPairs.length, 5);
  assert.equal(cards[1].definition, 'First');
  assert.doesNotMatch(cards[0].explanation, /Which option/);
});
