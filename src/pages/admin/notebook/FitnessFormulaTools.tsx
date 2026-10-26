import { calculateEstimates, formulaSex, idealFormulas, macroSplit, bmiCategory } from './fitnessEstimates';
import { calculateFitness, formatFeetInches, numberText, type FitnessNumberKey, type FitnessValues } from './fitnessCalculations';
type Props = { values: FitnessValues; onChange: (values: FitnessValues) => void };
export default function FitnessFormulaTools({ values: v, onChange }: Props) {
  const estimates = calculateEstimates(v), current = calculateFitness(v);
  const set = (patch: Partial<FitnessValues>) => onChange({ ...v, ...patch });
  const numeric = (key: FitnessNumberKey, label: string, min = 0, max = 100) => <label>{label}<input type="number" step="any" min={min} max={max} value={v[key] ?? ''} onChange={e => { if (e.target.validity.valid) set({ [key]: e.target.value === '' ? undefined : Number(e.target.value) }); }} /></label>;
  const flag = (key: 'autoIdeal' | 'autoMaintenance' | 'autoMacros' | 'autoWater', label: string) => <label className="fitness-auto-link"><input type="checkbox" checked={v[key] ?? false} onChange={e => set({ [key]: e.target.checked })} />{label}</label>;
  return <section className="fitness-formula-tools" aria-label="Formula calculators">
    <h3>Formula calculators</h3><p>These use your profile above. Enable a link to keep a target updated as its inputs change. Editing that target manually turns its link off.</p>
    <label>Sex used by weight and calorie formulas<select value={formulaSex(v) ?? ''} onChange={e => set({ formulaSex: e.target.value as FitnessValues['formulaSex'] || undefined })}><option value="">Select a formula</option><option value="male">Male formula</option><option value="female">Female formula</option></select></label>
    <details><summary>Ideal weight comparisons</summary>
      <p>Formula estimates for adults 18+ at least 5 feet tall. They do not account for body composition or determine your personal goal.</p>
      <table><thead><tr><th>Formula</th><th>Estimate (lb)</th></tr></thead><tbody>{idealFormulas.map(key => <tr key={key}><td>{key[0].toUpperCase() + key.slice(1)}</td><td>{numberText(estimates[key])}</td></tr>)}</tbody></table>
      <label>Formula for ideal goal<select value={v.idealFormula ?? 'devine'} onChange={e => set({ idealFormula: e.target.value as FitnessValues['idealFormula'] })}>{idealFormulas.map(key => <option key={key} value={key}>{key[0].toUpperCase() + key.slice(1)}</option>)}</select></label>
      {flag('autoIdeal', 'Keep ideal goal linked to this formula')}
      <p>Your adjusted goal stays manually entered; the supplied formulas do not define an adjusted-weight calculation. <a href="https://www.calculator.net/ideal-weight-calculator.html">Formula reference</a></p>
    </details>
    <details><summary>BMI details</summary>
      <p><strong>BMI: {numberText(current.bmi)}</strong> · {bmiCategory(current.bmi, v.age)}</p>
      {estimates.bmiLow !== undefined && <p>Weight range corresponding to adult BMI 18.5 to below 25: {numberText(estimates.bmiLow)} lb to below {numberText(estimates.bmiHigh)} lb.</p>}
      <p>BMI prime: {numberText(estimates.bmiPrime)} · Ponderal index: {numberText(estimates.ponderalIndex)} (kg/m³)</p>
      <p>BMI is a screening measure, not a diagnosis. For ages under 20, use age-specific growth charts. <a href="https://www.cdc.gov/bmi/adult-calculator/">CDC BMI reference</a></p>
    </details>
    <details><summary>Calorie estimator</summary><div className="fitness-fields">
      <label>Resting-energy equation<select value={v.energyFormula ?? 'mifflin'} onChange={e => set({ energyFormula: e.target.value as FitnessValues['energyFormula'] })}><option value="mifflin">Mifflin–St Jeor</option><option value="harris">Revised Harris–Benedict</option><option value="katch">Katch–McArdle (needs body fat)</option></select></label>
      <label>Activity estimate<select value={v.activityFactor ?? ''} onChange={e => set({ activityFactor: e.target.value ? Number(e.target.value) : undefined })}><option value="">Choose activity</option><option value="1.2">Sedentary · ×1.2</option><option value="1.375">Light activity · ×1.375</option><option value="1.55">Moderate activity · ×1.55</option><option value="1.725">High activity · ×1.725</option><option value="1.9">Very high activity · ×1.9</option></select></label>
      {v.energyFormula === 'katch' && numeric('bodyFat', 'Body fat (%)', .1, 99.9)}
      <label>Calorie target calculation<select value={v.calorieMode ?? 'manual'} onChange={e => set({ calorieMode: e.target.value as FitnessValues['calorieMode'] })}><option value="manual">Keep my manual target</option><option value="maintain">Match maintenance calories</option><option value="loss">Use my planned loss (lb/week)</option></select></label>
    </div><p>Estimated resting calories: {numberText(estimates.restingCalories)} kcal/day</p><p>Estimated maintenance: {numberText(estimates.estimatedMaintenance)} kcal/day</p>
      {flag('autoMaintenance', 'Keep maintenance calories linked to this estimate')}
      {v.calorieMode === 'loss' && <p>The loss calculation subtracts 500 × your entered lb/week from maintenance. This is rough arithmetic, not a prediction or a safe-intake assessment.</p>}
      {v.calorieMode === 'loss' && v.calories === undefined && <p role="status">Enter maintenance and a weekly loss rate that produce a positive calorie target.</p>}
      <p>Adult estimates only. Enter age, weight, height, formula sex, and activity; Katch–McArdle uses body fat instead of height and sex. <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/">Mifflin research</a> · <a href="https://www.calculator.net/calorie-calculator.html">Other equations</a> · <a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner">NIH Body Weight Planner</a></p>
    </details>
    <details><summary>Macro percentage calculator</summary><div className="fitness-fields">{numeric('proteinPercent', 'Protein (% of calories)')}{numeric('carbPercent', 'Carbs (% of calories)')}{numeric('fatPercent', 'Fat (% of calories)')}</div>
      <p>Enter your preferred split totaling 100%. Uses your current calorie target and 4/4/9 kcal per gram.</p>
      {macroSplit(v) ? <p>Protein {numberText(macroSplit(v)!.protein)} g · Carbs {numberText(macroSplit(v)!.carbs)} g · Fat {numberText(macroSplit(v)!.fat)} g</p> : <p role="status">Enter a calorie target and three percentages totaling 100%.</p>}
      {flag('autoMacros', 'Keep protein, carbs, and fat linked to this split')}
      <p>Sugar is included in carbs; saturated fat is included in fat. Their separate limits remain yours to set. <a href="https://www.nal.usda.gov/programs/fnic">USDA energy values</a></p>
    </details>
    <details><summary>Height converter (inches ↔ feet)</summary><div className="fitness-fields">{numeric('height', 'Total inches', .01, 1200)}<label>Decimal feet<input type="number" step="any" min="0.001" max="100" value={v.height === undefined ? '' : Number((v.height / 12).toFixed(5))} onChange={e => { if (e.target.validity.valid) set({ height: e.target.value ? Number(e.target.value) * 12 : undefined }); }} /></label></div><p>{formatFeetInches(v.height) || 'Enter a height'} · 12 inches = 1 foot. These inputs update your profile height.</p></details>
    <details><summary>Water estimate & bottle calculator</summary><div className="fitness-fields">
      <label>Weight-based estimate<select value={v.waterRate ?? ''} onChange={e => set({ waterRate: e.target.value ? Number(e.target.value) : undefined })}><option value="">Choose a method</option><option value="30">Lower factor · 30 mL/kg</option><option value="35">Higher factor · 35 mL/kg</option></select></label>{numeric('bottleSize', 'Bottle size (US fl oz)', .01, 1000)}
    </div><p>Formula range: {numberText(estimates.waterLow)}–{numberText(estimates.waterHigh)} US fl oz/day.</p>
      {flag('autoWater', 'Keep my water target linked to the selected formula')}
      <p>Your water target equals {numberText(estimates.bottles)} bottles of the entered size.</p>
      <p>This reproduces the supplied weight-based rule, not a personalized fluid prescription. Food, other drinks, exercise, climate, and medical fluid restrictions matter. The source’s 70 kg / 93 oz sample does not match its stated 30–35 mL/kg rule. <a href="https://www.nationalacademies.org/read/10925/chapter/6">Total-water reference</a></p>
    </details>
  </section>;
}
