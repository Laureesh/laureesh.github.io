import type { FitnessValues } from './fitnessCalculations.ts';
export const idealFormulas = ['robinson', 'miller', 'devine', 'hamwi'] as const;
export type IdealFormula = typeof idealFormulas[number];
export type EstimateSettings = { formulaSex?: 'male' | 'female'; energyFormula?: 'mifflin' | 'harris' | 'katch'; idealFormula?: IdealFormula; autoIdeal?: boolean; autoMaintenance?: boolean; autoMacros?: boolean; autoWater?: boolean; calorieMode?: 'manual' | 'maintain' | 'loss' };
export const estimateLabels = { robinson: 'Robinson estimate (lb)', miller: 'Miller estimate (lb)', devine: 'Devine estimate (lb)', hamwi: 'Hamwi estimate (lb)', bmiLow: 'Adult BMI range lower weight (lb)', bmiHigh: 'Adult BMI range upper boundary (lb)', bmiPrime: 'BMI prime', ponderalIndex: 'Ponderal index', restingCalories: 'Estimated resting calories', estimatedMaintenance: 'Estimated maintenance calories', waterLow: 'Water formula lower estimate (US fl oz)', waterHigh: 'Water formula upper estimate (US fl oz)', bottles: 'Bottles for water target' };
export function formulaSex(v: FitnessValues) { return v.formulaSex ?? (v.gender?.trim().toLowerCase() === 'male' ? 'male' : v.gender?.trim().toLowerCase() === 'female' ? 'female' : undefined); }
export function bmiCategory(bmi: number | undefined, age: number | undefined): string {
  if (bmi === undefined || age === undefined || age < 20) return 'Adult categories require age 20 or older.';
  return bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy weight' : bmi < 30 ? 'Overweight' : bmi < 35 ? 'Obesity, class 1' : bmi < 40 ? 'Obesity, class 2' : 'Obesity, class 3';
}
export function macroSplit(v: FitnessValues) {
  const { calories, proteinPercent: p, carbPercent: c, fatPercent: f } = v;
  if (calories === undefined || p === undefined || c === undefined || f === undefined || [p,c,f].some(n => n < 0 || n > 100) || Math.abs(p+c+f-100) > .001) return null;
  return { protein: calories*p/400, carbs: calories*c/400, fat: calories*f/900 };
}
export function calculateEstimates(v: FitnessValues): Partial<Record<keyof typeof estimateLabels, number>> {
  const r: Partial<Record<keyof typeof estimateLabels, number>> = {};
  const sex = formulaSex(v), adult = v.age !== undefined && v.age >= 18;
  const kg = v.weight === undefined ? undefined : v.weight * .45359237;
  const meters = v.height === undefined ? undefined : v.height * .0254;
  if (meters && kg) { r.bmiPrime = kg / meters ** 2 / 25; r.ponderalIndex = kg / meters ** 3; }
  if (meters && v.age !== undefined && v.age >= 20) { r.bmiLow = 18.5 * meters ** 2 / .45359237; r.bmiHigh = 25 * meters ** 2 / .45359237; }
  if (adult && sex && v.height !== undefined && v.height >= 60) {
    const above = v.height - 60, male = sex === 'male';
    r.robinson = ((male ? 52 : 49) + (male ? 1.9 : 1.7) * above) / .45359237;
    r.miller = ((male ? 56.2 : 53.1) + (male ? 1.41 : 1.36) * above) / .45359237;
    r.devine = ((male ? 50 : 45.5) + 2.3 * above) / .45359237;
    r.hamwi = ((male ? 48 : 45.5) + (male ? 2.7 : 2.2) * above) / .45359237;
  }
  if (adult && kg) {
    if (v.energyFormula === 'katch') {
      if (v.bodyFat !== undefined && v.bodyFat > 0 && v.bodyFat < 100) r.restingCalories = 370 + 21.6 * (1 - v.bodyFat / 100) * kg;
    } else if (sex && meters) {
      const cm = meters * 100, male = sex === 'male', age = v.age!;
      r.restingCalories = v.energyFormula === 'harris' ? male ? 13.397*kg+4.799*cm-5.677*age+88.362 : 9.247*kg+3.098*cm-4.33*age+447.593 : 10*kg+6.25*cm-5*age+(male ? 5 : -161);
    }
    if (r.restingCalories !== undefined && r.restingCalories <= 0) delete r.restingCalories;
    if (r.restingCalories && v.activityFactor !== undefined && v.activityFactor >= 1 && v.activityFactor <= 2.5) r.estimatedMaintenance = r.restingCalories*v.activityFactor;
    r.waterLow = kg * 30 / 29.5735295625;
    r.waterHigh = kg * 35 / 29.5735295625;
  }
  if (v.water !== undefined && v.bottleSize && v.bottleSize > 0) r.bottles = v.water / v.bottleSize;
  return r;
}
/** Apply enabled links in dependency order; unavailable estimates stay unavailable. */
export function applyEstimateLinks(v: FitnessValues): FitnessValues {
  const next = { ...v }, estimates = calculateEstimates(v);
  if (v.autoIdeal) next.idealGoal = estimates[v.idealFormula ?? 'devine'];
  if (v.autoMaintenance) next.maintenance = estimates.estimatedMaintenance;
  if (v.calorieMode === 'maintain') next.calories = next.maintenance;
  if (v.calorieMode === 'loss') {
    const target = next.maintenance !== undefined && v.weeklyRate !== undefined ? next.maintenance - v.weeklyRate * 500 : undefined;
    next.calories = target !== undefined && target > 0 ? target : undefined;
  }
  if (v.autoMacros) { const macros = macroSplit(next); next.protein = macros?.protein; next.carbs = macros?.carbs; next.fat = macros?.fat; }
  if (v.autoWater) next.water = v.waterRate === 30 ? estimates.waterLow : v.waterRate === 35 ? estimates.waterHigh : undefined;
  return next;
}
