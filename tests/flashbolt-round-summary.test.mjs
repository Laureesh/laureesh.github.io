import assert from 'node:assert/strict';
import test from 'node:test';
import { learnRoundSummary } from '../src/pages/admin/flashbolt/learnRoundSummary.ts';

test('current question remains outstanding until answered', () => {
  assert.deepEqual(learnRoundSummary(1, 7, 1, false, 0, 153), {completed:1,remaining:6,scheduledRounds:23,percent:14});
  assert.equal(learnRoundSummary(1, 7, 1, true, 0, 154).remaining, 5);
});
test('queued retries are included and do not create a new round', () => {
  assert.equal(learnRoundSummary(1, 7, 6, true, 2, 0).remaining, 2);
  assert.equal(learnRoundSummary(1, 2, 0, false, 0, 0).remaining, 2);
  assert.equal(learnRoundSummary(1, 2, 0, false, 0, 0).scheduledRounds, 1);
});
test('scheduled rounds include partial batches and completed rounds', () => {
  assert.equal(learnRoundSummary(4, 7, 0, false, 0, 8).scheduledRounds, 6);
  assert.equal(learnRoundSummary(4, 1, 0, true, 0, 0).remaining, 0);
  assert.equal(learnRoundSummary(1, 0, 0, false, 0, 0).percent, 0);
});
