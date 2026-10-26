export type TaskSchedule = { repeat: 'never' | 'daily' | 'weekdays'; start: string; end: string; days: number[] };
export const TASK_SCHEDULE_ATTRIBUTE = 'data-task-schedule';
export function validScheduleDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9998-12-31') return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function nextTaskDate(schedule: TaskSchedule, today: string): string | null {
  if (schedule.repeat === 'never') return schedule.start || null;
  const date = new Date(`${schedule.start > today ? schedule.start : today}T12:00:00Z`);
  for (let offset = 0; offset < 7; offset++) {
    const key = date.toISOString().slice(0, 10);
    if (schedule.end && key > schedule.end) return null;
    if (schedule.repeat === 'daily' || schedule.days.includes(date.getUTCDay())) return key;
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return null;
}
export function scheduleError(schedule: TaskSchedule): string {
  if (!['never', 'daily', 'weekdays'].includes(schedule.repeat)) return 'Choose a repeat option.';
  if (schedule.start && !validScheduleDate(schedule.start)) return 'Choose a valid date.';
  if (schedule.repeat === 'never') return '';
  if (!schedule.start) return 'Choose a start date.';
  if (schedule.end && (!validScheduleDate(schedule.end) || schedule.end < schedule.start)) return 'End date must be on or after the start date.';
  if (schedule.repeat === 'weekdays' && (!schedule.days.length || schedule.days.some(day => !Number.isInteger(day) || day < 0 || day > 6))) return 'Choose at least one weekday.';
  if (!nextTaskDate(schedule, schedule.start)) return 'No selected weekday falls within these dates.';
  return '';
}
export function customTaskSchedule(box: Element): TaskSchedule | null {
  try {
    const value = JSON.parse(box.getAttribute(TASK_SCHEDULE_ATTRIBUTE) ?? 'null');
    if (!value || typeof value.start !== 'string' || typeof value.end !== 'string' || !Array.isArray(value.days)) return null;
    return scheduleError(value) ? null : value;
  } catch { return null; }
}
export function editableTaskSchedule(box: Element, today: string): TaskSchedule {
  const custom = customTaskSchedule(box);
  if (custom) return custom;
  const fixed = box.getAttribute('data-checklist-date');
  if (fixed) return { repeat: 'never', start: fixed, end: '', days: [] };
  const repeat = box.closest('ul')?.getAttribute('data-checklist-repeat');
  if (repeat === 'daily') return { repeat: 'daily', start: today, end: '', days: [] };
  const weekday = box.getAttribute('data-checklist-weekday');
  if (repeat === 'weekly' && weekday !== null && /^[0-6]$/.test(weekday)) return { repeat: 'weekdays', start: today, end: '', days: [Number(weekday)] };
  return { repeat: 'never', start: '', end: '', days: [] };
}
