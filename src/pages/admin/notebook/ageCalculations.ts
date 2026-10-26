const DAY = 86400000;
export function validAgeDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || text < '0001-01-01') return false;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text;
}
export function ageToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function addMonths(birth: Date, months: number): Date {
  const result = new Date(birth);
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const end = new Date(result); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
  result.setUTCDate(Math.min(birth.getUTCDate(), end.getUTCDate()));
  return result;
}
/** Calendar anniversaries clamp to the final day in short months (Feb 29 → Feb 28). */
export function calculateAge(birthDate: string, onDate: string) {
  if (!validAgeDate(birthDate) || !validAgeDate(onDate) || birthDate > onDate) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`), on = new Date(`${onDate}T00:00:00Z`);
  let monthsTotal = (on.getUTCFullYear() - birth.getUTCFullYear()) * 12 + on.getUTCMonth() - birth.getUTCMonth();
  if (addMonths(birth, monthsTotal) > on) monthsTotal--;
  const years = Math.floor(monthsTotal / 12), months = monthsTotal % 12;
  const days = Math.round((on.getTime() - addMonths(birth, monthsTotal).getTime()) / DAY);
  const totalDays = Math.round((on.getTime() - birth.getTime()) / DAY);
  const last = addMonths(birth, years * 12), next = addMonths(birth, (years + 1) * 12);
  const birthdayToday = last.getTime() === on.getTime();
  const daysUntilBirthday = birthdayToday ? 0 : Math.round((next.getTime() - on.getTime()) / DAY);
  return { years, months, days, monthsTotal, totalDays, weeks: Math.floor(totalDays / 7), weekDays: totalDays % 7,
    daysUntilBirthday, birthdayToday, nextBirthday: (birthdayToday ? last : next).toISOString().slice(0, 10),
    decimalYears: years + (on.getTime() - last.getTime()) / (next.getTime() - last.getTime()),
    nearestBirthdayAge: on.getTime() - last.getTime() <= next.getTime() - on.getTime() ? years : years + 1 };
}
