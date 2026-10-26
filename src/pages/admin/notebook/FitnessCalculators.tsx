import FitnessFormulaTools from './FitnessFormulaTools';
import AgeCalculator from './AgeCalculator';
import HeightInput from './HeightInput';
import { calculateFitness, fitnessLabels, numberText, type FitnessNumberKey, type FitnessValues } from './fitnessCalculations';
import { readFitnessValues, refreshFitnessDocument } from './fitnessDocument';

type Props = { html: string; onChange: (html: string) => void };
export default function FitnessCalculators({ html, onChange }: Props) {
  const values = readFitnessValues(html);
  const result = calculateFitness(values);
  const update = (next: FitnessValues) => onChange(refreshFitnessDocument(html, next));
  const field = (key: FitnessNumberKey, label = fitnessLabels[key], factor = 1) => <label>{label}<input type="number" min={key === 'age' ? '1' : ['weight', 'goal', 'idealGoal', 'adjustedGoal', 'height', 'weeklyRate'].includes(key) ? '0.01' : '0'} max={key === 'age' ? 120 : 1e7 / factor} step={['age', 'squatGoal', 'pushupGoal'].includes(key) ? '1' : 'any'} value={values[key] === undefined ? '' : Number((values[key]! / factor).toFixed(4))} placeholder="Enter a value" onChange={event => {
    if (event.target.value && !event.target.validity.valid) return;
    update({ ...values, ...(key === 'maintenance' ? { autoMaintenance: false } : {}), ...(key === 'idealGoal' ? { autoIdeal: false } : {}), ...(key === 'calories' ? { calorieMode: 'manual' as const } : {}), ...(['protein', 'carbs', 'fat'].includes(key) ? { autoMacros: false } : {}), ...(key === 'water' ? { autoWater: false } : {}), ...(key === 'goal' ? { goalMode: 'custom' as const } : {}), [key]: event.target.value === '' ? undefined : Number(event.target.value) * factor });
  }} /></label>;
  const output = (label: string, value: number | undefined) => <p><strong>{label}:</strong> {numberText(value)}</p>;
  const remainingCarbs = values.calories !== undefined && values.protein !== undefined && values.fat !== undefined ? (values.calories - values.protein * 4 - values.fat * 9) / 4 : undefined;
  return <details className="fitness-calculators fitness-simple" open>
    <summary>My profile & targets</summary>
    <p className="fitness-save-hint">Changes save automatically.</p>
    <div className="fitness-fields fitness-profile-fields">
      <AgeCalculator values={values} onChange={update} />
      <label>Gender<input type="text" maxLength={80} value={values.gender ?? ''} placeholder="Male" onChange={event => update({ ...values, gender: event.target.value })} /></label>
      {field('weight')}<HeightInput value={values.height} onChange={height => update({ ...values, height })} />
    </div>
    <div className="fitness-quick-stats"><span>BMI <strong>{numberText(result.bmi)}</strong></span><span>To goal <strong>{numberText(result.remaining)} lb</strong></span></div>
    <h3>My targets</h3>
    <div className="fitness-fields">{field('goal', 'Goal weight (lb)')}{field('calories', 'Calories (kcal/day)')}{field('protein')}{field('carbs')}{field('fat')}{field('water')}</div>
    {result.macroCalories !== undefined && <p className="fitness-save-hint">Macro total: {numberText(result.macroCalories)} kcal{result.macroDifference !== undefined && Math.abs(result.macroDifference) >= 1 ? ` · ${numberText(Math.abs(result.macroDifference))} ${result.macroDifference > 0 ? 'above' : 'below'} your calorie target` : ''}</p>}
    <details className="fitness-option"><summary>Goal options</summary>
      <div className="fitness-fields">{field('idealGoal')}{field('adjustedGoal')}<label>Track this goal<select value={values.goalMode ?? 'custom'} onChange={event => update({ ...values, goalMode: event.target.value as FitnessValues['goalMode'] })}><option value="custom">My own goal</option><option value="ideal" disabled={values.idealGoal === undefined}>Ideal weight goal</option><option value="adjusted" disabled={values.adjustedGoal === undefined}>Adjusted weight goal</option></select></label>{field('weeklyRate')}</div>
      {output('Estimated weeks at this rate', result.estimatedWeeks)}
      <small>Simple arithmetic, not a prediction of progress.</small>
    </details>
    <details className="fitness-option"><summary>Nutrition options</summary>
      <div className="fitness-fields">{field('maintenance')}{field('sugar')}{field('saturatedFat')}{field('alternateCalories')}<label>Daily calorie deficit<input type="number" step="any" disabled={values.maintenance === undefined} value={result.deficit ?? ''} onChange={event => {
        const deficit = Number(event.target.value);
        if (event.target.value && Number.isFinite(deficit) && values.maintenance !== undefined && values.maintenance - deficit >= 0 && values.maintenance - deficit <= 1e7) update({ ...values, calorieMode: 'manual', calories: values.maintenance - deficit });
      }} /></label></div>
      {output('Alternate daily deficit', result.alternateDeficit)}
      <div className="fitness-actions"><button type="button" disabled={result.macroCalories === undefined || result.macroCalories > 1e7} onClick={() => update({ ...values, calorieMode: 'manual', calories: result.macroCalories })}>Match calories to macros</button><button type="button" disabled={remainingCarbs === undefined || remainingCarbs < 0 || remainingCarbs > 1e7} onClick={() => update({ ...values, autoMacros: false, carbs: remainingCarbs })}>Calculate remaining carbs</button></div>
      {remainingCarbs !== undefined && remainingCarbs < 0 && <p role="status">Protein and fat exceed your calorie target.</p>}
      <small>Sugar is part of carbs; saturated fat is part of fat.</small>
    </details>
    <details className="fitness-option"><summary>Exercise goals</summary><div className="fitness-fields">{field('activityMin')}{field('activityMax')}{field('squatGoal')}{field('pushupGoal')}</div>{values.activityMin !== undefined && values.activityMax !== undefined && values.activityMin > values.activityMax && <p role="status">Activity minimum is higher than maximum.</p>}</details>
    <details className="fitness-option"><summary>Calculators & automatic updates</summary><FitnessFormulaTools values={values} onChange={update} /></details>
    <details className="fitness-option"><summary>Original values & help</summary>
      <p>Use your 2024 values to fill empty fields, or link a task through Edit task → Linked values.</p>
      <button type="button" onClick={() => update({ age: 22, gender: 'Male', weight: 271.4, goal: 205, idealGoal: 205, adjustedGoal: 228, height: 75.5, maintenance: 2891, calories: 2391, alternateCalories: 1891, weeklyRate: 1, sugar: 64, saturatedFat: 27, activityMin: 150, activityMax: 300, protein: 160, carbs: 335, fat: 54, water: 152.5, ...values })}>Fill empty fields from 2024</button>
      <p>Calculators provide estimates, not prescribed targets. <a href="https://www.cdc.gov/bmi/adult-calculator/">About BMI</a> · <a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner">About calorie estimates</a></p>
    </details>
  </details>;
}
