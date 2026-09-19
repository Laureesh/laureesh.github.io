import { useId } from "react";
import { normalizeMasteryFilter, type MasteryFilter } from "./masteryFilter";

type Props = { value: MasteryFilter; onChange: (value: MasteryFilter) => void; shown: number; total: number };

export default function MasteryFilterControls({ value, onChange, shown, total }: Props) {
  const id = useId();
  const setPercentage = (input: string) => {
    if (input === "") return;
    const percentage = Number(input);
    if (Number.isFinite(percentage)) onChange(normalizeMasteryFilter({ ...value, percentage }));
  };
  return <section className="mastery-filter" aria-label="Filter sets by mastery">
    <div className="mastery-filter-heading"><strong>Mastery filter</strong><span role="status">Showing {shown} of {total} sets</span></div>
    <div className="mastery-filter-fields">
      <label htmlFor={`${id}-mode`}>Show or hide sets<select id={`${id}-mode`} value={value.mode} onChange={event => onChange({ ...value, mode: event.target.value as MasteryFilter["mode"] })}><option value="all">Show all sets</option><option value="above">Hide sets above this percentage</option><option value="below">Hide sets below this percentage</option></select></label>
      <label className="mastery-filter-slider" htmlFor={`${id}-slider`}>Mastery percentage<input id={`${id}-slider`} type="range" min="0" max="100" step="1" value={value.percentage} aria-valuetext={`${value.percentage}%`} onChange={event => setPercentage(event.target.value)} /></label>
      <label className="mastery-filter-number" htmlFor={`${id}-number`}>Percent<input id={`${id}-number`} type="number" min="0" max="100" step="1" value={value.percentage} onChange={event => setPercentage(event.target.value)} /></label>
      {value.mode !== "all" && <button className="button quiet" type="button" onClick={() => onChange({ ...value, mode: "all" })}>Clear filter</button>}
    </div>
    <p>{value.mode === "all" ? "Choose which sets to hide, then adjust the slider or enter a percentage." : `Hiding sets ${value.mode} ${value.percentage}% mastery. Sets at exactly ${value.percentage}% stay visible.`}</p>
  </section>;
}
