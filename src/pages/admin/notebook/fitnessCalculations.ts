export type FitnessValues = Partial<Record<'weight' | 'goal' | 'height' | 'maintenance' | 'calories' | 'protein' | 'carbs' | 'fat' | 'water', number>>;
export const fitnessLabels = { weight: 'Weight (lb)', goal: 'Goal weight (lb)', height: 'Height (inches)', bmi: 'BMI', remaining: 'Weight to lose (lb)', calories: 'Calories per day', maintenance: 'Maintenance calories', deficit: 'Daily calorie deficit', protein: 'Protein (g)', carbs: 'Carbs (g)', fat: 'Fat (g)', macroCalories: 'Calories from macros', macroDifference: 'Macros minus calorie target', water: 'Water (US fl oz)', liters: 'Water (liters)' };
export type FitnessKey = keyof typeof fitnessLabels;
export const numberText = (value: number | undefined) => value === undefined || !Number.isFinite(value) ? 'Not entered' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
export function cleanFitnessValues(raw: unknown): FitnessValues {
  if (!raw || typeof raw !== 'object') return {};
  const result: FitnessValues = {};
  for (const key of ['weight', 'goal', 'height', 'maintenance', 'calories', 'protein', 'carbs', 'fat', 'water'] as const) {
    const value = (raw as FitnessValues)[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e7 && (!['weight', 'goal', 'height'].includes(key) || value > 0)) result[key] = value;
  }
  return result;
}
export function calculateFitness(values: FitnessValues): Partial<Record<FitnessKey, number>> {
  const v = cleanFitnessValues(values);
  const result: Partial<Record<FitnessKey, number>> = { ...v };
  if (v.weight !== undefined && v.height) result.bmi = (v.weight * 0.45359237) / (v.height * 0.0254) ** 2;
  if (v.weight !== undefined && v.goal !== undefined) result.remaining = Math.max(0, v.weight - v.goal);
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
