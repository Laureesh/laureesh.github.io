import type { SemesterVisibility } from "./semesterVisibility";

type Props = { semesters: string[]; preferences: SemesterVisibility; onChange: (semester: string, hidden: boolean) => void };

export default function SemesterVisibilityControls({ semesters, preferences, onChange }: Props) {
  const hidden = semesters.filter(semester => preferences[semester]?.hidden).length;
  return <details className="semester-visibility">
    <summary>Semester visibility <span>{hidden ? `${hidden} hidden` : "All visible"}</span></summary>
    <p>Choose which semester sections to show. These choices sync with your account. Hidden folders and sets remain accessible through their links and All sets.</p>
    <div className="semester-visibility-options">{semesters.map(semester => <label key={semester}>
      <input type="checkbox" checked={!preferences[semester]?.hidden} onChange={event => onChange(semester, !event.target.checked)} />
      <span>{semester}</span>
    </label>)}</div>
  </details>;
}
