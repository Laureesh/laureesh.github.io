import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFitness, cleanFitnessValues, calculationText, validTaskCalculation } from '../src/pages/admin/notebook/fitnessCalculations.ts';
test('measurements, calorie deficit and macro comparisons share their entered values', () => {
  const v = { weight: 271.4, goal: 205, height: 75.5, maintenance: 2891, calories: 2391, protein: 160, carbs: 335, fat: 54, water: 152.5 };
  const r = calculateFitness(v);
  assert(Math.abs(r.bmi - 33.474) < .01);
  assert(Math.abs(r.remaining - 66.4) < .001);
  assert.equal(r.deficit, 500); assert.equal(r.macroCalories, 2466); assert.equal(r.macroDifference, 75);
  assert(Math.abs(r.liters - 4.51) < .01);
  const changed = calculateFitness({ ...v, calories: 2466, goal: 228 });
  assert.equal(changed.macroDifference, 0); assert.equal(changed.deficit, 425);
  assert(Math.abs(changed.remaining - 43.4) < .001);
});
test('missing values stay unknown, invalid numbers are ignored, zero macros work', () => {
  assert.deepEqual(calculateFitness({}), {});
  assert.deepEqual(cleanFitnessValues({ weight: 0, height: -1, calories: Infinity, fat: '54', carbs: NaN }), {});
  assert.equal(calculateFitness({ protein: 0, carbs: 0, fat: 0 }).macroCalories, 0);
  assert.equal(calculateFitness({ weight: 200, goal: 205 }).remaining, 0);
  assert.equal(calculateFitness({ maintenance: 2000, calories: 2500 }).deficit, -500);
});
test('task calculators distinguish quantities, costs and workout units', () => {
  assert.equal(calculationText({ kind: 'shopping', a: 20, b: 1, unit: '' }), '20 × $1 = $20');
  assert.equal(calculationText({ kind: 'workout', a: 3, b: 15, unit: 'reps per leg' }), '3 sets/rounds × 15 reps per leg = 45 reps per leg total');
  assert.equal(validTaskCalculation({ kind: 'shopping', a: NaN, b: 1, unit: '' }), false);
});

test('height accepts feet/inches notation and keeps the existing stored inches', async () => {
  const { parseFeetInches, formatFeetInches, fitnessValueText } = await import('../src/pages/admin/notebook/fitnessCalculations.ts');
  for (const text of ['6\'3.5"', '6 ft 3.5 in', '6′3.5″', '6 feet 3.5 inches']) assert.equal(parseFeetInches(text), 75.5);
  assert.equal(parseFeetInches("6'"), 72);
  assert.equal(formatFeetInches(75.5), '6\'3.5"');
  assert.equal(formatFeetInches(72), '6\'0"');
  assert.equal(formatFeetInches(undefined), '');
  assert.equal(fitnessValueText('height', 75.5), '6\'3.5"');
  for (const invalid of ['', '75.5', '6\'12"', '-6\'3"', '6\'3.', '0\'0"', 'six feet']) assert.equal(parseFeetInches(invalid), undefined);
  assert.equal(calculateFitness({ weight: 271.4, height: parseFeetInches('6\'3.5"') }).bmi, calculateFitness({ weight: 271.4, height: 75.5 }).bmi);
});
