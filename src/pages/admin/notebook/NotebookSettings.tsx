import { Link } from "react-router-dom";
import type { ClipboardDestination } from "./clipboardNote";

type Props = {
  destination: ClipboardDestination;
  onChange: (destination: ClipboardDestination) => void;
  returnTo: string;
  storageError: boolean;
};

export default function NotebookSettings({ destination, onChange, returnTo, storageError }: Props) {
  return <main className="notebook-settings">
    <div className="notebook-settings-content">
      <Link to={returnTo}>← Back to Notebook</Link>
      <h1>Notebook settings</h1>
      <p>Choose what happens when you create a new note.</p>
      <fieldset>
        <legend>Paste clipboard text into</legend>
        <label><input type="radio" name="clipboard-destination" value="title" checked={destination === "title"} onChange={() => onChange("title")} /><span><strong>Note title</strong><small>Use copied text as the title and leave the note body empty. Line breaks become spaces; titles can contain up to 180 characters.</small></span></label>
        <label><input type="radio" name="clipboard-destination" value="body" checked={destination === "body"} onChange={() => onChange("body")} /><span><strong>Note body</strong><small>Paste copied text into the note, preserving line breaks. The title starts as “Untitled note.”</small></span></label>
      </fieldset>
      <p role="status">{storageError ? "Applied for this session. Your browser could not save the preference." : "Changes save automatically on this browser."}</p>
      <p>If the clipboard is empty or access is denied, a blank note is created. This setting applies to new notes.</p>
    </div>
  </main>;
}
