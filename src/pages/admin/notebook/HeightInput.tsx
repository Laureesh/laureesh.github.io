import { useId, useState } from 'react';
import { formatFeetInches, parseFeetInches } from './fitnessCalculations';
export default function HeightInput({ value, onChange }: { value: number | undefined; onChange: (height: number | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const id = useId();
  const text = draft ?? formatFeetInches(value);
  const invalid = Boolean(text.trim()) && parseFeetInches(text) === undefined;
  return <label>Height (feet & inches)<input type="text" value={text} placeholder={'6\'3.5"'} aria-describedby={id} aria-invalid={showError && invalid} onFocus={() => setShowError(false)} onChange={event => {
    const next = event.target.value;
    setDraft(next);
    if (!next.trim()) onChange(undefined);
    else { const height = parseFeetInches(next); if (height !== undefined) onChange(height); }
  }} onBlur={() => {
    setShowError(true);
    if (!invalid) setDraft(null);
  }} /><small id={id} role={showError && invalid ? 'alert' : undefined}>{showError && invalid ? 'Enter feet and inches, like 6\'3.5". Inches must be less than 12.' : 'Example: 6\'3.5" (6 feet, 3.5 inches)'}</small></label>;
}
