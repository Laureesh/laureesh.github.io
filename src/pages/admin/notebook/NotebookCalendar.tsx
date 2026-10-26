import { useId, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { getSetColor } from "../flashbolt/setColors";
import "./NotebookCalendar.css";

type CalendarNote = { id: string; title: string; createdAt: string; noteDate?: string; color?: string; pinned: boolean };
type Props = {
  notes: CalendarNote[];
  selectedId: string;
  noteHref: (id: string) => string;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  onActions: (event: MouseEvent, id: string) => void;
};
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fullDate = (date: Date) => date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export default function NotebookCalendar({ notes, selectedId, noteHref, onOpen, onActions }: Props) {
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const agendaId = useId();
  const today = dateKey(new Date());
  const byDate = useMemo(() => {
    const grouped = new Map<string, CalendarNote[]>();
    for (const note of notes) {
      const key = note.noteDate || note.createdAt.slice(0, 10);
      const items = grouped.get(key) ?? [];
      items.push(note); grouped.set(key, items);
    }
    return grouped;
  }, [notes]);
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  const days = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  const dayNotes = byDate.get(selectedDay) ?? [];
  const chooseDay = (day: Date) => {
    setSelectedDay(dateKey(day));
    if (day.getMonth() !== month.getMonth() || day.getFullYear() !== month.getFullYear()) setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
  };
  const changeMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next); setSelectedDay(dateKey(next));
  };

  return <div className="notebook-calendar">
    <header className="calendar-month-header">
      <strong aria-live="polite">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
      <div><button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">←</button><button type="button" onClick={() => chooseDay(new Date())}>Today</button><button type="button" onClick={() => changeMonth(1)} aria-label="Next month">→</button></div>
    </header>
    <p className="calendar-hint">Select a day to see its notes below.</p>
    <div className="calendar-weekdays" aria-hidden="true">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid" role="group" aria-label="Choose a date">
      {days.map(day => {
        const key = dateKey(day);
        const items = byDate.get(key) ?? [];
        return <button type="button" key={key} data-date={key} className={day.getMonth() !== month.getMonth() ? "outside" : ""}
          aria-label={`${fullDate(day)}, ${items.length} ${items.length === 1 ? "note" : "notes"}`}
          aria-pressed={selectedDay === key} aria-current={key === today ? "date" : undefined} aria-controls={agendaId} onClick={() => chooseDay(day)}>
          <span className="calendar-day-number">{day.getDate()}</span>
          {items.length > 0 && <span className="calendar-day-indicator" aria-hidden="true"><i style={{ background: getSetColor(items[0].color ?? "violet").hex }} /><small>{items.length}</small></span>}
        </button>;
      })}
    </div>
    <section id={agendaId} className="calendar-agenda" aria-labelledby={`${agendaId}-heading`}>
      <header><h3 id={`${agendaId}-heading`}>{fullDate(new Date(`${selectedDay}T12:00:00`))}</h3><span role="status">{dayNotes.length} {dayNotes.length === 1 ? "note" : "notes"}</span></header>
      {dayNotes.length ? <ul className="calendar-day-notes">{dayNotes.map(note => <li key={note.id} style={{ "--note-color": getSetColor(note.color ?? "violet").hex } as CSSProperties} className={selectedId === note.id ? "active" : ""} onContextMenu={event => onActions(event, note.id)}>
        <a href={noteHref(note.id)} aria-current={selectedId === note.id ? "page" : undefined} onClick={event => onOpen(event, note.id)}>{note.pinned && <span aria-label="Pinned">★ </span>}{note.title || "Untitled"}</a>
        <button type="button" aria-label={`Actions for ${note.title || "Untitled"}`} aria-haspopup="dialog" onClick={event => onActions(event, note.id)}>⋯</button>
      </li>)}</ul> : <p className="calendar-empty">No notes for this day in the current view.</p>}
    </section>
  </div>;
}
