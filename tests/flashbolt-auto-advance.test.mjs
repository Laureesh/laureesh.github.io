import assert from 'node:assert/strict';
import test from 'node:test';
import { activeAutoAdvance, requestedAnswerCount, shouldAdvanceAfterCorrect } from '../src/pages/admin/flashbolt/autoAdvance.ts';

const combinations = [
  [false, false, false, null],
  [true, false, false, 'question'],
  [false, true, false, 'choices'],
  [false, false, true, 'correct'],
  [true, true, false, 'choices'],
  [true, false, true, 'correct'],
  [false, true, true, 'correct'],
  [true, true, true, 'correct'],
];
for (const [question, choices, correct, expected] of combinations) {
  test(`question=${question}, choices=${choices}, correct=${correct} advances on ${expected}`, () => {
    assert.equal(activeAutoAdvance(question, choices, correct), expected);
  });
}
test('turning the bottom switches off restores the next enabled trigger', () => {
  assert.equal(activeAutoAdvance(true, true, true), 'correct');
  assert.equal(activeAutoAdvance(true, true, false), 'choices');
  assert.equal(activeAutoAdvance(true, false, false), 'question');
  assert.equal(activeAutoAdvance(false, false, false), null);
});


test('the supplied Choose two question advances only after its second correct answer', () => {
  const question = 'Which of the following are advantages of the AWS Cloud (Choose two) - Module 1: Cloud Concepts';
  assert.equal(requestedAnswerCount(question), 2);
  assert.equal(shouldAdvanceAfterCorrect(question, true, 1, true), false);
  assert.equal(shouldAdvanceAfterCorrect(question, true, 2, true), true);
  assert.equal(shouldAdvanceAfterCorrect(question, true, 3, true), false);
  assert.equal(shouldAdvanceAfterCorrect(question, true, 2, false), false);
});

test('recognizes word and numeric counts with spacing and common instruction verbs', () => {
  for (const question of ['Choose three', 'SELECT EXACTLY 3 answers', 'Pick any three', 'Check the 3 correct options', 'Mark&nbsp;three', 'Choose\n3']) {
    assert.equal(requestedAnswerCount(question), 3);
    assert.equal(shouldAdvanceAfterCorrect(question, true, 2, true), false);
    assert.equal(shouldAdvanceAfterCorrect(question, true, 3, true), true);
  }
});

test('unspecified multi-answer questions stay open; single-answer questions still advance', () => {
  for (const question of ['Select all that apply', 'Which 2 protocols are shown?', 'Choose 0', 'Chapter 3: networking']) {
    assert.equal(requestedAnswerCount(question), null);
    assert.equal(shouldAdvanceAfterCorrect(question, true, 1, true), false);
    assert.equal(shouldAdvanceAfterCorrect(question, true, 2, true), false);
  }
  assert.equal(shouldAdvanceAfterCorrect('Choose the best answer', false, 1, true), true);
  assert.equal(shouldAdvanceAfterCorrect('Choose the best answer', false, 1, false), false);
  assert.equal(shouldAdvanceAfterCorrect('Choose two', false, 1, true), false);
});
