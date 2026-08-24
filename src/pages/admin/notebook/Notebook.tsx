import "./Notebook.css";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { loadNotebookLibrary, saveNotebookLibrary } from "../../../services/notebookLibrary";

type Folder = { id: string; name: string; parentId: string | null; color: string };
type Attachment = { id: string; name: string; type: string; dataUrl: string; size: number };
type Version = { id: string; title: string; html: string; savedAt: string };
type Note = { id: string; title: string; html: string; folderId: string | null; tags: string[]; pinned: boolean; archived: boolean; noteDate?: string; createdAt: string; updatedAt: string; attachments: Attachment[]; versions: Version[] };
type NotebookData = { notes: Note[]; folders: Folder[] };

const STORAGE_KEY = "flashbolt.notebook.v1";
const COLORS = ["#7c6cff", "#55d6be", "#ffca66", "#ff7698", "#58c8f5", "#a98cff"];
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const textFromHtml = (html: string) => { const node = document.createElement("div"); node.innerHTML = html; return node.textContent ?? ""; };
const initialData: NotebookData = {
  folders: [{ id: "inbox", name: "Inbox", parentId: null, color: COLORS[0] }],
  notes: [{ id: "welcome", title: "Welcome to Notebook", html: "<h1>Your ideas, always ready.</h1><p>Start typing, add tags, attach files, or link another note with <strong>[[Note title]]</strong>.</p><ul><li>Everything autosaves</li><li>Works offline</li><li>Syncs to your private account</li></ul>", folderId: "inbox", tags: ["welcome"], pinned: true, archived: false, noteDate: localDateKey(), createdAt: now(), updatedAt: now(), attachments: [], versions: [] }],
};

function readLocal(): NotebookData {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"); if (value?.notes && value?.folders) return value; } catch { /* use starter data */ }
  return initialData;
}

function download(name: string, body: BlobPart, type: string) {
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([body], { type })); link.download = name; link.click(); URL.revokeObjectURL(link.href);
}

