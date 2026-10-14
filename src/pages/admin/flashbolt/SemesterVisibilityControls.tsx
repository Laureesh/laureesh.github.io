import type { SemesterVisibility } from "./semesterVisibility";

type Props = { compact?: boolean; semesters: string[]; preferences: SemesterVisibility; onChange: (semester: string, hidden: boolean) => void };

export default function SemesterVisibilityControls({ semesters, preferences, onChange, compact = false }: Props) {
  const hidden = semesters.filter(semester => preferences[semester]?.hidden).length;
  return <details className={`semester-visibility${compact ? " compact-semester-visibility" : ""}`} name={compact ? "flashbolt-list-filter" : undefined} onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
    <summary>Semester visibility <span>{hidden ? `${hidden} hidden` : "All visible"}</span></summary>
    <div className={compact ? "compact-filter-popover semester-visibility-panel" : undefined}><p>Choose which semester sections to show. These choices sync with your account. Hidden folders and sets remain accessible through their links and All sets.</p>
    <div className="semester-visibility-options">{semesters.map(semester => <label key={semester}>
      <input type="checkbox" checked={!preferences[semester]?.hidden} onChange={event => onChange(semester, !event.target.checked)} />
      <span>{semester}</span>
    </label>)}</div></div>
  </details>;
}
