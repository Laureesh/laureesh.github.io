import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { checklistRoot } from '../src/pages/admin/notebook/checklistDocument.ts';
import { readTaskContent, saveChecklistContent } from '../src/pages/admin/notebook/checklistEditing.ts';
import { readFitnessValues, refreshFitnessDocument, shoppingTotal } from '../src/pages/admin/notebook/fitnessDocument.ts';
const { parseHTML, NodeFilter } = createRequire(import.meta.url)(process.env.DOM_TEST_MODULE || 'linkedom');
const { window } = parseHTML('<html><body></body></html>');
for (const name of ['document', 'Node', 'Element']) globalThis[name] = window[name];
globalThis.NodeFilter = NodeFilter;
const source = '<p>Historical weight: 271.4 lb</p><ul class="notebook-todo"><li><input type="checkbox" checked data-checklist-date="2026-10-26"><strong>My lunch</strong><br>My instructions<br><a href="https://example.com">Recipe</a></li></ul>';
test('linked values refresh across tasks and survive edits/reloads without changing history or schedules', () => {
  let content = readTaskContent(checklistRoot(source).querySelector('li'));
  let html = saveChecklistContent(source, { kind: 'task', index: 0, content }, { ...content, linkedValues: ['calories', 'protein'], calculation: { kind: 'shopping', a: 2, b: 4, unit: '' } });
  html = refreshFitnessDocument(html, { calories: 2391, protein: 160 });
  assert.match(checklistRoot(html).querySelector('[data-fitness-links]').textContent, /2,391/);
  html = refreshFitnessDocument(html, { calories: 2000, protein: 150 });
  assert.match(checklistRoot(html).querySelector('[data-fitness-links]').textContent, /2,000.*150/);
  content = readTaskContent(checklistRoot(html).querySelector('li'));
  assert.equal(content.details, 'My instructions');
  assert.deepEqual(content.linkedValues, ['calories', 'protein']);
  assert.equal(content.calculation.a, 2);
  html = refreshFitnessDocument(saveChecklistContent(html, { kind: 'task', index: 0, content }, { ...content, title: 'Updated lunch', calculation: { ...content.calculation, a: 3 } }));
  const root = checklistRoot(html);
  assert.equal(root.querySelectorAll('[data-fitness-links]').length, 1);
  assert.equal(root.querySelectorAll('[data-fitness-calculation]').length, 1);
  assert.equal(root.querySelector('[data-fitness-calculation]').textContent, '3 × $4 = $12');
  assert.deepEqual(shoppingTotal(root), { count: 1, total: 12 });
  assert(root.querySelector('input').hasAttribute('checked'));
  assert.equal(root.querySelector('input').getAttribute('data-checklist-date'), '2026-10-26');
  assert.equal(root.querySelector('a').getAttribute('href'), 'https://example.com');
  assert.match(root.textContent, /Historical weight: 271.4 lb/);
  assert.deepEqual(readFitnessValues(html), { calories: 2000, protein: 150 });
  assert.equal(refreshFitnessDocument(html), html);
});
test('ordinary notes remain unchanged and removing links removes generated values', () => {
  assert.equal(refreshFitnessDocument(source), source);
  const content = readTaskContent(checklistRoot(source).querySelector('li'));
  let html = refreshFitnessDocument(saveChecklistContent(source, { kind: 'task', index: 0, content }, { ...content, linkedValues: ['weight'] }));
  assert.match(html, /Not entered/);
  const draft = readTaskContent(checklistRoot(html).querySelector('li'));
  html = saveChecklistContent(html, { kind: 'task', index: 0, content: draft }, { ...draft, linkedValues: [] });
  assert.equal(checklistRoot(html).querySelector('[data-fitness-links]'), null);
});

test('additional profile fields survive reload and update linked task values', () => {
  const content = readTaskContent(checklistRoot(source).querySelector('li'));
  let html = saveChecklistContent(source, { kind: 'task', index: 0, content }, { ...content, linkedValues: ['age', 'gender', 'idealGoal', 'adjustedGoal', 'goal', 'sugar', 'saturatedFat'] });
  html = refreshFitnessDocument(html, { age: 24, gender: 'Male', idealGoal: 205, adjustedGoal: 228, goalMode: 'adjusted', sugar: 64, saturatedFat: 27 });
  const values = readFitnessValues(html);
  assert.equal(values.age, 24); assert.equal(values.gender, 'Male'); assert.equal(values.goalMode, 'adjusted');
  assert.equal(values.goal, 228);
  html = refreshFitnessDocument(html, { ...values, adjustedGoal: 225 });
  const linked = checklistRoot(html).querySelector('[data-fitness-links]').textContent;
  assert.match(linked, /Age \(years\): 24/); assert.match(linked, /Gender: Male/);
  assert.match(linked, /Selected goal weight \(lb\): 225/);
  assert.match(linked, /Sugar limit \(g\/day\): 64/);
  assert.match(checklistRoot(html).textContent, /Historical weight: 271.4 lb/);
});

test('birth date and reference date persist and drive the linked age', () => {
  const content = readTaskContent(checklistRoot(source).querySelector('li'));
  let html = saveChecklistContent(source, { kind: 'task', index: 0, content }, { ...content, linkedValues: ['age'] });
  html = refreshFitnessDocument(html, { ageMode: 'birthdate', birthDate: '2000-10-26', ageOnDate: '2026-10-25' });
  const values = readFitnessValues(html);
  assert.equal(values.birthDate, '2000-10-26');
  assert.equal(values.ageOnDate, '2026-10-25');
  assert.equal(values.ageMode, 'birthdate');
  assert.match(checklistRoot(html).querySelector('[data-fitness-links]').textContent, /25/);
  html = refreshFitnessDocument(html, { ...values, ageOnDate: '2026-10-26' });
  assert.match(checklistRoot(html).querySelector('[data-fitness-links]').textContent, /26/);
});

test('formula settings persist and linked calorie and macro targets update after profile edits', () => {
  const content = readTaskContent(checklistRoot(source).querySelector('li'));
  let html = saveChecklistContent(source, { kind: 'task', index: 0, content }, { ...content, linkedValues: ['maintenance', 'calories', 'protein', 'hamwi', 'water'] });
  html = refreshFitnessDocument(html, { age: 25, gender: 'Male', weight: 165, height: 70, energyFormula: 'harris', activityFactor: 1.55, autoMaintenance: true, calorieMode: 'loss', weeklyRate: 1, autoMacros: true, proteinPercent: 30, carbPercent: 40, fatPercent: 30, autoWater: true, waterRate: 30 });
  const saved = readFitnessValues(html);
  assert.equal(saved.energyFormula, 'harris'); assert.equal(saved.autoMaintenance, true); assert.equal(saved.autoMacros, true);
  const before = checklistRoot(html).querySelector('[data-fitness-links]').textContent;
  html = refreshFitnessDocument(html, { ...saved, weight: 180 });
  const after = checklistRoot(html).querySelector('[data-fitness-links]').textContent;
  assert.notEqual(before, after);
  assert.equal(readFitnessValues(html).calorieMode, 'loss');
  assert.match(checklistRoot(html).textContent, /Historical weight: 271.4 lb/);
  assert.equal(refreshFitnessDocument(html), html);
});
