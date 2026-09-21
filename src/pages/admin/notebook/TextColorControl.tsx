import { useEffect, useRef, useState, type RefObject } from "react";

const TEXT_COLORS = [
  ["White", "#ffffff"], ["Purple", "#b9a7ff"], ["Green", "#55d6be"],
  ["Orange", "#ffad66"], ["Yellow", "#ffe17a"], ["Blue", "#80c7ff"],
  ["Pink", "#ffa0ca"], ["Red", "#ff8585"],
] as const;

export default function TextColorControl({ editorRef, onChange }: {
  editorRef: RefObject<HTMLDivElement | null>;
  onChange: (html: string) => void;
}) {
  const savedSelection = useRef<Range | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || !editorRef.current) return;
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelection.current = range.collapsed ? null : range.cloneRange();
      }
    };
    document.addEventListener("selectionchange", rememberSelection);
    return () => document.removeEventListener("selectionchange", rememberSelection);
  }, [editorRef]);

  function applyColor(color: string) {
    const editor = editorRef.current;
    const range = savedSelection.current;
    if (!editor || !range || range.collapsed || !editor.contains(range.commonAncestorContainer)) {
      setMessage("Select a word or phrase in the note first.");
      return;
    }
    editor.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("foreColor", false, color);
    if (selection?.rangeCount) savedSelection.current = selection.getRangeAt(0).cloneRange();
    onChange(editor.innerHTML);
    setMessage("");
  }

  return <label className="notebook-text-color" title="Select text in the note, then choose a color">
    <span aria-hidden="true">A</span>
    <select aria-label="Text color" value="" onChange={event => applyColor(event.target.value)}>
      <option value="" disabled>Text color</option>
      {TEXT_COLORS.map(([label, color]) => <option key={color} value={color}>{label}</option>)}
    </select>
    <span className="text-color-status" role="status">{message}</span>
  </label>;
}
