import assert from 'node:assert/strict';
import test from 'node:test';
import { activeAutoAdvance } from '../src/pages/admin/flashbolt/autoAdvance.ts';

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
