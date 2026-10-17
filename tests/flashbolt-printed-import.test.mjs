import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseQuizResults } from '../src/pages/admin/flashbolt/note-parser.ts';
import { applyDetectedQuestionType } from '../src/pages/admin/flashbolt/questionTypeDetection.ts';
const text = readFileSync(new URL('./fixtures/cyberdefense-printed-quiz.txt', import.meta.url), 'utf8');

test('printed review imports all ten questions and their explicit answers in order', () => {
  const cards = parseQuizResults(text).map(applyDetectedQuestionType);
  assert.equal(cards.length, 10);
  assert.deepEqual(cards.map(card => card.definition), [
    'Data exfiltration', 'DLP', 'Scout Suite',
    'Scout Suite is used to show potential security risks on cloud deployments.',
    'Prowler', 'Pacu', 'Pacu', 'Application', 'Encrypt the virtual server', 'Deterrent',
  ]);
  assert.match(cards[0].term, /^A security analyst/);
  assert.equal(cards[9].term, 'Which security control makes a system more difficult to attack?');
  for (const card of cards) {
    assert.equal(card.answerChoices.length, 4);
    assert.deepEqual(card.correctAnswers, [card.definition]);
    assert.ok(card.answerChoices.includes(card.definition));
    assert.equal(card.questionType, 'multiple-choice');
    assert.ok(card.explanation.length > 50);
    assert.doesNotMatch(JSON.stringify(card), /Individual Response|labsimapp|Passing Score|Question \d+ Incorrect|Copyright ©/);
  }
});

test('wrapped choices and a full-page explanation remain attached to question four', () => {
  const cards = parseQuizResults(text);
  assert.equal(cards[3].answerChoices[2], 'Scout Suite is used to determine software version risks on cloud deployments.');
  assert.match(cards[3].explanation, /^Scout Suite is used to show potential security risks/);
  assert.match(cards[3].explanation, /Scout Suite does not scan for viruses\.$/);
  assert.doesNotMatch(cards[3].explanation, /An organization moves/);
  assert.match(cards[4].term, /^An organization moves/);
  assert.doesNotMatch(cards[4].term, /does not scan for viruses/);
});

test('print import accepts CRLF and multiple explicit correct answers', () => {
  const cards = parseQuizResults(text.replace('B Data backup', 'B Data backup Correct').replaceAll('\n', '\r\n'));
  assert.equal(cards.length, 10);
  assert.equal(cards[0].questionType, 'select-all');
  assert.deepEqual(cards[0].correctAnswers, ['Data exfiltration', 'Data backup']);
});

test('does not guess answers when explicit correctness is missing', () => {
  assert.deepEqual(parseQuizResults(text.replaceAll(' Correct', '').replace(/\nCorrect\n/g, '\n')), []);
});
