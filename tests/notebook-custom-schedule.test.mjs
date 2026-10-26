import assert from 'node:assert/strict';
import test from 'node:test';
import { customTaskSchedule, editableTaskSchedule, nextTaskDate, scheduleError } from '../src/pages/admin/notebook/customTaskSchedule.ts';
import { scheduledCheckState, stampScheduledCheck, taskDueLabel } from '../src/pages/admin/notebook/checklistSchedule.ts';
import { setBoxTaskSchedule } from '../src/pages/admin/notebook/checklistDocument.ts';
import { checklistStatusForBoxes } from '../src/pages/admin/notebook/noteChecklistStatus.ts';
const now = new Date('2026-10-26T16:00:00Z');
const schedule = { repeat: 'weekdays', start: '2026-10-26', end: '', days: [2, 4] };
function box(attrs = {}, repeat) {
  const values = new Map(Object.entries(attrs));
  return { getAttribute: key => values.get(key) ?? null, hasAttribute: key => values.has(key), setAttribute: (key, value) => values.set(key, value), removeAttribute: key => values.delete(key), toggleAttribute: (key, on) => on ? values.set(key, '') : values.delete(key), closest: () => repeat ? { getAttribute: () => repeat } : null, parentElement: { querySelector: () => null, textContent: 'Workout' } };
}
test('selected weekdays choose the next date, with inclusive start/end and DST-safe dates', () => {
  assert.equal(nextTaskDate(schedule, '2026-10-26'), '2026-10-27');
  assert.equal(nextTaskDate(schedule, '2026-10-27'), '2026-10-27');
  assert.equal(nextTaskDate(schedule, '2026-10-28'), '2026-10-29');
  assert.equal(nextTaskDate({ ...schedule, end: '2026-10-29' }, '2026-10-30'), null);
  assert.equal(nextTaskDate({ ...schedule, days: [0] }, '2026-11-01'), '2026-11-01');
  assert.equal(nextTaskDate({ ...schedule, days: [0] }, '2026-11-02'), '2026-11-08');
});
test('invalid dates, empty weekdays and date ranges with no occurrence are rejected', () => {
  assert(scheduleError({ ...schedule, days: [] }));
  assert(scheduleError({ ...schedule, start: '2026-02-30' }));
  assert(scheduleError({ ...schedule, end: '2026-10-25' }));
  assert(scheduleError({ ...schedule, end: '2026-10-26' }));
  assert.equal(scheduleError({ repeat: 'never', start: '', end: '', days: [] }), '');
  assert.equal(customTaskSchedule(box({ 'data-task-schedule': '{broken' })), null);
});
test('custom schedules override inherited daily recurrence and survive serialization', () => {
  const task = box({}, 'daily');
  setBoxTaskSchedule(task, schedule, now);
  assert.deepEqual(customTaskSchedule(task), schedule);
  const restored = box({ 'data-task-schedule': task.getAttribute('data-task-schedule') }, 'daily');
  assert.equal(taskDueLabel(restored, now).date, '2026-10-27');
  assert.equal(taskDueLabel(restored, now).status, 'Upcoming');
  stampScheduledCheck(restored, true, new Date('2026-10-27T16:00:00Z'));
  assert.equal(scheduledCheckState(restored, new Date('2026-10-27T23:00:00Z')), true);
  assert.equal(scheduledCheckState(restored, new Date('2026-10-29T16:00:00Z')), false);
});
test('moving a due date resets completion; keeping its date preserves completion', () => {
  const task = box({ 'data-checklist-date': '2026-10-26', checked: '' });
  setBoxTaskSchedule(task, { repeat: 'never', start: '2026-10-26', end: '', days: [] }, now);
  assert.equal(scheduledCheckState(task, now), true);
  setBoxTaskSchedule(task, { repeat: 'never', start: '2026-10-28', end: '', days: [] }, now);
  assert.equal(scheduledCheckState(task, now), false);
  assert.equal(taskDueLabel(task, now).date, '2026-10-28');
  // Moving the original plan does not replace the override.
  task.setAttribute('data-checklist-date', '2027-01-01');
  assert.equal(taskDueLabel(task, now).date, '2026-10-28');
});
test('clearing a schedule overrides both inherited repeat and original plan dates', () => {
  const task = box({ 'data-checklist-date': '2026-10-25', checked: '' }, 'daily');
  setBoxTaskSchedule(task, { repeat: 'never', start: '', end: '', days: [] }, now);
  assert.equal(taskDueLabel(task, now), null);
  assert.equal(scheduledCheckState(task, now), false); // inherited daily check was not stamped
  assert.equal(editableTaskSchedule(task, '2026-10-26').repeat, 'never');
});
test('ended schedules do not create overdue badges, and one-time dates still do', () => {
  const task = box();
  setBoxTaskSchedule(task, { ...schedule, start: '2026-10-01', end: '2026-10-25' }, now);
  assert.equal(taskDueLabel(task, now).status, 'Ended');
  assert.deepEqual(checklistStatusForBoxes([task], now).map(badge => badge.label), ['Nothing due today']);
  setBoxTaskSchedule(task, { repeat: 'never', start: '2026-10-25', end: '', days: [] }, now);
  assert.equal(checklistStatusForBoxes([task], now)[1].label, '1 overdue');
});
test('legacy schedules prefill the editor without changing the saved task', () => {
  assert.equal(editableTaskSchedule(box({}, 'daily'), '2026-10-26').repeat, 'daily');
  assert.deepEqual(editableTaskSchedule(box({ 'data-checklist-weekday': '3' }, 'weekly'), '2026-10-26').days, [3]);
  assert.equal(editableTaskSchedule(box({ 'data-checklist-date': '2026-11-01' }), '2026-10-26').start, '2026-11-01');
});
