import { useEffect, useRef } from "react";
import { scheduleTextareaResize } from "./textareaResize";
import ExplanationLinks from "./ExplanationLinks";

export default function ExplanationEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textarea.current) return scheduleTextareaResize(textarea.current);
  }, [value]);

  function bold() {
    const input = textarea.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = value.slice(start, end);
    const wrapped = start >= 2 && value.slice(start - 2, start) === "**" && value.slice(end, end + 2) === "**";
    const includesMarkers = selected.length > 4 && selected.startsWith("**") && selected.endsWith("**");
    const text = selected || "bold text";
    const next = wrapped
      ? value.slice(0, start - 2) + selected + value.slice(end + 2)
      : includesMarkers
        ? value.slice(0, start) + selected.slice(2, -2) + value.slice(end)
        : value.slice(0, start) + `**${text}**` + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      input.focus();
      const from = wrapped ? start - 2 : includesMarkers ? start : start + 2;
      input.setSelectionRange(from, from + (wrapped ? selected.length : includesMarkers ? selected.length - 4 : text.length));
    });
  }

  return <div className="explanation-text-editor">
    <div className="button-row"><button type="button" className="button quiet" aria-label="Bold selected text" title="Bold (Ctrl+B or ⌘B)" onMouseDown={event => event.preventDefault()} onClick={bold}><b>B</b> Bold</button><small>Select text to bold, or type **bold text**.</small></div>
    <label className="card-explanation-field"><span>Explanation</span><textarea ref={textarea} autoFocus rows={5} value={value} onChange={event => onChange(event.target.value)} onKeyDown={event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        event.stopPropagation();
        bold();
      }
    }} /></label>
    {value && <div className="explanation-preview"><strong>Preview</strong><p><ExplanationLinks text={value} /></p></div>}
  </div>;
}
