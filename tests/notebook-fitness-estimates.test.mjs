import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEstimates, macroSplit, bmiCategory } from '../src/pages/admin/notebook/fitnessEstimates.ts';
import { cleanFitnessValues, calculateFitness } from '../src/pages/admin/notebook/fitnessCalculations.ts';
const near = (a,b) => assert(Math.abs(a-b) < 1e-7, `${a} != ${b}`);
const profile = { age: 25, gender: 'Male', height: 70, weight: 165, activityFactor: 1.55 };
test('all four supplied ideal-weight equations match the 5ft10 male example', () => {
  const r = calculateEstimates(profile);
  near(r.robinson, 71/.45359237); near(r.miller, 70.3/.45359237);
  near(r.devine, 73/.45359237); near(r.hamwi, 75/.45359237);
  near(calculateEstimates({ ...profile, formulaSex: 'female' }).devine, 68.5/.45359237);
  assert.equal(calculateEstimates({ ...profile, height: 59 }).devine, undefined);
  assert.equal(calculateEstimates({ ...profile, age: 17 }).devine, undefined);
});
test('energy equations, percent body fat, and activity apply independently', () => {
  const kg = 165*.45359237, cm = 70*2.54;
  const r = calculateEstimates(profile);
  near(r.restingCalories, 10*kg + 6.25*cm - 5*25 + 5);
  near(r.estimatedMaintenance, r.restingCalories*1.55);
  near(calculateEstimates({ ...profile, formulaSex: 'female', energyFormula: 'harris' }).restingCalories, 9.247*kg+3.098*cm-4.33*25+447.593);
  near(calculateEstimates({ ...profile, energyFormula: 'katch', bodyFat: 20 }).restingCalories, 370+21.6*.8*kg);
  assert.equal(calculateEstimates({ ...profile, energyFormula: 'katch' }).restingCalories, undefined);
  assert.equal(calculateEstimates({ ...profile, activityFactor: undefined }).estimatedMaintenance, undefined);
  assert.equal(calculateEstimates({ ...profile, age: 10 }).restingCalories, undefined);
});
test('BMI category boundaries and weights are age-aware and use unrounded BMI', () => {
  assert.equal(bmiCategory(24.9999, 25), 'Healthy weight');
  assert.equal(bmiCategory(25, 25), 'Overweight'); assert.equal(bmiCategory(40, 25), 'Obesity, class 3');
  assert.match(bmiCategory(23, 19), /20/);
  near(calculateEstimates(profile).bmiHigh, 25*(70*.0254)**2/.45359237);
});
test('enabled links update downstream goals, calories, macros and water in order', () => {
  const input = { ...profile, idealFormula: 'hamwi', autoIdeal: true, goalMode: 'ideal', autoMaintenance: true, calorieMode: 'loss', weeklyRate: 1, autoMacros: true, proteinPercent: 30, carbPercent: 40, fatPercent: 30, autoWater: true, waterRate: 30, bottleSize: 16.9 };
  const first = cleanFitnessValues(input), second = cleanFitnessValues({ ...first, weight: 180, height: 72, age: 26 });
  assert.notEqual(first.goal, second.goal); assert.notEqual(first.calories, second.calories); assert.notEqual(first.water, second.water);
  near(second.calories, second.maintenance-500); near(second.protein*4+second.carbs*4+second.fat*9, second.calories);
  near(second.goal, calculateEstimates(second).hamwi); near(calculateFitness(second).bottles, second.water/16.9);
  assert.deepEqual(cleanFitnessValues(second), second);
  const manual = cleanFitnessValues({ ...second, autoMaintenance: false, autoIdeal: false, calorieMode: 'manual', autoMacros: false, autoWater: false, weight: 200 });
  assert.equal(manual.calories, second.calories); assert.equal(manual.water, second.water);
});
test('bad splits, impossible targets, and unavailable inputs do not produce invented values', () => {
  assert.equal(macroSplit({ calories: 2000, proteinPercent: 40, carbPercent: 40, fatPercent: 40 }), null);
  assert.equal(cleanFitnessValues({ autoMacros: true, calories: 2000 }).protein, undefined);
  assert.equal(cleanFitnessValues({ maintenance: 1000, calorieMode: 'loss', weeklyRate: 3 }).calories, undefined);
  assert.equal(cleanFitnessValues({ autoWater: true, waterRate: 30 }).water, undefined);
});
test('water follows the stated 30–35 rule, not the inconsistent pasted example', () => {
  const r = calculateEstimates({ age: 25, weight: 70/.45359237 });
  near(r.waterLow, 2100/29.5735295625); near(r.waterHigh, 2450/29.5735295625);
});
