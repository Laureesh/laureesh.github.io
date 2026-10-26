import workbook from './weightLossWorkbook.json' with { type: 'json' };
import { calendarDate, displayDate } from './checklistSchedule.ts';

export const WEIGHT_LOSS_TITLE = 'MY WEIGHT LOSS JOURNEY';
export const WEIGHT_LOSS_START = workbook.startDate;
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export function validPlanDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 9998 && !Number.isNaN(calendarDate(value).getTime()) && calendarDate(value).toISOString().slice(0, 10) === value;
}
/** Keep the workbook's 156 scheduled sessions, always on Monday, Wednesday, Friday. */
export function weightLossDates(start: string): string[] {
  if (!validPlanDate(start)) throw new Error('Choose a valid start date.');
  const date = calendarDate(start);
  const dates: string[] = [];
  while (dates.length < workbook.sessionCount) {
    if ([1, 3, 5].includes(date.getUTCDay())) dates.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}
const dateText = (date: string) => `${new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(calendarDate(date))}, ${displayDate(date)}`;
function dateSpan(index: number, dates: string[]) { return `<span data-weightloss-date="${index}">${dateText(dates[index])}</span>`; }
export function createWeightLossHtml(start = WEIGHT_LOSS_START): string {
  const dates = weightLossDates(start);
  const meals = workbook.meals.map(meal => `<li><input type="checkbox"><strong>${escape(meal.title)}</strong><br>${escape(meal.focus)} · ${meal.calories} kcal · Protein ${meal.protein} · Carbs ${meal.carbs} · Fats ${meal.fats}</li>`).join('');
  let html = `<div data-weightloss-plan="1" data-weightloss-start="${start}"><h1>${WEIGHT_LOSS_TITLE}</h1><p>My workout and meal checklist · Based on my weight-loss workbook.</p><p>Plan: <span data-weightloss-start-label>${displayDate(start)}</span> to ${dateSpan(dates.length - 1, dates)}. 156 workouts · Monday, Wednesday and Friday.</p><h2>Daily meals</h2><p>Meal targets from the workbook: 2,300 kcal · 200g protein · 180g carbs · 75g fats, including the optional late snack. These are the workbook’s stated totals; its fat entries add up to 65g.</p><ul class="notebook-todo" data-checklist-repeat="daily">${meals}</ul><p>Meal checkmarks reset at midnight Eastern Time. Workout checkmarks stay saved when dates change. Push-up levels below follow the workbook’s row order.</p>`;
  for (let week = 0; week < 52; week++) {
    html += `<section data-weightloss-week="${week}"><h2>Week ${week + 1} · ${dateSpan(week * 3, dates)} – ${dateSpan(week * 3 + 2, dates)}</h2><ul class="notebook-todo">`;
    for (let day = 0; day < 3; day++) {
      const index = week * 3 + day;
      const workout = workbook.workouts[index % 3];
      html += `<li><input type="checkbox" data-weightloss-session="${index}" data-checklist-date="${dates[index]}"><strong>${escape(workout.title)}</strong><br>${workout.exercises.map(line => escape(line.trim())).join('<br>')}<br><a href="${escape(workout.url)}">Workout video</a></li>`;
      const pushup = workbook.pushups[index];
      if (pushup) html += `<li><input type="checkbox" data-weightloss-session="${index}" data-checklist-date="${dates[index]}"><strong>${escape(pushup.variation)} · Level ${pushup.level}</strong><br>${escape(pushup.reps)}<br><a href="${escape(pushup.url)}">Push-up instructions</a></li>`;
    }
    html += '</ul></section>';
  }
  return html + '<p>Source notes: the workbook contains 156 dated workout rows and three additional undated repeats. This checklist uses the 156 dated sessions. No push-up targets are supplied after step 33.</p></div>';
}
/** Update every stored date without rebuilding the note or losing checks and edits. */
export function changeWeightLossStart(html: string, start: string): string {
  const dates = weightLossDates(start);
  const root = document.createElement('div'); root.innerHTML = html;
  const plan = root.querySelector('[data-weightloss-plan]');
  if (!plan) return html;
  plan.setAttribute('data-weightloss-start', start);
  plan.querySelectorAll('[data-weightloss-start-label]').forEach(node => { node.textContent = displayDate(start); });
  plan.querySelectorAll('[data-weightloss-date]').forEach(node => {
    const date = dates[Number(node.getAttribute('data-weightloss-date'))];
    if (date) node.textContent = dateText(date);
  });
  plan.querySelectorAll('[data-weightloss-session]').forEach(node => {
    const date = dates[Number(node.getAttribute('data-weightloss-session'))];
    if (date) node.setAttribute('data-checklist-date', date);
  });
  return root.innerHTML;
}
