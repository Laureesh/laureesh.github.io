import assert from 'node:assert/strict';
import test from 'node:test';
import { createPersonalFitnessHtml, personalSessions } from '../src/pages/admin/notebook/personalFitnessNote.ts';
import { weightLossDates } from '../src/pages/admin/notebook/weightLossPlan.ts';

test('seven sessions retain all exercises, round counts and the recovery day', () => {
  assert.equal(personalSessions.length, 7);
  assert.deepEqual(personalSessions.map(session => session.tasks.length), [6, 5, 6, 5, 5, 5, 1]);
  assert.match(personalSessions[3].rounds, /5 rounds.*30–45 seconds/);
  assert.match(personalSessions[5].rounds, /3 times.*30–60 seconds/);
  const html = createPersonalFitnessHtml('2026-10-26');
  assert.equal((html.match(/data-weightloss-week=/g) ?? []).length, 3);
  assert.equal((html.match(/data-weightloss-session=/g) ?? []).length, 45);
  assert.match(html, /data-personal-fitness-note="1"/);
  assert.doesNotMatch(html, /data-checklist-repeat/);
  assert.match(html, /PushFit App/);
  assert.match(html, /2 seconds each time/);
  assert.match(html, /Low Impact, High Burn/);
});
test('start date preserves the Monday/Wednesday/Friday sequence across years', () => {
  assert.deepEqual(weightLossDates('2026-12-30', 7, true), ['2027-01-04', '2027-01-06', '2027-01-08', '2027-01-11', '2027-01-13', '2027-01-15', '2027-01-18']);
  assert.deepEqual(weightLossDates('2026-10-26', 7, true), ['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09']);
  assert.throws(() => weightLossDates('2026-10-26', 0));
});
test('analysis retains every topic, original values, corrections, links and missing details', () => {
  const html = createPersonalFitnessHtml('2026-10-26');
  for (const text of ['December 29, 2024 at 9:48 AM', '22 years', '271.4 lb', '205 lb', '228 lb', '6 ft 3.5 in', '33.5', '2,391', '1,891', '83.8', '41.9', '66.4', '43.4', '33.2', '21.7', '160 g', '335 g', '54 g', '64 g', '27 g', '2,466', '152.5', '4.51', '150–300', '100 Body Weight', 'Waist-high', 'Knee-high', 'Dumbbell', 'FINAL BOSS', 'Vanilla protein milk', '20 × $1', '2 × $1', '$53', 'Whealthy', 'Two pasted image placeholders']) assert(html.includes(text), text);
  for (const domain of ['calculatorsoup.com', 'calculator.net', 'unitconverters.net', 'medindia.net', 'niddk.nih.gov', 'cdc.gov', 'nationalacademies.org']) assert(html.includes(domain), domain);
});
