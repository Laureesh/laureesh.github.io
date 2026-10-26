import assert from 'node:assert/strict';
import test from 'node:test';
import { createWeightLossHtml, weightLossDates, validPlanDate } from '../src/pages/admin/notebook/weightLossPlan.ts';
import workbook from '../src/pages/admin/notebook/weightLossWorkbook.json' with { type: 'json' };

test('original start reproduces the workbook dates and 156 sessions', () => {
  const dates = weightLossDates('2026-10-24');
  assert.equal(dates.length, 156);
  assert.deepEqual(dates.slice(0, 4), ['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02']);
  assert.equal(dates.at(-1), '2027-10-22');
});
test('changing the start shifts every date while keeping M/W/F, including leap years and DST', () => {
  for (const start of ['2026-12-31', '2028-02-29', '2026-03-06', '2026-11-01']) {
    const dates = weightLossDates(start);
    assert.equal(new Set(dates).size, 156);
    assert(dates.every(date => date >= start && [1, 3, 5].includes(new Date(date + 'T12:00:00Z').getUTCDay())));
    assert(dates.every((date, index) => !index || date > dates[index - 1]));
  }
  assert.equal(weightLossDates('2026-10-28')[0], '2026-10-28');
  assert.equal(validPlanDate('2026-02-30'), false);
  assert.equal(validPlanDate(''), false);
  assert.throws(() => weightLossDates('invalid'));
});
test('note preserves workouts, pushup steps, meals and links with separate completion boxes', () => {
  const html = createWeightLossHtml();
  assert.equal((html.match(/data-weightloss-week=/g) ?? []).length, 52);
  assert.equal((html.match(/data-weightloss-session=/g) ?? []).length, 156 + 33);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 156 + 33 + 5);
  assert.equal((html.match(/data-checklist-repeat="daily"/g) ?? []).length, 1);
  assert.equal(workbook.pushups.length, 33);
  assert.match(html, /Late Snack \(optional\)/);
  assert.match(html, /2,300 kcal/);
  assert.match(html, /65g/);
  assert.match(html, /hybridcalisthenics.com/);
  assert.match(html, /youtube.com/);
  assert.match(html, /Plank Hold \(30 or more\)/);
  assert.match(html, /data-weightloss-start="2026-10-24"/);
});

test('dated workout tasks keep completion and use their shifted date for due status', async () => {
  const { taskDueLabel, scheduledCheckState } = await import('../src/pages/admin/notebook/checklistSchedule.ts');
  const attrs = new Map([['data-checklist-date', '2026-10-28'], ['checked', '']]);
  const box = { getAttribute: key => attrs.get(key) ?? null, hasAttribute: key => attrs.has(key), closest: () => null };
  assert.equal(scheduledCheckState(box, new Date('2027-01-01T12:00:00Z')), true);
  assert.equal(taskDueLabel(box, new Date('2026-10-28T12:00:00Z')).status, 'Done');
  attrs.delete('checked');
  assert.equal(taskDueLabel(box, new Date('2026-10-28T12:00:00Z')).status, 'Due today');
  attrs.set('data-checklist-date', '2026-11-02');
  assert.equal(taskDueLabel(box, new Date('2026-10-28T12:00:00Z')).status, 'Upcoming');
  assert.equal(taskDueLabel(box, new Date('2026-11-03T12:00:00Z')).status, 'Overdue');
});
