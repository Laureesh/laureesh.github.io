import { checklistRoot } from './checklistDocument.ts';
import { calculateFitness, calculationText, cleanFitnessValues, fitnessLabels, numberText, validTaskCalculation, type FitnessValues, type FitnessKey } from './fitnessCalculations.ts';
export function readFitnessValues(html: string): FitnessValues {
  try { return cleanFitnessValues(JSON.parse(checklistRoot(html).querySelector('[data-fitness-values]')?.getAttribute('data-fitness-values') || '{}')); } catch { return {}; }
}
export function refreshFitnessDocument(html: string, values?: FitnessValues): string {
  if (!values && !/data-fitness-(values|links|calculation)/.test(html)) return html;
  const root = checklistRoot(html);
  let summary = root.querySelector('[data-fitness-values]');
  if (values && !summary) { summary = document.createElement('div'); summary.setAttribute('data-fitness-values', '{}'); root.prepend(summary); }
  const saved = values ? cleanFitnessValues(values) : readFitnessValues(html);
  const results = calculateFitness(saved);
  if (summary) {
    summary.setAttribute('data-fitness-values', JSON.stringify(saved));
    const heading = document.createElement('p'); heading.textContent = 'My linked values';
    const description = document.createElement('p'); description.textContent = 'Editable values from Checklist View. Historical records below are kept separately.';
    summary.replaceChildren(heading, description);
    for (const key of Object.keys(results) as FitnessKey[]) { const p = document.createElement('p'); p.textContent = `${fitnessLabels[key]}: ${numberText(results[key])}`; summary.append(p); }
  }
  root.querySelectorAll('[data-fitness-links]').forEach(node => {
    let keys: string[] = [];
    try { const raw = JSON.parse(node.getAttribute('data-fitness-links') || '[]'); if (Array.isArray(raw)) keys = raw; } catch { /* Invalid pasted metadata is ignored. */ }
    node.textContent = keys.filter((key): key is FitnessKey => Object.hasOwn(fitnessLabels, key)).map(key => `${fitnessLabels[key]}: ${numberText(results[key])}`).join(' · ');
  });
  root.querySelectorAll('[data-fitness-calculation]').forEach(node => {
    try { const value = JSON.parse(node.getAttribute('data-fitness-calculation') || '{}'); if (validTaskCalculation(value)) node.textContent = calculationText(value); } catch { /* Leave ordinary text intact. */ }
  });
  return root.innerHTML;
}

export function shoppingTotal(root: Element): { count: number; total: number } {
  let count = 0, total = 0;
  root.querySelectorAll('[data-fitness-calculation]').forEach(node => {
    try {
      const value = JSON.parse(node.getAttribute('data-fitness-calculation') || '{}');
      if (validTaskCalculation(value) && value.kind === 'shopping') { count++; total += value.a * value.b; }
    } catch { /* Ignore invalid metadata. */ }
  });
  return { count, total };
}
