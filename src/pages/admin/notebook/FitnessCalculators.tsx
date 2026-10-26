import { calculateFitness, fitnessLabels, numberText, type FitnessValues } from './fitnessCalculations';
import { readFitnessValues, refreshFitnessDocument } from './fitnessDocument';

type Props = { html: string; onChange: (html: string) => void };
export default function FitnessCalculators({ html, onChange }: Props) {
  const values = readFitnessValues(html);
  const result = calculateFitness(values);
  const update = (next: FitnessValues) => onChange(refreshFitnessDocument(html, next));
  const field = (key: keyof FitnessValues, label = fitnessLabels[key], factor = 1) => <label>{label}<input type="number" min={['weight', 'goal', 'height'].includes(key) ? '0.01' : '0'} max={1e7 / factor} step="any" value={values[key] === undefined ? '' : Number((values[key]! / factor).toFixed(4))} placeholder="Enter a value" onChange={event => {
    if (event.target.value && !event.target.validity.valid) return;
    update({ ...values, [key]: event.target.value === '' ? undefined : Number(event.target.value) * factor });
  }} /></label>;
  const output = (label: string, value: number | undefined) => <p><strong>{label}:</strong> {numberText(value)}</p>;
  const remainingCarbs = values.calories !== undefined && values.protein !== undefined && values.fat !== undefined ? (values.calories - values.protein * 4 - values.fat * 9) / 4 : undefined;
  return <details className="fitness-calculators" open>
    <summary>My values & calculators</summary>
    <p>Values save with this note. Changing an input updates its conversions, totals, and every task linked to that value. Use <strong>Edit task → Linked values</strong> to show them in any checklist.</p>
    <p>Your 2024 records remain historical. Enter your current values here, or load the old numbers as a starting point and revise them.</p>
    <button type="button" onClick={() => update({ weight: 271.4, goal: 205, height: 75.5, maintenance: 2891, calories: 2391, protein: 160, carbs: 335, fat: 54, water: 152.5, ...values })}>Fill empty inputs with 2024 values</button>
    <fieldset><legend>Measurements & goal</legend><div className="fitness-fields">{field('weight')}{field('weight', 'Weight (kg)', 1 / 0.45359237)}{field('goal')}{field('goal', 'Goal weight (kg)', 1 / 0.45359237)}{field('height')}{field('height', 'Height (cm)', 1 / 2.54)}</div>
      {output('BMI', result.bmi)}{output('Weight remaining (lb)', result.remaining)}
      <p>Height example: 6 ft 3.5 in = 75.5 inches. BMI = kilograms ÷ meters²; it is a screening measure. <a href="https://www.cdc.gov/bmi/adult-calculator/">CDC adult BMI calculator</a></p>
    </fieldset>
    <fieldset><legend>Calories & macros</legend><div className="fitness-fields">{field('maintenance')}{field('calories')}<label>Daily deficit (maintenance − target)<input type="number" step="any" disabled={values.maintenance === undefined} value={result.deficit ?? ''} onChange={event => {
      const deficit = Number(event.target.value);
      if (event.target.value && Number.isFinite(deficit) && values.maintenance !== undefined && values.maintenance - deficit >= 0 && values.maintenance - deficit <= 1e7) update({ ...values, calories: values.maintenance - deficit });
    }} /></label>{field('protein')}{field('carbs')}{field('fat')}</div>
      {output('Calories from macros (4 × protein + 4 × carbs + 9 × fat)', result.macroCalories)}
      {output('Macros minus calorie target (0 means matched)', result.macroDifference)}
      <div className="fitness-actions"><button type="button" disabled={result.macroCalories === undefined || result.macroCalories > 1e7} onClick={() => update({ ...values, calories: result.macroCalories })}>Use macro total as calorie target</button><button type="button" disabled={remainingCarbs === undefined || remainingCarbs < 0 || remainingCarbs > 1e7} onClick={() => update({ ...values, carbs: remainingCarbs })}>Calculate carbs to match target</button></div>
      {remainingCarbs !== undefined && remainingCarbs < 0 && <p role="status">Protein and fat already exceed your calorie target. Change those inputs before calculating carbs.</p>}
      <p>These calculate your entered numbers, not a recommended calorie target or promised weight-loss date. Sugar is part of carbs; saturated fat is part of fat. <a href="https://www.nal.usda.gov/programs/fnic">USDA macro energy values</a> · <a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner">NIH Body Weight Planner</a></p>
    </fieldset>
    <fieldset><legend>Hydration conversion</legend><div className="fitness-fields">{field('water')}{field('water', 'Water (liters)', 1 / 0.0295735295625)}</div><p>A unit conversion of your entry, not a suggested intake.</p></fieldset>
  </details>;
}