export default function Notebook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<NotebookData>(readLocal);
  const [selectedId, setSelectedId] = useState(() => readLocal().notes[0]?.id ?? "");
  const [folderFilter, setFolderFilter] = useState<string | "all" | "pinned" | "archive">("all");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [saveState, setSaveState] = useState<"loading" | "saving" | "saved" | "offline">("loading");
  const [syncError, setSyncError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [listMode, setListMode] = useState<"notes" | "calendar">("notes");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const editorRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const selected = data.notes.find((note) => note.id === selectedId) ?? data.notes[0];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let loadFailed = false;
      if (user?.uid) {
        try {
          const cloud = await loadNotebookLibrary(user.uid) as NotebookData | null;
          if (!cancelled && cloud?.notes && cloud?.folders) { setData(cloud); setSelectedId(cloud.notes[0]?.id ?? ""); }
        } catch (error) { loadFailed = true; if (!cancelled) { setSaveState("offline"); setSyncError(error instanceof Error ? error.message : "Cloud library could not be loaded."); } }
      }
      if (!cancelled) { readyRef.current = true; setSaveState(user?.uid && !loadFailed ? "saved" : "offline"); }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    if (!readyRef.current) return;
    setSaveState("saving");
    setSyncError("");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const timer = window.setTimeout(() => {
      if (!user?.uid) { setSaveState("offline"); return; }
      void saveNotebookLibrary(user.uid, data).then(() => { setSaveState("saved"); setSyncError(""); }).catch((error: unknown) => { setSaveState("offline"); setSyncError(error instanceof Error ? error.message : "Cloud save failed."); });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [data, user?.uid]);

  useEffect(() => { if (editorRef.current && selected && editorRef.current.innerHTML !== selected.html) editorRef.current.innerHTML = selected.html; }, [selected]);

  const allTags = useMemo(() => [...new Set(data.notes.flatMap((note) => note.tags))].sort(), [data.notes]);
  const visibleNotes = useMemo(() => data.notes.filter((note) => {
    if (folderFilter === "pinned" && !note.pinned) return false;
    if (folderFilter === "archive" && !note.archived) return false;
    if (folderFilter !== "archive" && note.archived) return false;
    if (!['all', 'pinned', 'archive'].includes(folderFilter) && note.folderId !== folderFilter) return false;
    if (tagFilter && !note.tags.includes(tagFilter)) return false;
    const haystack = `${note.title} ${textFromHtml(note.html)} ${note.tags.join(" ")} ${note.attachments.map((file) => file.name).join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)), [data.notes, folderFilter, query, tagFilter]);
  const backlinks = useMemo(() => selected ? data.notes.filter((note) => note.id !== selected.id && textFromHtml(note.html).toLowerCase().includes(`[[${selected.title.toLowerCase()}]]`)) : [], [data.notes, selected]);
  const related = useMemo(() => selected ? data.notes.filter((note) => note.id !== selected.id && note.tags.some((tag) => selected.tags.includes(tag))).slice(0, 5) : [], [data.notes, selected]);
  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [calendarMonth]);

  const updateNote = (changes: Partial<Note>) => selected && setData((current) => ({ ...current, notes: current.notes.map((note) => note.id === selected.id ? { ...note, ...changes, updatedAt: now() } : note) }));
  const createNote = (folderId: string | null = typeof folderFilter === "string" && !['all', 'pinned', 'archive'].includes(folderFilter) ? folderFilter : null) => {
    const note: Note = { id: id("note"), title: "Untitled note", html: "<p><br></p>", folderId, tags: [], pinned: false, archived: false, noteDate: localDateKey(), createdAt: now(), updatedAt: now(), attachments: [], versions: [] };
    setData((current) => ({ ...current, notes: [note, ...current.notes] })); setSelectedId(note.id);
  };
  const addFolder = (parentId: string | null = null) => { const name = prompt(parentId ? "Subfolder name" : "Folder name"); if (!name?.trim()) return; setData((current) => ({ ...current, folders: [...current.folders, { id: id("folder"), name: name.trim(), parentId, color: COLORS[current.folders.length % COLORS.length] }] })); };
  const deleteFolder = (folder: Folder) => {
    const noteCount = data.notes.filter((note) => note.folderId === folder.id).length;
    const childCount = data.folders.filter((item) => item.parentId === folder.id).length;
    const detail = [noteCount ? `${noteCount} note${noteCount === 1 ? "" : "s"} will move to No folder` : "", childCount ? `${childCount} subfolder${childCount === 1 ? "" : "s"} will move up one level` : ""].filter(Boolean).join(". ");
    if (!confirm(`Delete “${folder.name}”?${detail ? `\n\n${detail}.` : ""}`)) return;
    setData((current) => ({
      ...current,
      notes: current.notes.map((note) => note.folderId === folder.id ? { ...note, folderId: null, updatedAt: now() } : note),
      folders: current.folders.filter((item) => item.id !== folder.id).map((item) => item.parentId === folder.id ? { ...item, parentId: folder.parentId } : item),
    }));
    if (folderFilter === folder.id) setFolderFilter("all");
  };
  const deleteNote = () => { if (!selected || !confirm(`Delete “${selected.title}”?`)) return; setData((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== selected.id) })); setSelectedId(data.notes.find((note) => note.id !== selected.id)?.id ?? ""); };
  const snapshot = () => updateNote({ versions: [{ id: id("version"), title: selected.title, html: selected.html, savedAt: now() }, ...selected.versions].slice(0, 30) });
  const format = (command: string, value?: string) => { editorRef.current?.focus(); document.execCommand(command, false, value); if (editorRef.current) updateNote({ html: editorRef.current.innerHTML }); };
  const addAttachments = async (incomingFiles: File[]) => {
    const files = incomingFiles.filter((file) => file.size <= 5_000_000);
    if (files.length !== incomingFiles.length) alert("Some files were larger than 5 MB and were not added.");
    const attachments = await Promise.all(files.map((file) => new Promise<Attachment>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve({ id: id("file"), name: file.name, type: file.type, dataUrl: String(reader.result), size: file.size }); reader.readAsDataURL(file); })));
    if (attachments.length) updateNote({ attachments: [...selected.attachments, ...attachments] });
  };
  const attachFiles = (event: ChangeEvent<HTMLInputElement>) => { void addAttachments([...(event.target.files ?? [])]); event.target.value = ""; };
  const pasteScreenshots = (event: ClipboardEvent<HTMLDivElement>) => {
    const images = [...event.clipboardData.items].filter((item) => item.kind === "file" && item.type.startsWith("image/")).map((item) => item.getAsFile()).filter((file): file is File => Boolean(file));
    if (!images.length) return;
    event.preventDefault();
    void addAttachments(images.map((file, index) => new File([file], file.name || `Screenshot ${new Date().toLocaleDateString()} ${index + 1}.png`, { type: file.type })));
  };
  const dropScreenshots = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); void addAttachments([...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"))); };
  const startVoice = () => { const Factory = window.SpeechRecognition ?? window.webkitSpeechRecognition; if (!Factory) return alert("Voice typing is not supported in this browser."); const recognition = new Factory(); recognition.lang = "en-US"; recognition.onresult = (event) => { const transcript = event.results[event.results.length - 1][0].transcript; format("insertText", `${transcript} `); }; recognition.start(); };
  const summarize = () => { const sentences = textFromHtml(selected.html).match(/[^.!?]+[.!?]+/g)?.slice(0, 5) ?? []; updateNote({ html: `${selected.html}<h2>Summary</h2><ul>${sentences.map((sentence) => `<li>${sentence.trim()}</li>`).join("")}</ul>` }); };
  const extractTasks = () => { const lines = textFromHtml(selected.html).split(/\n|[.!?]\s+/).filter((line) => /\b(todo|need to|must|remember to|follow up|action)\b/i.test(line)); if (!lines.length) return alert("No action items were found."); updateNote({ html: `${selected.html}<h2>Action items</h2><ul>${lines.map((line) => `<li>☐ ${line.trim()}</li>`).join("")}</ul>` }); };
  if (!selected) return <main className="notebook-empty"><button onClick={() => createNote()}>Create your first note</button></main>;

  return <div className={`notebook-shell ${sidebarOpen ? "" : "sidebar-hidden"}`}>
    <aside className="notebook-sidebar">
      <header><button className="notebook-logo" onClick={() => navigate("/admin-dashboard/private-pages/flashbolt")}>▱ <strong>Notebook</strong></button><button onClick={() => setSidebarOpen(false)}>‹</button></header>
      <button className="new-note" onClick={() => createNote()}>＋ New note</button>
      <nav><button className={folderFilter === "all" ? "active" : ""} onClick={() => setFolderFilter("all")}>▤ All notes <b>{data.notes.filter(n => !n.archived).length}</b></button><button className={folderFilter === "pinned" ? "active" : ""} onClick={() => setFolderFilter("pinned")}>★ Pinned</button><button className={folderFilter === "archive" ? "active" : ""} onClick={() => setFolderFilter("archive")}>⌁ Archive</button></nav>
      <div className="folder-heading"><span>Folders</span><button onClick={() => addFolder()}>＋</button></div>
      <nav>{data.folders.filter(folder => !folder.parentId).map((folder) => <div key={folder.id}>
        <div className="notebook-folder-row"><button className={folderFilter === folder.id ? "active" : ""} onClick={() => setFolderFilter(folder.id)}><i style={{ background: folder.color }} />{folder.name}<b>{data.notes.filter(note => note.folderId === folder.id).length}</b></button><button className="delete-folder" onClick={() => deleteFolder(folder)} aria-label={`Delete ${folder.name}`} title={`Delete ${folder.name}`}>×</button></div>
        {data.folders.filter(child => child.parentId === folder.id).map(child => <div className="notebook-folder-row subfolder-row" key={child.id}><button className={`subfolder ${folderFilter === child.id ? "active" : ""}`} onClick={() => setFolderFilter(child.id)}>↳ {child.name}<b>{data.notes.filter(note => note.folderId === child.id).length}</b></button><button className="delete-folder" onClick={() => deleteFolder(child)} aria-label={`Delete ${child.name}`} title={`Delete ${child.name}`}>×</button></div>)}
        <button className="add-subfolder" onClick={() => addFolder(folder.id)}>＋ subfolder</button>
      </div>)}</nav>
      <footer><span className={`sync-${saveState}`} title={syncError}>● {saveState === "saved" ? "Synced across devices" : saveState === "saving" ? "Saving to cloud…" : saveState === "loading" ? "Loading cloud notes…" : user?.uid ? "Cloud sync failed" : "Saved on this device only"}</span>{syncError && <small className="notebook-sync-error">{syncError}</small>}<button onClick={() => navigate("/admin-dashboard/private-pages")}>← Private pages</button></footer>
    </aside>
    <section className="note-list-panel">
      <header><button className="open-sidebar" onClick={() => setSidebarOpen(true)}>☰</button><label>⌕<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search every note and file" /></label></header>
      <div className="note-filter"><select value={tagFilter} onChange={event => setTagFilter(event.target.value)}><option value="">All tags</option>{allTags.map(tag => <option key={tag}>{tag}</option>)}</select><div className="note-view-toggle"><button className={listMode === "notes" ? "active" : ""} onClick={() => setListMode("notes")}>List</button><button className={listMode === "calendar" ? "active" : ""} onClick={() => setListMode("calendar")}>Calendar</button></div></div>
      {listMode === "notes" ? <div className="note-list">{visibleNotes.map(note => <button className={note.id === selected.id ? "active" : ""} key={note.id} onClick={() => setSelectedId(note.id)}><span>{note.pinned ? "★" : ""} {note.title || "Untitled"}</span><p>{textFromHtml(note.html).slice(0, 110) || "Empty note"}</p><small>{note.noteDate ? new Date(`${note.noteDate}T12:00:00`).toLocaleDateString() : new Date(note.updatedAt).toLocaleDateString()} · {note.tags.slice(0, 2).map(tag => `#${tag}`).join(" ")}</small></button>)}</div> : <div className="notebook-calendar"><header><button onClick={() => setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>←</button><strong>{calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button onClick={() => setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>→</button></header><div className="calendar-weekdays">{["S","M","T","W","T","F","S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map(day => { const key = localDateKey(day); const dayNotes = visibleNotes.filter(note => (note.noteDate || note.createdAt.slice(0, 10)) === key); return <div className={`${day.getMonth() === calendarMonth.getMonth() ? "" : "outside"} ${key === localDateKey() ? "today" : ""}`} key={key}><span>{day.getDate()}</span>{dayNotes.slice(0, 3).map(note => <button title={note.title} key={note.id} onClick={() => setSelectedId(note.id)}>{note.title}</button>)}{dayNotes.length > 3 && <small>+{dayNotes.length - 3} more</small>}</div>; })}</div></div>}
    </section>
    <main className="notebook-editor">
      <header className="editor-top"><div><span>{saveState === "saving" ? "Saving changes…" : saveState === "offline" ? user?.uid ? "Cloud sync failed—local backup safe" : "Saved on this device" : "Synced across devices"}</span><small>{new Date(selected.updatedAt).toLocaleString()}</small></div><div><button onClick={() => updateNote({ pinned: !selected.pinned })}>{selected.pinned ? "★ Pinned" : "☆ Pin"}</button><button onClick={snapshot}>◷ Snapshot</button><button onClick={() => setHistoryOpen(!historyOpen)}>History ({selected.versions.length})</button><button onClick={() => updateNote({ archived: !selected.archived })}>{selected.archived ? "Restore" : "Archive"}</button><button className="danger" onClick={deleteNote}>Delete</button></div></header>
      <div className="editor-meta"><input className="note-title" value={selected.title} onChange={event => updateNote({ title: event.target.value })} placeholder="Untitled note" /><div><label className="note-date-field"><span>Note date</span><input type="date" value={selected.noteDate ?? selected.createdAt.slice(0, 10)} onChange={event => updateNote({ noteDate: event.target.value })} /></label><select value={selected.folderId ?? ""} onChange={event => updateNote({ folderId: event.target.value || null })}><option value="">No folder</option>{data.folders.map(folder => <option value={folder.id} key={folder.id}>{folder.parentId ? "↳ " : ""}{folder.name}</option>)}</select><input value={selected.tags.join(", ")} onChange={event => updateNote({ tags: event.target.value.split(",").map(tag => tag.trim()).filter(Boolean) })} placeholder="Tags, separated by commas" /></div></div>
      <div className="editor-toolbar" role="toolbar"><button onClick={() => format("formatBlock", "h1")}>H1</button><button onClick={() => format("formatBlock", "h2")}>H2</button><button onClick={() => format("bold")}><b>B</b></button><button onClick={() => format("italic")}><i>I</i></button><button onClick={() => format("hiliteColor", "#fff09a")}>Highlight</button><button onClick={() => format("insertUnorderedList")}>• List</button><button onClick={() => format("insertOrderedList")}>1. List</button><button onClick={() => format("formatBlock", "pre")}>Code</button><button onClick={() => { const url = prompt("Link URL"); if (url) format("createLink", url); }}>Link</button><button onClick={startVoice}>🎙 Dictate</button><label className="attach-button">＋ Attach<input type="file" multiple accept="image/*,application/pdf,audio/*,video/*" onChange={attachFiles} /></label></div>
      <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning onPaste={pasteScreenshots} onInput={event => updateNote({ html: event.currentTarget.innerHTML })} data-placeholder="Start writing… Paste a screenshot here to attach it." />
      <section className="attachments"><div className="attachments-heading"><div><h3>Class screenshots &amp; attachments</h3><p>Paste screenshots while writing, drag them below, or browse your device.</p></div><span>{selected.attachments.length} file{selected.attachments.length === 1 ? "" : "s"}</span></div>{selected.attachments.length > 0 && <div>{selected.attachments.map(file => <article key={file.id}>{file.type.startsWith("image/") ? <a href={file.dataUrl} target="_blank" rel="noreferrer"><img src={file.dataUrl} alt={file.name} /></a> : file.type.startsWith("audio/") ? <audio controls src={file.dataUrl} /> : file.type.startsWith("video/") ? <video controls src={file.dataUrl} /> : <span>PDF</span>}<a href={file.dataUrl} download={file.name}>{file.name}</a><button onClick={() => updateNote({ attachments: selected.attachments.filter(item => item.id !== file.id) })} aria-label={`Remove ${file.name}`}>×</button></article>)}</div>}<label className="screenshot-dropzone" onDragOver={event => event.preventDefault()} onDrop={dropScreenshots}><strong>＋ Add screenshots</strong><span>Drop images here or choose screenshots</span><input type="file" multiple accept="image/*" onChange={attachFiles} /></label></section>
      <section className="note-connections"><div><h3>Backlinks</h3>{backlinks.length ? backlinks.map(note => <button key={note.id} onClick={() => setSelectedId(note.id)}>↗ {note.title}</button>) : <p>Reference this note with [[{selected.title}]].</p>}</div><div><h3>Related notes</h3>{related.length ? related.map(note => <button key={note.id} onClick={() => setSelectedId(note.id)}># {note.title}</button>) : <p>Add shared tags to surface related notes.</p>}</div></section>
      <footer className="editor-footer"><div><button onClick={summarize}>✦ Create summary</button><button onClick={extractTasks}>☑ Extract tasks</button></div><div><button onClick={() => download(`${selected.title}.html`, selected.html, "text/html")}>Export HTML</button><button onClick={() => download(`${selected.title}.md`, textFromHtml(selected.html), "text/markdown")}>Export Markdown</button><button onClick={() => download("notebook-backup.json", JSON.stringify(data, null, 2), "application/json")}>Full backup</button></div></footer>
      {historyOpen && <aside className="history-panel"><header><h2>Version history</h2><button onClick={() => setHistoryOpen(false)}>×</button></header>{selected.versions.map(version => <button key={version.id} onClick={() => updateNote({ title: version.title, html: version.html })}><strong>{new Date(version.savedAt).toLocaleString()}</strong><span>Restore this version</span></button>)}{!selected.versions.length && <p>Create a snapshot to preserve the current version.</p>}</aside>}
    </main>
  </div>;
}
