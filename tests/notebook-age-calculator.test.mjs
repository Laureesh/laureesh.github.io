import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAge, validAgeDate } from '../src/pages/admin/notebook/ageCalculations.ts';
import { calculateFitness, cleanFitnessValues } from '../src/pages/admin/notebook/fitnessCalculations.ts';
test('matches the supplied example with calendar months and days', () => {
  const age = calculateAge('2006-11-15', '2026-03-10');
  assert.deepEqual([age.years, age.months, age.days], [19, 3, 23]);
});
test('birth is day zero, birthdays change the completed age, and weeks retain days', () => {
  const zero = calculateAge('2026-10-26', '2026-10-26');
  assert.equal(zero.totalDays, 0); assert.equal(zero.years, 0); assert.equal(zero.daysUntilBirthday, 0);
  assert.equal(calculateAge('2027-03-15', '2027-03-18').totalDays, 3);
  const before = calculateAge('2000-10-26', '2026-10-25');
  assert.equal(before.years, 25); assert.equal(before.daysUntilBirthday, 1);
  const birthday = calculateAge('2000-10-26', '2026-10-26');
  assert.equal(birthday.years, 26); assert.equal(birthday.birthdayToday, true);
  assert.equal(birthday.weeks * 7 + birthday.weekDays, birthday.totalDays);
});
test('leap-year and month-end anniversaries use the stated clamping convention', () => {
  const age = calculateAge('2000-02-29', '2025-02-28');
  assert.deepEqual([age.years, age.months, age.days], [25, 0, 0]);
  assert.equal(age.birthdayToday, true);
  assert.equal(calculateAge('2024-02-28', '2024-03-01').totalDays, 2);
  assert.deepEqual(Object.fromEntries(['years', 'months', 'days'].map(key => [key, calculateAge('2025-01-31', '2025-02-28')[key]])), { years: 0, months: 1, days: 0 });
  assert.equal(validAgeDate('2025-02-29'), false);
  assert.equal(validAgeDate('2024-02-29'), true);
  assert.equal(calculateAge('2027-01-01', '2026-01-01'), null);
});
test('birth-date mode updates linked age; manual mode remains independent', () => {
  const input = { ageMode: 'birthdate', birthDate: '2000-10-26', ageOnDate: '2026-10-25', age: 22 };
  assert.equal(cleanFitnessValues(input).age, 25);
  assert.equal(calculateFitness({ ...input, ageOnDate: '2026-10-26' }).age, 26);
  assert.equal(cleanFitnessValues({ ...input, ageMode: 'manual' }).age, 22);
  assert.equal(cleanFitnessValues({ ageMode: 'birthdate', age: 22 }).age, undefined);
  assert.equal(cleanFitnessValues({ age: 0 }).age, 0);
});
