import assert from 'node:assert/strict';
import test from 'node:test';
import { easternDateKey, weekStartKey, scheduledDate, schedulePeriod, hygieneWeekday, displayDate } from '../src/pages/admin/notebook/checklistSchedule.ts';

test('Eastern calendar rolls over at local midnight, not UTC midnight', () => {
  assert.equal(easternDateKey(new Date('2026-10-26T03:59:59Z')), '2026-10-25');
  assert.equal(easternDateKey(new Date('2026-10-26T04:00:00Z')), '2026-10-26');
  assert.equal(schedulePeriod('weekly', new Date('2026-10-26T04:00:00Z')), '2026-10-25');
});
test('weekly dates use Sunday start and cross month/year boundaries', () => {
  const now = new Date('2026-10-25T16:00:00Z');
  assert.equal(weekStartKey(now), '2026-10-25');
  assert.equal(scheduledDate(0, now), '2026-10-25');
  assert.equal(scheduledDate(6, now), '2026-10-31');
  assert.equal(weekStartKey(new Date('2027-01-01T18:00:00Z')), '2026-12-27');
  assert.equal(displayDate('2026-10-25'), '10/25/2026');
});
test('Eastern daylight saving transitions do not shift calendar dates', () => {
  assert.equal(easternDateKey(new Date('2026-11-02T04:59:59Z')), '2026-11-01');
  assert.equal(easternDateKey(new Date('2026-11-02T05:00:00Z')), '2026-11-02');
  assert.equal(easternDateKey(new Date('2026-03-09T03:59:59Z')), '2026-03-08');
  assert.equal(easternDateKey(new Date('2026-03-09T04:00:00Z')), '2026-03-09');
  assert.equal(weekStartKey(new Date('2026-11-01T04:00:00Z')), '2026-11-01');
});
test('routine chores map to the chosen weekdays and explicit weekday labels take precedence', () => {
  const tasks=['Wash bedsheets and pillowcases.', 'Wash and condition hair when due; gently detangle.', 'Clean and trim fingernails.', 'Clean combs, brushes, and styling tools.', 'Wash hats, durags, and bonnets as needed.', 'Maintain facial hair with clean tools.', 'Clean shoes as needed and let them dry between wears.', 'Check supplies and replace anything running low.'];
  assert.deepEqual(tasks.map(hygieneWeekday), [0,0,1,2,3,4,5,6]);
  assert.equal(hygieneWeekday('Tuesday — Wash bedsheets'), 2);
  assert.equal(hygieneWeekday('Unrelated task'), null);
});
