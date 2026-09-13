import { Link } from "react-router-dom";
import { SORT_OPTIONS, type NoteSort } from "./noteSorting";
import type { NotebookPreferences } from "./notebookPreferences";
import type { ClipboardDestination } from "./clipboardNote";

type Props = {
  destination: ClipboardDestination;
  onChange: (destination: ClipboardDestination) => void;
  returnTo: string;
  storageError: boolean;
  preferences: NotebookPreferences;
  onPreferencesChange: (changes: Partial<NotebookPreferences>) => void;
  sort: NoteSort;
  onSortChange: (sort: NoteSort) => void;
  pinnedFirst: boolean;
  onPinnedFirstChange: (value: boolean) => void;
  onReset: () => void;
  onBackup: () => void;
};

export default function NotebookSettings({ destination, onChange, returnTo, storageError, preferences, onPreferencesChange, sort, onSortChange, pinnedFirst, onPinnedFirstChange, onReset, onBackup }: Props) {
  return <main className="notebook-settings">
    <div className="notebook-settings-content">
      <Link to={returnTo}>← Back to Notebook</Link>
      <h1>Notebook settings</h1>
      <p>Personalize note creation, browsing, and writing. These preferences apply to this browser.</p>
      <Link to={`/admin-dashboard/private-pages/notebook/help?returnTo=${encodeURIComponent(returnTo)}`}>Notebook help →</Link>
      <fieldset>
        <legend>New notes</legend>
        <label><input type="checkbox" checked={preferences.readClipboard} onChange={event => onPreferencesChange({ readClipboard: event.target.checked })} /><span><strong>Use clipboard text for new notes</strong><small>Turn off to always start with a blank note, without reading the clipboard.</small></span></label>
        <p>Paste clipboard text into:</p>
        <label><input type="radio" disabled={!preferences.readClipboard} name="clipboard-destination" value="title" checked={destination === "title"} onChange={() => onChange("title")} /><span><strong>Note title</strong><small>Use copied text as the title and leave the note body empty. Line breaks become spaces; titles can contain up to 180 characters.</small></span></label>
        <label><input type="radio" disabled={!preferences.readClipboard} name="clipboard-destination" value="body" checked={destination === "body"} onChange={() => onChange("body")} /><span><strong>Note body</strong><small>Paste copied text into the note, preserving line breaks. The title uses your default note title.</small></span></label>
        <label className="notebook-setting-field"><span><strong>Default note title</strong><small>Used when clipboard text does not supply a title.</small></span><input type="text" maxLength={180} value={preferences.defaultTitle} placeholder="Untitled note" onChange={event => onPreferencesChange({ defaultTitle: event.target.value })} /></label>
      </fieldset>
      <fieldset><legend>Browsing</legend>
        <label className="notebook-setting-field"><strong>Default view</strong><select value={preferences.defaultView} onChange={event => onPreferencesChange({ defaultView: event.target.value as NotebookPreferences["defaultView"] })}><option value="notes">List</option><option value="calendar">Calendar</option></select></label>
        <label className="notebook-setting-field"><strong>Sort notes</strong><select value={sort} onChange={event => onSortChange(event.target.value as NoteSort)}>{SORT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><input type="checkbox" checked={pinnedFirst} onChange={event => onPinnedFirstChange(event.target.checked)} /><span><strong>Pinned notes first</strong><small>Keep pinned notes above other notes regardless of sort order.</small></span></label>
        <label><input type="checkbox" checked={preferences.showPreviews} onChange={event => onPreferencesChange({ showPreviews: event.target.checked })} /><span><strong>Show text previews</strong><small>Display a short excerpt under each note title in the list.</small></span></label>
      </fieldset>
      <fieldset><legend>Writing and history</legend>
        <label><input type="checkbox" checked={preferences.autoSteps} onChange={event => onPreferencesChange({ autoSteps: event.target.checked })} /><span><strong>Automatically detect steps</strong><small>Turn recognizable instructions into Steps layout after a short pause. Turning the layout off manually keeps it off for that note.</small></span></label>
        <label className="notebook-setting-field"><strong>Editor text size</strong><select value={preferences.fontSize} onChange={event => onPreferencesChange({ fontSize: Number(event.target.value) as NotebookPreferences["fontSize"] })}>{[16, 18, 20, 22].map(size => <option key={size} value={size}>{size}px</option>)}</select></label>
        <label><input type="checkbox" checked={preferences.automaticHistory} onChange={event => onPreferencesChange({ automaticHistory: event.target.checked })} /><span><strong>Automatic version snapshots</strong><small>Keep up to 30 versions of the open note. Turning this off does not disable autosave or manual snapshots.</small></span></label>
        <label className="notebook-setting-field"><strong>Snapshot interval</strong><select disabled={!preferences.automaticHistory} value={preferences.historyMinutes} onChange={event => onPreferencesChange({ historyMinutes: Number(event.target.value) as NotebookPreferences["historyMinutes"] })}>{[2, 5, 10].map(minutes => <option key={minutes} value={minutes}>Every {minutes} minutes</option>)}</select></label>
      </fieldset>
      <fieldset><legend>Backup and preferences</legend><div className="notebook-settings-actions"><button onClick={onBackup}>Download notebook backup</button><button onClick={onReset}>Reset settings to defaults</button></div><p>Resetting preferences does not change or delete your notes, folders, or saved versions.</p></fieldset>
      <p role="status">{storageError ? "Applied for this session. Your browser could not save the preference." : "Changes save automatically on this browser."}</p>
      <p>If the clipboard is empty or access is denied, a blank note is created. This setting applies to new notes.</p>
    </div>
  </main>;
}
