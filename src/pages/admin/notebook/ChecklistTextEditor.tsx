import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { textParts } from './checklistTextEditing';
export default function ChecklistTextEditor({ block, onSave, onClose }: { block: Element; onSave: (values: string[]) => void; onClose: () => void }) {
  const parts = textParts(block);
  const [values, setValues] = useState(() => parts.map(part => part.node.textContent ?? ''));
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current!; dialog.showModal();
    return () => { dialog.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="checklist-schedule-editor checklist-content-editor" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={id}>Edit text</h2><button type="button" aria-label="Close text editor" onClick={onClose}>×</button></header>
    <form onSubmit={event => { event.preventDefault(); onSave(values); }}>
      <p>Formatting and links are preserved. Scheduled dates stay connected to the Start date control.</p>
      {parts.map((part, index) => <label key={index}>{part.label}<textarea autoFocus={index === parts.findIndex(item => !item.locked)} rows={Math.min(6, Math.max(2, Math.ceil(values[index].length / 65)))} readOnly={part.locked} value={values[index]} onChange={event => setValues(current => current.map((value, i) => i === index ? event.target.value : value))} /></label>)}
      <footer><button type="button" onClick={onClose}>Cancel</button><button type="submit">Save text</button></footer>
    </form>
  </dialog>, document.body);
}
