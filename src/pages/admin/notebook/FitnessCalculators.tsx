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
  return <details className="fitness-calculators" open>
    <summary>My values & calculators</summary>
    <p>Values save with this note. Changing an input updates its conversions, totals, and every task linked to that value. Use <strong>Edit task → Linked values</strong> to show them in any checklist.</p>
    <p>Your 2024 records remain historical. Enter your current values here, or load the old numbers as a starting point and revise them.</p>
    <button type="button" onClick={() => update({ age: 22, gender: 'Male', weight: 271.4, goal: 205, idealGoal: 205, adjustedGoal: 228, height: 75.5, maintenance: 2891, calories: 2391, alternateCalories: 1891, weeklyRate: 1, sugar: 64, saturatedFat: 27, activityMin: 150, activityMax: 300, protein: 160, carbs: 335, fat: 54, water: 152.5, ...values })}>Fill empty inputs with 2024 values</button>
    <AgeCalculator values={values} onChange={update} />
    <fieldset><legend>My profile & measurements</legend><div className="fitness-fields"><label>Gender<input type="text" maxLength={80} value={values.gender ?? ''} placeholder="Male" onChange={event => update({ ...values, gender: event.target.value })} /></label>{field('weight')}<HeightInput value={values.height} onChange={height => update({ ...values, height })} /></div>
      {output('BMI', result.bmi)}
      <p>The original age of 22 belongs to your 2024 record. Your profile feeds the formula calculators below; automatic target links are optional.</p>
      <p>BMI updates from your weight and height. It is a screening measure. <a href="https://www.cdc.gov/bmi/adult-calculator/">CDC adult BMI calculator</a></p>
    </fieldset>
    <FitnessFormulaTools values={values} onChange={update} />
    <fieldset><legend>Weight goals & timeline</legend><div className="fitness-fields">{field('idealGoal')}{field('adjustedGoal')}<label>Use for my goal<select value={values.goalMode ?? 'custom'} onChange={event => update({ ...values, goalMode: event.target.value as FitnessValues['goalMode'] })}><option value="custom">My own goal</option><option value="ideal" disabled={values.idealGoal === undefined}>Ideal weight goal</option><option value="adjusted" disabled={values.adjustedGoal === undefined}>Adjusted weight goal</option></select></label>{field('goal')}{field('weeklyRate')}</div>
      {output('Weight remaining to selected goal (lb)', result.remaining)}{output('Weight remaining to ideal goal (lb)', result.idealRemaining)}{output('Weight remaining to adjusted goal (lb)', result.adjustedRemaining)}{output('Arithmetic timeline (weeks)', result.estimatedWeeks)}
      <p>Use a manual goal or link the ideal goal to a formula above. These estimates are reference values. Timeline = pounds remaining ÷ your entered weekly rate; actual progress varies.</p>
    </fieldset>
    <fieldset><legend>Calories & macros</legend><div className="fitness-fields">{field('maintenance')}{field('calories')}<label>Daily deficit (maintenance − target)<input type="number" step="any" disabled={values.maintenance === undefined} value={result.deficit ?? ''} onChange={event => {
      const deficit = Number(event.target.value);
      if (event.target.value && Number.isFinite(deficit) && values.maintenance !== undefined && values.maintenance - deficit >= 0 && values.maintenance - deficit <= 1e7) update({ ...values, calorieMode: 'manual', calories: values.maintenance - deficit });
    }} /></label>{field('protein')}{field('carbs')}{field('sugar')}{field('fat')}{field('saturatedFat')}{field('alternateCalories')}</div>
      {output('Alternate daily deficit', result.alternateDeficit)}{output('Selected calorie target (% of maintenance)', result.caloriePercent)}
      {output('Calories from macros (4 × protein + 4 × carbs + 9 × fat)', result.macroCalories)}
      {output('Macros minus calorie target (0 means matched)', result.macroDifference)}
      <div className="fitness-actions"><button type="button" disabled={result.macroCalories === undefined || result.macroCalories > 1e7} onClick={() => update({ ...values, calorieMode: 'manual', calories: result.macroCalories })}>Use macro total as calorie target</button><button type="button" disabled={remainingCarbs === undefined || remainingCarbs < 0 || remainingCarbs > 1e7} onClick={() => update({ ...values, autoMacros: false, carbs: remainingCarbs })}>Calculate carbs to match target</button></div>
      {remainingCarbs !== undefined && remainingCarbs < 0 && <p role="status">Protein and fat already exceed your calorie target. Change those inputs before calculating carbs.</p>}
      <p>These calculate your entered numbers, not a recommended calorie target or promised weight-loss date. Sugar is part of carbs; saturated fat is part of fat. <a href="https://www.nal.usda.gov/programs/fnic">USDA macro energy values</a> · <a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner">NIH Body Weight Planner</a></p>
    </fieldset>
    <fieldset><legend>Water & movement goals</legend><div className="fitness-fields">{field('water')}{field('activityMin')}{field('activityMax')}{field('squatGoal')}{field('pushupGoal')}</div><p>Enter your own targets. Your original “100 squats & pushups” wording did not specify whether that meant 100 each, so those fields start empty.</p>{values.activityMin !== undefined && values.activityMax !== undefined && values.activityMin > values.activityMax && <p role="status">Your activity minimum is higher than your maximum. Review those entries.</p>}</fieldset>
  </details>;
}
