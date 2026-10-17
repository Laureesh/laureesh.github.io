import { useState } from "react";
import type { SetDetails } from "./InlineSetDetails";
import Modal from "./Modal";
import SetColorPicker from "./SetColorPicker";
import "./BatchSetDetails.css";

type EditableSet = SetDetails & { id: string };
export type BatchSetChange = { id: string; details: Partial<SetDetails> };
const fields = ["title", "subject", "description", "color"] as const;

export default function BatchSetDetails({ sets, onSave, onClose }: {
  sets: EditableSet[];
  onSave: (changes: BatchSetChange[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(() => sets.map(set => ({ ...set, selected: true })));
  const [subject, setSubject] = useState(sets[0]?.subject ?? "");
  const [color, setColor] = useState(sets[0]?.color ?? "violet");
  const [error, setError] = useState("");
  const selected = rows.filter(row => row.selected);
  const update = (id: string, details: Partial<SetDetails>) => {
    setRows(current => current.map(row => row.id === id ? { ...row, ...details } : row));
    setError("");
  };
  const apply = (details: Partial<SetDetails>) => setRows(current => current.map(row => row.selected ? { ...row, ...details } : row));

  return <Modal className="modal batch-set-editor" labelledBy="batch-edit-title" onClose={onClose}>
    <header><div><h2 id="batch-edit-title">Batch quick edit</h2><p>Edit set details, then save selected sets together.</p></div><button className="icon-button" type="button" aria-label="Close batch editor" onClick={onClose}>×</button></header>
    <form onSubmit={event => {
      event.preventDefault();
      if (!selected.length) return;
      if (selected.some(row => !row.title.trim())) {
        setError("Enter a title for every selected set before saving.");
        return;
      }
      const changes = selected.flatMap(row => {
        const original = sets.find(set => set.id === row.id)!;
        const normalized: SetDetails = { title: row.title.trim(), subject: row.subject.trim() || "General", description: row.description.trim(), color: row.color };
        const details: Partial<SetDetails> = {};
        for (const field of fields) {
          // Only patch edited fields, preserving any other changes made while this is open.
          if (row[field] !== original[field]) details[field] = normalized[field];
        }
        return Object.keys(details).length ? [{ id: row.id, details }] : [];
      });
      onSave(changes);
    }}>
      <div className="batch-selection-actions">
        <strong aria-live="polite">{selected.length} of {rows.length} selected</strong>
        <button className="button quiet" type="button" onClick={() => setRows(current => current.map(row => ({ ...row, selected: true })))}>Select all</button>
        <button className="button quiet" type="button" onClick={() => setRows(current => current.map(row => ({ ...row, selected: false })))}>Clear selection</button>
      </div>
      <div className="batch-shared-fields">
        <div><label>Shared subject<input value={subject} onChange={event => setSubject(event.target.value)} /></label><button className="button quiet" type="button" disabled={!selected.length} onClick={() => apply({ subject })}>Apply subject to selected</button></div>
        <div><span>Shared color</span><SetColorPicker value={color} onChange={setColor} /><button className="button quiet" type="button" disabled={!selected.length} onClick={() => apply({ color })}>Apply color to selected</button></div>
      </div>
      <div className="batch-set-rows">
        {rows.map((row, index) => <section className="batch-set-row" key={row.id} aria-label={`Edit ${sets[index].title}`}>
          <label className="batch-set-selection"><input type="checkbox" checked={row.selected} onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, selected: event.target.checked } : item))} />{sets[index].title}</label>
          <fieldset disabled={!row.selected}>
            <label>Title<input value={row.title} maxLength={100} aria-invalid={Boolean(error && !row.title.trim())} onChange={event => update(row.id, { title: event.target.value })} /></label>
            <label>Subject<input value={row.subject} onChange={event => update(row.id, { subject: event.target.value })} /></label>
            <div><span>Color</span><SetColorPicker value={row.color} onChange={value => update(row.id, { color: value })} /></div>
            <div className="batch-description"><label htmlFor={`batch-description-${row.id}`}>Description</label><textarea id={`batch-description-${row.id}`} rows={2} value={row.description} onChange={event => update(row.id, { description: event.target.value })} /></div>
          </fieldset>
        </section>)}
      </div>
      {error && <p role="alert">{error}</p>}
      <footer><button className="button quiet" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={!selected.length}>Save selected sets</button></footer>
    </form>
  </Modal>;
}
