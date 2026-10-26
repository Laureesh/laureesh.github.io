import assert from 'node:assert/strict';
import test from 'node:test';
import { checklistStatusForBoxes } from '../src/pages/admin/notebook/noteChecklistStatus.ts';
const now = new Date('2026-10-26T16:00:00Z');
function box({ checked = false, repeat, period, date, weekday, title = 'Task' } = {}) {
  const attrs = { ...(checked ? { checked: '' } : {}), 'data-checklist-period': period, 'data-checklist-date': date, 'data-checklist-weekday': weekday };
  return { getAttribute: key => attrs[key] ?? null, hasAttribute: key => attrs[key] !== undefined,
    closest: () => repeat ? { getAttribute: () => repeat } : null,
    parentElement: { textContent: title, querySelector: () => ({ textContent: title }) } };
}
test('daily hygiene checks completed yesterday become due today, even in unopened notes', () => {
  const result = checklistStatusForBoxes([box({ repeat: 'daily', checked: true, period: '2026-10-25', title: 'Brush teeth' })], now);
  assert.equal(result[0].label, '1 due today');
  assert.equal(result[0].detail, 'Brush teeth');
});
test('today can be complete while earlier missed chores remain visible', () => {
  const result = checklistStatusForBoxes([
    box({ repeat: 'daily', checked: true, period: '2026-10-26' }),
    box({ repeat: 'weekly', weekday: '0', title: 'Laundry' }),
    box({ repeat: 'weekly', weekday: '5' }),
  ], now);
  assert.deepEqual(result.map(item => item.label), ['✓ All done today', '1 overdue']);
});
test('meals and workout tasks count together; future workouts and undated milestones do not', () => {
  const result = checklistStatusForBoxes([box({ repeat: 'daily' }), box({ date: '2026-10-26' }), box({ date: '2026-10-28' }), box()], now);
  assert.equal(result[0].label, '2 due today');
});
test('rest days do not claim tasks were completed', () => {
  assert.equal(checklistStatusForBoxes([box({ date: '2026-10-28' })], now)[0].label, 'Nothing due today');
  assert.equal(checklistStatusForBoxes([box({ date: '2026-10-25' })], now)[1].label, '1 overdue');
});
test('unscheduled checklists show remaining tasks and completed checklists show a checkmark', () => {
  assert.equal(checklistStatusForBoxes([box(), box({ checked: true })], now)[0].label, '1 task left');
  assert.equal(checklistStatusForBoxes([box({ checked: true })], now)[0].label, '✓ All done');
  assert.deepEqual(checklistStatusForBoxes([], now), []);
});
test('status changes at Eastern midnight and after a weekly reset', () => {
  const daily = box({ repeat: 'daily', checked: true, period: '2026-10-25' });
  assert.equal(checklistStatusForBoxes([daily], new Date('2026-10-26T03:59:00Z'))[0].kind, 'done');
  assert.equal(checklistStatusForBoxes([daily], new Date('2026-10-26T04:00:00Z'))[0].kind, 'due');
  const weekly = box({ repeat: 'weekly', weekday: '0', checked: true, period: '2026-10-25' });
  assert.equal(checklistStatusForBoxes([weekly], new Date('2026-11-01T16:00:00Z'))[0].kind, 'due');
});
