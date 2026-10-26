export const fitnessNumberKeys = ['age', 'weight', 'goal', 'idealGoal', 'adjustedGoal', 'height', 'maintenance', 'calories', 'alternateCalories', 'weeklyRate', 'protein', 'carbs', 'sugar', 'fat', 'saturatedFat', 'water', 'activityMin', 'activityMax', 'squatGoal', 'pushupGoal'] as const;
export type FitnessNumberKey = typeof fitnessNumberKeys[number];
export type FitnessValues = Partial<Record<FitnessNumberKey, number>> & { gender?: string; goalMode?: 'custom' | 'ideal' | 'adjusted' };
export const fitnessLabels = { age: 'Age (years)', gender: 'Gender', weight: 'Weight (lb)', goal: 'Selected goal weight (lb)', idealGoal: 'Ideal weight goal (lb)', adjustedGoal: 'Adjusted weight goal (lb)', height: 'Height (ft & in)', bmi: 'BMI', remaining: 'Weight to lose (lb)', idealRemaining: 'Weight to ideal goal (lb)', adjustedRemaining: 'Weight to adjusted goal (lb)', calories: 'Calories per day', alternateCalories: 'Alternate calories per day', maintenance: 'Maintenance calories', deficit: 'Daily calorie deficit', alternateDeficit: 'Alternate daily deficit', caloriePercent: 'Calorie target (% of maintenance)', weeklyRate: 'Planned loss (lb/week)', estimatedWeeks: 'Arithmetic timeline (weeks)', protein: 'Protein (g)', carbs: 'Carbs (g)', sugar: 'Sugar limit (g/day)', fat: 'Fat (g)', saturatedFat: 'Saturated fat limit (g/day)', macroCalories: 'Calories from macros', macroDifference: 'Macros minus calorie target', water: 'Water (US fl oz)', liters: 'Water (liters)', activityMin: 'Weekly activity minimum (minutes)', activityMax: 'Weekly activity maximum (minutes)', squatGoal: 'Squat goal (reps)', pushupGoal: 'Push-up goal (reps)' };
export type FitnessKey = keyof typeof fitnessLabels;
export const numberText = (value: number | undefined) => value === undefined || !Number.isFinite(value) ? 'Not entered' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
export function cleanFitnessValues(raw: unknown): FitnessValues {
  if (!raw || typeof raw !== 'object') return {};
  const result: FitnessValues = {};
  for (const key of fitnessNumberKeys) {
    const value = (raw as FitnessValues)[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e7 && (!['weight', 'goal', 'idealGoal', 'adjustedGoal', 'height', 'weeklyRate'].includes(key) || value > 0) && (key !== 'age' || (Number.isInteger(value) && value >= 1 && value <= 120))) result[key] = value;
  }
  const extra = raw as FitnessValues;
  if (typeof extra.gender === 'string' && extra.gender.trim()) result.gender = extra.gender.slice(0, 80);
  if (extra.goalMode && ['custom', 'ideal', 'adjusted'].includes(extra.goalMode)) result.goalMode = extra.goalMode;
  if (result.goalMode === 'ideal') result.goal = result.idealGoal;
  if (result.goalMode === 'adjusted') result.goal = result.adjustedGoal;
  return result;
}
export function calculateFitness(values: FitnessValues): Partial<Record<Exclude<FitnessKey, 'gender'>, number>> & { gender?: string } {
  const v = cleanFitnessValues(values);
  const result: Partial<Record<Exclude<FitnessKey, 'gender'>, number>> & { gender?: string } = {};
  for (const key of fitnessNumberKeys) if (v[key] !== undefined) result[key] = v[key];
  if (v.gender) result.gender = v.gender;
  if (v.weight !== undefined && v.height) result.bmi = (v.weight * 0.45359237) / (v.height * 0.0254) ** 2;
  if (v.weight !== undefined && v.goal !== undefined) result.remaining = Math.max(0, v.weight - v.goal);
  if (v.weight !== undefined && v.idealGoal !== undefined) result.idealRemaining = Math.max(0, v.weight - v.idealGoal);
  if (v.weight !== undefined && v.adjustedGoal !== undefined) result.adjustedRemaining = Math.max(0, v.weight - v.adjustedGoal);
  if (v.weeklyRate && result.remaining !== undefined) result.estimatedWeeks = result.remaining / v.weeklyRate;
  if (v.maintenance !== undefined && v.alternateCalories !== undefined) result.alternateDeficit = v.maintenance - v.alternateCalories;
  if (v.maintenance && v.calories !== undefined) result.caloriePercent = v.calories / v.maintenance * 100;
  if (v.maintenance !== undefined && v.calories !== undefined) result.deficit = v.maintenance - v.calories;
  if (v.protein !== undefined && v.carbs !== undefined && v.fat !== undefined) {
    result.macroCalories = v.protein * 4 + v.carbs * 4 + v.fat * 9;
    if (v.calories !== undefined) result.macroDifference = result.macroCalories - v.calories;
  }
  if (v.water !== undefined) result.liters = v.water * 0.0295735295625;
  return result;
}
export type TaskCalculation = { kind: 'shopping' | 'workout'; a: number; b: number; unit: string };
export function validTaskCalculation(value: unknown): value is TaskCalculation {
  if (!value || typeof value !== 'object') return false;
  const v = value as TaskCalculation;
  return ['shopping', 'workout'].includes(v.kind) && [v.a, v.b].every(n => Number.isFinite(n) && n >= 0 && n <= 1e7) && typeof v.unit === 'string' && v.unit.length <= 40;
}
export function calculationText(v: TaskCalculation): string {
  return v.kind === 'shopping' ? `${numberText(v.a)} × $${numberText(v.b)} = $${numberText(v.a * v.b)}` : `${numberText(v.a)} sets/rounds × ${numberText(v.b)} ${v.unit || 'reps'} = ${numberText(v.a * v.b)} ${v.unit || 'reps'} total`;
}

/** Stored heights stay in inches so existing notes and BMI calculations need no migration. */
export function parseFeetInches(text: string): number | undefined {
  const normalized = text.trim().replace(/[’′]/g, "'").replace(/[”″]/g, '"');
  const match = normalized.match(/^(\d+)\s*(?:'|ft|feet)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inches)?)?$/i);
  if (!match) return undefined;
  const inches = Number(match[2] ?? 0);
  const total = Number(match[1]) * 12 + inches;
  return inches < 12 && total > 0 && total <= 1e7 ? total : undefined;
}
export function formatFeetInches(height: number | undefined): string {
  if (height === undefined || !Number.isFinite(height) || height <= 0) return '';
  const rounded = Math.round(height * 10000) / 10000;
  const feet = Math.floor(rounded / 12);
  const inches = Number((rounded - feet * 12).toFixed(4));
  return `${feet}'${inches}"`;
}
export function fitnessValueText(key: FitnessKey, value: number | string | undefined): string {
  if (typeof value === 'string') return value || 'Not entered';
  return key === 'height' ? formatFeetInches(value) || 'Not entered' : numberText(value);
}
