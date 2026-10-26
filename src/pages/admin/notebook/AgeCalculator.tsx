import { useId } from 'react';
import { ageToday, calculateAge } from './ageCalculations';
import { numberText, type FitnessValues } from './fitnessCalculations';
export default function AgeCalculator({ values, onChange }: { values: FitnessValues; onChange: (values: FitnessValues) => void }) {
  const id = useId();
  const automatic = values.ageMode === 'birthdate';
  const onDate = values.ageOnDate ?? ageToday();
  const age = calculateAge(values.birthDate ?? '', onDate);
  return <fieldset><legend>Age calculator</legend>
    <div className="fitness-fields"><label>Age entry<select value={values.ageMode ?? 'manual'} onChange={event => onChange({ ...values, ageMode: event.target.value as FitnessValues['ageMode'] })}><option value="manual">Enter age myself</option><option value="birthdate">Calculate from birth date</option></select></label>
    {!automatic ? <label>Age (years)<input type="number" min="0" max="120" step="1" value={values.age ?? ''} onChange={event => { if (event.target.validity.valid) onChange({ ...values, age: event.target.value === '' ? undefined : Number(event.target.value) }); }} /></label> : <>
      <label>Date of birth<input type="date" min="0001-01-01" max={onDate} value={values.birthDate ?? ''} aria-describedby={id} onChange={event => onChange({ ...values, birthDate: event.target.value || undefined })} /></label>
      <label>Find age on<select value={values.ageOnDate ? 'date' : 'today'} onChange={event => onChange({ ...values, ageOnDate: event.target.value === 'today' ? undefined : ageToday() })}><option value="today">Today (updates automatically)</option><option value="date">Choose a date</option></select></label>
      {values.ageOnDate && <label>Reference date<input type="date" min={values.birthDate || '0001-01-01'} value={values.ageOnDate} onChange={event => onChange({ ...values, ageOnDate: event.target.value || undefined })} /></label>}
    </>}</div>
    {automatic && <div id={id} aria-live="polite">{age ? <>
      <p><strong>{age.years} years, {age.months} months, {age.days} days</strong> · Age on {onDate}</p>
      <p>{age.birthdayToday ? 'Birthday today!' : `${age.daysUntilBirthday} days until your birthday (${age.nextBirthday})`}</p>
      <details><summary>Age in other units</summary><ul>
        <li>{numberText(age.decimalYears)} decimal years</li><li>{age.monthsTotal} months and {age.days} days</li>
        <li>{age.weeks} weeks and {age.weekDays} days</li><li>{numberText(age.totalDays)} total days</li>
        <li>Approximately {numberText(age.totalDays * 24)} hours, {numberText(age.totalDays * 1440)} minutes, or {numberText(age.totalDays * 86400)} seconds</li>
        <li>Age last birthday: {age.years}; next birthday: {age.years + 1}; nearest birthday: {age.nearestBirthdayAge}</li>
      </ul></details>
      <p>Your linked age is {age.years}. {values.ageOnDate ? 'This uses your chosen reference date.' : 'Today follows Eastern Time, like your checklist.'}</p>
    </> : <p>{values.birthDate ? 'The reference date must be on or after your birth date.' : 'Choose your birth date to calculate your age. No birth date is assumed from your 2024 age.'}</p>}</div>}
    <p>Uses calendar months and leap years. Month-end anniversaries use the last available day; February 29 birthdays use February 28 in other years. Hours, minutes, and seconds are approximate because birth time is not entered.</p>
  </fieldset>;
}
