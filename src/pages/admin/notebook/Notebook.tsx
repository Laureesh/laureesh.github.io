import "./Notebook.css";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { loadNotebookLibrary, mergeNotebookLibraries, saveNotebookLibrary } from "../../../services/notebookLibrary";

type Folder = { id: string; name: string; parentId: string | null; color: string; updatedAt?: string };
type Attachment = { id: string; name: string; type: string; dataUrl: string; size: number };
type Version = { id: string; title: string; html: string; savedAt: string };
type Note = { id: string; title: string; html: string; folderId: string | null; tags: string[]; pinned: boolean; archived: boolean; noteDate?: string; createdAt: string; updatedAt: string; attachments: Attachment[]; versions: Version[] };
type NotebookData = { notes: Note[]; folders: Folder[]; deletedNoteIds?: Record<string, string>; deletedFolderIds?: Record<string, string> };

const STORAGE_KEY = "flashbolt.notebook.v1";
const NOTEBOOK_BASE = "/admin-dashboard/private-pages/notebook";
const CLOUD_SAVE_DELAY_MS = 3_000;
const COLORS = ["#7c6cff", "#55d6be", "#ffca66", "#ff7698", "#58c8f5", "#a98cff"];
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const textFromHtml = (html: string) => { const node = document.createElement("div"); node.innerHTML = html; return node.textContent ?? ""; };
const notebookRoute = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const notebookIndex = parts.indexOf("notebook");
  const routeParts = notebookIndex >= 0 ? parts.slice(notebookIndex + 1) : [];
  return { kind: routeParts[0] ?? "all", id: routeParts[1] ? decodeURIComponent(routeParts[1]) : "" };
};
const initialData: NotebookData = {
  folders: [{ id: "inbox", name: "Inbox", parentId: null, color: COLORS[0] }],
  notes: [{ id: "welcome", title: "Welcome to Notebook", html: "<h1>Your ideas, always ready.</h1><p>Start typing, add tags, attach files, or link another note with <strong>[[Note title]]</strong>.</p><ul><li>Everything autosaves</li><li>Works offline</li><li>Syncs to your private account</li></ul>", folderId: "inbox", tags: ["welcome"], pinned: true, archived: false, noteDate: localDateKey(), createdAt: now(), updatedAt: now(), attachments: [], versions: [] }],
};

function normalizeNotebook(value: unknown): NotebookData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<NotebookData>;
  if (!Array.isArray(candidate.notes) || !Array.isArray(candidate.folders)) return null;
  const folders = candidate.folders.filter((folder): folder is Folder => Boolean(folder && typeof folder.id === "string" && typeof folder.name === "string")).map((folder, index) => ({ ...folder, parentId: typeof folder.parentId === "string" ? folder.parentId : null, color: typeof folder.color === "string" ? folder.color : COLORS[index % COLORS.length] }));
  const notes = candidate.notes.filter((note): note is Note => Boolean(note && typeof note.id === "string")).map((note) => ({
    ...note,
    title: typeof note.title === "string" ? note.title : "Untitled note",
    html: typeof note.html === "string" ? note.html : "<p><br></p>",
    folderId: typeof note.folderId === "string" && folders.some((folder) => folder.id === note.folderId) ? note.folderId : null,
    tags: Array.isArray(note.tags) ? note.tags.filter((tag): tag is string => typeof tag === "string") : [],
    pinned: Boolean(note.pinned), archived: Boolean(note.archived),
    createdAt: typeof note.createdAt === "string" ? note.createdAt : now(), updatedAt: typeof note.updatedAt === "string" ? note.updatedAt : now(),
    attachments: Array.isArray(note.attachments) ? note.attachments.filter((file): file is Attachment => Boolean(file && typeof file.id === "string" && typeof file.dataUrl === "string")) : [],
    versions: Array.isArray(note.versions) ? note.versions.filter((version): version is Version => Boolean(version && typeof version.id === "string" && typeof version.html === "string")) : [],
  }));
  return { folders, notes, deletedNoteIds: candidate.deletedNoteIds && typeof candidate.deletedNoteIds === "object" ? candidate.deletedNoteIds : {}, deletedFolderIds: candidate.deletedFolderIds && typeof candidate.deletedFolderIds === "object" ? candidate.deletedFolderIds : {} };
}

function readLocal(): NotebookData {
  try { const value = normalizeNotebook(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")); if (value) return value; } catch { /* use starter data */ }
  return initialData;
}

function download(name: string, body: BlobPart, type: string) {
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([body], { type })); link.download = name; link.click(); URL.revokeObjectURL(link.href);
}

function fileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error(`Could not read ${file.name}.`)); reader.readAsDataURL(file); });
}

async function attachmentFromFile(file: File): Promise<Attachment> {
  let dataUrl = await fileDataUrl(file);
  let type = file.type;
  if (file.type.startsWith("image/") && file.type !== "image/gif") {
    const image = new Image(); image.src = dataUrl; await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d"); if (!context) throw new Error(`Could not process ${file.name}.`);
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL("image/jpeg", .76); type = "image/jpeg";
  }
  return { id: id("file"), name: type === "image/jpeg" ? file.name.replace(/\.[^.]+$/, ".jpg") : file.name, type, dataUrl, size: Math.round(dataUrl.length * .75) };
}

export default function Notebook() {
  const { user } = useAuth();
  const location = useLocation();
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
  const [noteSort, setNoteSort] = useState<"updated" | "title" | "date">("updated");
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const editorRef = useRef<HTMLDivElement>(null);
  const renderedNoteIdRef = useRef("");
  const readyRef = useRef(false);
  const dataRevisionRef = useRef(0);
  const startupLocalDataRef = useRef(data);
  const startupPathRef = useRef(location.pathname);
  const selected = data.notes.find((note) => note.id === selectedId) ?? data.notes[0];
  const latestSelectedRef = useRef<Note | undefined>(selected);
  const latestDataRef = useRef(data);
  latestSelectedRef.current = selected;
  latestDataRef.current = data;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let loadFailed = false;
      if (user?.uid) {
        try {
          const cloud = normalizeNotebook(await loadNotebookLibrary(user.uid));
          if (!cancelled && cloud) { const merged = normalizeNotebook(mergeNotebookLibraries(cloud, startupLocalDataRef.current)) ?? startupLocalDataRef.current; const route = notebookRoute(startupPathRef.current); setData(merged); setSelectedId(route.kind === "note" && merged.notes.some((note) => note.id === route.id) ? route.id : merged.notes[0]?.id ?? ""); }
        } catch (error) { loadFailed = true; if (!cancelled) { setSaveState("offline"); setSyncError(error instanceof Error ? error.message : "Cloud library could not be loaded."); } }
      }
      if (!cancelled) { readyRef.current = true; setSaveState(user?.uid && !loadFailed ? "saved" : "offline"); }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  useEffect(() => {
    if (!readyRef.current) return;
    dataRevisionRef.current += 1;
    const savingRevision = dataRevisionRef.current;
    const savingData = data;
    setSaveState("saving");
    setSyncError("");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const timer = window.setTimeout(() => {
      if (!user?.uid) { setSaveState("offline"); return; }
      void saveNotebookLibrary(user.uid, savingData).then((mergedValue) => {
        const latestData = latestDataRef.current;
        const merged = normalizeNotebook(mergeNotebookLibraries(mergedValue, latestData));
        if (merged && JSON.stringify(merged) !== JSON.stringify(latestData)) setData(merged);
        setSaveState(dataRevisionRef.current === savingRevision ? "saved" : "saving");
        setSyncError("");
      }).catch((error: unknown) => { setSaveState("offline"); setSyncError(error instanceof Error ? error.message : "Cloud save failed."); });
    }, CLOUD_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [data, user?.uid]);

  useEffect(() => {
    if (!editorRef.current || !selected) return;
    const changedNote = renderedNoteIdRef.current !== selected.id;
    if ((changedNote || document.activeElement !== editorRef.current) && editorRef.current.innerHTML !== selected.html) editorRef.current.innerHTML = selected.html;
    renderedNoteIdRef.current = selected.id;
  }, [selected]);

  useEffect(() => {
    const route = notebookRoute(location.pathname);
    if (route.kind === "note" && data.notes.some((note) => note.id === route.id)) {
      setSelectedId(route.id);
      setMobileEditorOpen(true);
    } else if (route.kind === "folder" && data.folders.some((folder) => folder.id === route.id)) {
      setFolderFilter(route.id);
    } else if (route.kind === "view" && ["pinned", "archive"].includes(route.id)) {
      setFolderFilter(route.id as "pinned" | "archive");
    } else if (route.kind === "all") {
      setFolderFilter("all");
    }
  }, [data.folders, data.notes, location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const note = latestSelectedRef.current;
      if (!note || !textFromHtml(note.html).trim()) return;
      setData((current) => ({ ...current, notes: current.notes.map((item) => {
        if (item.id !== note.id) return item;
        const latest = item.versions[0];
        if (latest?.html === item.html && latest.title === item.title) return item;
        return { ...item, versions: [{ id: id("version"), title: item.title, html: item.html, savedAt: now() }, ...item.versions].slice(0, 30) };
      }) }));
    }, 120_000);
    return () => window.clearInterval(timer);
  }, []);

  const allTags = useMemo(() => [...new Set(data.notes.flatMap((note) => note.tags))].sort(), [data.notes]);
  const visibleNotes = useMemo(() => data.notes.filter((note) => {
    if (folderFilter === "pinned" && !note.pinned) return false;
    if (folderFilter === "archive" && !note.archived) return false;
    if (folderFilter !== "archive" && note.archived) return false;
    if (!['all', 'pinned', 'archive'].includes(folderFilter) && note.folderId !== folderFilter) return false;
    if (tagFilter && !note.tags.includes(tagFilter)) return false;
    const haystack = `${note.title} ${textFromHtml(note.html)} ${note.tags.join(" ")} ${note.attachments.map((file) => file.name).join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (noteSort === "title" ? a.title.localeCompare(b.title) : noteSort === "date" ? (b.noteDate ?? b.createdAt).localeCompare(a.noteDate ?? a.createdAt) : b.updatedAt.localeCompare(a.updatedAt))), [data.notes, folderFilter, noteSort, query, tagFilter]);
  const backlinks = useMemo(() => selected ? data.notes.filter((note) => note.id !== selected.id && textFromHtml(note.html).toLowerCase().includes(`[[${selected.title.toLowerCase()}]]`)) : [], [data.notes, selected]);
  const related = useMemo(() => selected ? data.notes.filter((note) => note.id !== selected.id && note.tags.some((tag) => selected.tags.includes(tag))).slice(0, 5) : [], [data.notes, selected]);
  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [calendarMonth]);

  const updateNote = (changes: Partial<Note>) => selected && setData((current) => ({ ...current, notes: current.notes.map((note) => note.id === selected.id ? { ...note, ...changes, updatedAt: now() } : note) }));
  const retryCloudSync = async () => {
    if (!user?.uid) return;
    setSaveState("saving"); setSyncError("");
    try { const merged = normalizeNotebook(await saveNotebookLibrary(user.uid, data)); if (merged && JSON.stringify(merged) !== JSON.stringify(data)) setData(merged); setSaveState("saved"); }
    catch (error) { setSaveState("offline"); setSyncError(error instanceof Error ? error.message : "Cloud save failed."); }
  };
  const openNote = (noteId: string) => { setSelectedId(noteId); setMobileEditorOpen(true); navigate(`${NOTEBOOK_BASE}/note/${encodeURIComponent(noteId)}`); };
  const openFolder = (folderId: string | "all" | "pinned" | "archive") => {
    setFolderFilter(folderId);
    navigate(folderId === "all" ? NOTEBOOK_BASE : folderId === "pinned" || folderId === "archive" ? `${NOTEBOOK_BASE}/view/${folderId}` : `${NOTEBOOK_BASE}/folder/${encodeURIComponent(folderId)}`);
  };
  const followNotebookLink = (event: ReactMouseEvent<HTMLAnchorElement>, action: () => void) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    action();
  };
  const createNote = (folderId: string | null = typeof folderFilter === "string" && !['all', 'pinned', 'archive'].includes(folderFilter) ? folderFilter : null) => {
    const note: Note = { id: id("note"), title: "Untitled note", html: "<p><br></p>", folderId, tags: [], pinned: false, archived: false, noteDate: localDateKey(), createdAt: now(), updatedAt: now(), attachments: [], versions: [] };
    setData((current) => ({ ...current, notes: [note, ...current.notes] })); openNote(note.id);
  };
  const addFolder = (parentId: string | null = null) => { const name = prompt(parentId ? "Subfolder name" : "Folder name"); if (!name?.trim()) return; setData((current) => ({ ...current, folders: [...current.folders, { id: id("folder"), name: name.trim(), parentId, color: COLORS[current.folders.length % COLORS.length], updatedAt: now() }] })); };
  const editFolder = (folder: Folder) => { const name = prompt("Rename folder", folder.name); if (!name?.trim()) return; setData((current) => ({ ...current, folders: current.folders.map((item) => item.id === folder.id ? { ...item, name: name.trim(), updatedAt: now() } : item) })); };
  const changeFolderColor = (folder: Folder) => setData((current) => ({ ...current, folders: current.folders.map((item) => item.id === folder.id ? { ...item, color: COLORS[(COLORS.indexOf(item.color) + 1) % COLORS.length], updatedAt: now() } : item) }));
  const deleteFolder = (folder: Folder) => {
    const noteCount = data.notes.filter((note) => note.folderId === folder.id).length;
    const childCount = data.folders.filter((item) => item.parentId === folder.id).length;
    const detail = [noteCount ? `${noteCount} note${noteCount === 1 ? "" : "s"} will move to No folder` : "", childCount ? `${childCount} subfolder${childCount === 1 ? "" : "s"} will move up one level` : ""].filter(Boolean).join(". ");
    if (!confirm(`Delete “${folder.name}”?${detail ? `\n\n${detail}.` : ""}`)) return;
    setData((current) => ({
      ...current,
      notes: current.notes.map((note) => note.folderId === folder.id ? { ...note, folderId: null, updatedAt: now() } : note),
      folders: current.folders.filter((item) => item.id !== folder.id).map((item) => item.parentId === folder.id ? { ...item, parentId: folder.parentId } : item),
      deletedFolderIds: { ...(current.deletedFolderIds ?? {}), [folder.id]: now() },
    }));
    if (folderFilter === folder.id) setFolderFilter("all");
  };
  const deleteNote = () => { if (!selected || !confirm(`Delete “${selected.title}”?`)) return; setData((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== selected.id), deletedNoteIds: { ...(current.deletedNoteIds ?? {}), [selected.id]: now() } })); setSelectedId(data.notes.find((note) => note.id !== selected.id)?.id ?? ""); setMobileEditorOpen(false); };
  const duplicateNote = () => { const copy: Note = { ...selected, id: id("note"), title: `${selected.title} (copy)`, pinned: false, createdAt: now(), updatedAt: now(), versions: [], attachments: selected.attachments.map((file) => ({ ...file, id: id("file") })) }; setData((current) => ({ ...current, notes: [copy, ...current.notes] })); openNote(copy.id); };
  const snapshot = () => updateNote({ versions: [{ id: id("version"), title: selected.title, html: selected.html, savedAt: now() }, ...selected.versions].slice(0, 30) });
  const format = (command: string, value?: string) => { editorRef.current?.focus(); document.execCommand(command, false, value); if (editorRef.current) updateNote({ html: editorRef.current.innerHTML }); };
  const addAttachments = async (incomingFiles: File[]) => {
    const files = incomingFiles.filter((file) => file.size <= 5_000_000);
    if (files.length !== incomingFiles.length) alert("Some files were larger than 5 MB and were not added.");
    try {
      const attachments = await Promise.all(files.map(attachmentFromFile));
      const availableCharacters = 750_000 - selected.attachments.reduce((total, file) => total + file.dataUrl.length, 0);
      const accepted: Attachment[] = []; let used = 0;
      attachments.forEach((file) => { if (used + file.dataUrl.length <= availableCharacters) { accepted.push(file); used += file.dataUrl.length; } });
      if (accepted.length !== attachments.length) alert("Some attachments could not be added because this note reached its cloud-safe attachment limit. Create another note for additional screenshots.");
      if (accepted.length) updateNote({ attachments: [...selected.attachments, ...accepted] });
    } catch (error) { alert(error instanceof Error ? error.message : "The attachment could not be added."); }
  };
  const attachFiles = (event: ChangeEvent<HTMLInputElement>) => { void addAttachments([...(event.target.files ?? [])]); event.target.value = ""; };
  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try { const value = normalizeNotebook(JSON.parse(await file.text())); if (!value) throw new Error("This is not a valid Notebook backup."); if (!confirm(`Restore ${value.notes.length} notes and ${value.folders.length} folders? This replaces the current notebook.`)) return; setData(value); setSelectedId(value.notes[0]?.id ?? ""); setFolderFilter("all"); }
    catch (error) { alert(error instanceof Error ? error.message : "The backup could not be imported."); }
  };
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
  const wordCount = textFromHtml(selected.html).trim().split(/\s+/).filter(Boolean).length;
  if (!selected) return <main className="notebook-empty"><div><span>▱</span><h1>Your notebook is empty</h1><p>Create a note to start writing. Everything will autosave.</p><button onClick={() => createNote()}>＋ Create your first note</button><label>Restore a backup<input type="file" accept="application/json,.json" onChange={importBackup} /></label><button className="quiet" onClick={() => navigate("/admin-dashboard/private-pages")}>← Private pages</button></div></main>;

  return <div className={`notebook-shell ${sidebarOpen ? "" : "sidebar-hidden"}`}>
    <aside className="notebook-sidebar">
      <header><button className="notebook-logo" onClick={() => navigate("/admin-dashboard/private-pages/flashbolt")}>▱ <strong>Notebook</strong></button><button onClick={() => setSidebarOpen(false)}>‹</button></header>
      <button className="new-note" onClick={() => createNote()}>＋ New note</button>
      <nav><a href={NOTEBOOK_BASE} className={folderFilter === "all" ? "active" : ""} onClick={(event) => followNotebookLink(event, () => openFolder("all"))}>▤ All notes <b>{data.notes.filter(n => !n.archived).length}</b></a><a href={`${NOTEBOOK_BASE}/view/pinned`} className={folderFilter === "pinned" ? "active" : ""} onClick={(event) => followNotebookLink(event, () => openFolder("pinned"))}>★ Pinned</a><a href={`${NOTEBOOK_BASE}/view/archive`} className={folderFilter === "archive" ? "active" : ""} onClick={(event) => followNotebookLink(event, () => openFolder("archive"))}>⌁ Archive</a></nav>
      <div className="folder-heading"><span>Folders</span><button onClick={() => addFolder()}>＋</button></div>
      <nav>{data.folders.filter(folder => !folder.parentId).map((folder) => <div key={folder.id}>
        <div className="notebook-folder-row"><a href={`${NOTEBOOK_BASE}/folder/${encodeURIComponent(folder.id)}`} className={folderFilter === folder.id ? "active" : ""} onClick={(event) => followNotebookLink(event, () => openFolder(folder.id))}><i style={{ background: folder.color }} /><span className="folder-name">{folder.name}</span><b>{data.notes.filter(note => note.folderId === folder.id).length}</b></a><span className="folder-actions"><button onClick={() => changeFolderColor(folder)} aria-label={`Change ${folder.name} color`} title="Change color">●</button><button onClick={() => editFolder(folder)} aria-label={`Rename ${folder.name}`} title="Rename folder">✎</button><button className="delete-folder" onClick={() => deleteFolder(folder)} aria-label={`Delete ${folder.name}`} title={`Delete ${folder.name}`}>×</button></span></div>
        {data.folders.filter(child => child.parentId === folder.id).map(child => <div className="notebook-folder-row subfolder-row" key={child.id}><a href={`${NOTEBOOK_BASE}/folder/${encodeURIComponent(child.id)}`} className={`subfolder ${folderFilter === child.id ? "active" : ""}`} onClick={(event) => followNotebookLink(event, () => openFolder(child.id))}><span aria-hidden="true">↳</span><span className="folder-name">{child.name}</span><b>{data.notes.filter(note => note.folderId === child.id).length}</b></a><span className="folder-actions"><button onClick={() => changeFolderColor(child)} aria-label={`Change ${child.name} color`} title="Change color">●</button><button onClick={() => editFolder(child)} aria-label={`Rename ${child.name}`} title="Rename folder">✎</button><button className="delete-folder" onClick={() => deleteFolder(child)} aria-label={`Delete ${child.name}`} title={`Delete ${child.name}`}>×</button></span></div>)}
        <button className="add-subfolder" onClick={() => addFolder(folder.id)}>＋ subfolder</button>
      </div>)}</nav>
      <footer><span className={`sync-${saveState}`} title={syncError}>● {saveState === "saved" ? "Synced across devices" : saveState === "saving" ? "Saving to cloud…" : saveState === "loading" ? "Loading cloud notes…" : user?.uid ? "Cloud sync failed" : "Saved on this device only"}</span>{syncError && <><small className="notebook-sync-error">{syncError}</small><button className="retry-sync" onClick={() => void retryCloudSync()}>Retry cloud sync</button></>}<label className="restore-backup">↑ Restore backup<input type="file" accept="application/json,.json" onChange={importBackup} /></label><button onClick={() => navigate("/admin-dashboard/private-pages")}>← Private pages</button></footer>
    </aside>
    <section className="note-list-panel">
      <header><button className="open-sidebar" onClick={() => setSidebarOpen(true)}>☰</button><label>⌕<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search every note and file" /></label></header>
      <div className="note-filter"><select value={tagFilter} onChange={event => setTagFilter(event.target.value)} aria-label="Filter notes by tag"><option value="">All tags</option>{allTags.map(tag => <option key={tag}>{tag}</option>)}</select><select value={noteSort} onChange={event => setNoteSort(event.target.value as typeof noteSort)} aria-label="Sort notes"><option value="updated">Recently edited</option><option value="date">Note date</option><option value="title">Title A–Z</option></select><div className="note-view-toggle"><button className={listMode === "notes" ? "active" : ""} onClick={() => setListMode("notes")}>List</button><button className={listMode === "calendar" ? "active" : ""} onClick={() => setListMode("calendar")}>Calendar</button></div></div>
      {listMode === "notes" ? <div className="note-list">{visibleNotes.map(note => <a href={`${NOTEBOOK_BASE}/note/${encodeURIComponent(note.id)}`} className={note.id === selected.id ? "active" : ""} key={note.id} onClick={(event) => followNotebookLink(event, () => openNote(note.id))}><span>{note.pinned ? "★" : ""} {note.title || "Untitled"}</span><p>{textFromHtml(note.html).slice(0, 110) || "Empty note"}</p><small>{note.noteDate ? new Date(`${note.noteDate}T12:00:00`).toLocaleDateString() : new Date(note.updatedAt).toLocaleDateString()} · {note.tags.slice(0, 2).map(tag => `#${tag}`).join(" ")}</small></a>)}{!visibleNotes.length && <div className="notes-empty-state"><strong>No notes found</strong><p>Clear your search or create a note in this folder.</p><button onClick={() => createNote()}>＋ Create note</button></div>}</div> : <div className="notebook-calendar"><header><button onClick={() => setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Previous month">←</button><strong>{calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button onClick={() => setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button><button onClick={() => setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Next month">→</button></header><div className="calendar-weekdays">{["S","M","T","W","T","F","S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map(day => { const key = localDateKey(day); const dayNotes = visibleNotes.filter(note => (note.noteDate || note.createdAt.slice(0, 10)) === key); return <div className={`${day.getMonth() === calendarMonth.getMonth() ? "" : "outside"} ${key === localDateKey() ? "today" : ""}`} key={key}><span>{day.getDate()}</span>{dayNotes.slice(0, 3).map(note => <a href={`${NOTEBOOK_BASE}/note/${encodeURIComponent(note.id)}`} title={note.title} key={note.id} onClick={(event) => followNotebookLink(event, () => openNote(note.id))}>{note.title}</a>)}{dayNotes.length > 3 && <small>+{dayNotes.length - 3} more</small>}</div>; })}</div></div>}
    </section>
    <main className={`notebook-editor ${mobileEditorOpen ? "mobile-open" : ""}`}>
      <header className="editor-top"><button className="mobile-notes-back" onClick={() => setMobileEditorOpen(false)}>← Notes</button><div><span>{saveState === "saving" ? "Saving changes…" : saveState === "offline" ? user?.uid ? "Cloud sync failed—local backup safe" : "Saved on this device" : "Synced across devices"}</span><small>{new Date(selected.updatedAt).toLocaleString()}</small></div><div><button onClick={() => updateNote({ pinned: !selected.pinned })}>{selected.pinned ? "★ Pinned" : "☆ Pin"}</button><button onClick={duplicateNote}>Duplicate</button><button onClick={snapshot}>Save version</button><button onClick={() => setHistoryOpen(!historyOpen)}>History ({selected.versions.length})</button><button onClick={() => updateNote({ archived: !selected.archived })}>{selected.archived ? "Restore" : "Archive"}</button><button className="danger" onClick={deleteNote}>Delete</button></div></header>
      <div className="editor-meta"><label className="title-field"><span>Note title</span><textarea className="note-title" rows={2} value={selected.title} onChange={event => { event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`; updateNote({ title: event.target.value }); }} placeholder="Untitled note" maxLength={180} /></label><div><label className="note-date-field"><span>Note date</span><input type="date" value={selected.noteDate ?? selected.createdAt.slice(0, 10)} onChange={event => updateNote({ noteDate: event.target.value })} /></label><label className="compact-meta-field"><span>Folder</span><select value={selected.folderId ?? ""} onChange={event => updateNote({ folderId: event.target.value || null })}><option value="">No folder</option>{data.folders.map(folder => <option value={folder.id} key={folder.id}>{folder.parentId ? "↳ " : ""}{folder.name}</option>)}</select></label><label className="compact-meta-field tags-field"><span>Tags</span><input value={selected.tags.join(", ")} onChange={event => updateNote({ tags: event.target.value.split(",").map(tag => tag.trim()).filter(Boolean) })} placeholder="class, exam, chapter-2" /></label></div><small className="note-writing-stats">{wordCount} word{wordCount === 1 ? "" : "s"} · about {Math.max(1, Math.ceil(wordCount / 200))} min read</small></div>
      <div className="editor-toolbar" role="toolbar" aria-label="Text formatting"><button title="Undo" onClick={() => format("undo")}>↶ Undo</button><button title="Redo" onClick={() => format("redo")}>↷ Redo</button><i /><button title="Large heading" onClick={() => format("formatBlock", "h1")}>Heading 1</button><button title="Medium heading" onClick={() => format("formatBlock", "h2")}>Heading 2</button><button title="Bold" onClick={() => format("bold")}><b>Bold</b></button><button title="Italic" onClick={() => format("italic")}><i>Italic</i></button><button title="Highlight selected text" onClick={() => format("hiliteColor", "#fff09a")}>Highlight</button><button title="Bulleted list" onClick={() => format("insertUnorderedList")}>• Bullets</button><button title="Numbered list" onClick={() => format("insertOrderedList")}>1. Numbers</button><button title="Code block" onClick={() => format("formatBlock", "pre")}>Code</button><button title="Add a link" onClick={() => { const url = prompt("Paste a link URL"); if (url) format("createLink", url); }}>Link</button><button title="Type using your voice" onClick={startVoice}>🎙 Dictate</button><label className="attach-button" title="Attach images, PDFs, audio, or video">＋ Attach files<input type="file" multiple accept="image/*,application/pdf,audio/*,video/*" onChange={attachFiles} /></label></div>
      <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning onPaste={pasteScreenshots} onInput={event => updateNote({ html: event.currentTarget.innerHTML })} data-placeholder="Start writing… Paste a screenshot here to attach it." />
      <section className="attachments"><div className="attachments-heading"><div><h3>Class screenshots &amp; attachments</h3><p>Paste screenshots while writing, drag them below, or browse your device.</p></div><span>{selected.attachments.length} file{selected.attachments.length === 1 ? "" : "s"}</span></div>{selected.attachments.length > 0 && <div className="attachment-grid">{selected.attachments.map(file => <article key={file.id}>{file.type.startsWith("image/") ? <a href={file.dataUrl} target="_blank" rel="noreferrer"><img src={file.dataUrl} alt={file.name} /></a> : file.type.startsWith("audio/") ? <audio controls src={file.dataUrl} /> : file.type.startsWith("video/") ? <video controls src={file.dataUrl} /> : <span>PDF</span>}<a href={file.dataUrl} download={file.name}>{file.name}</a><button onClick={() => updateNote({ attachments: selected.attachments.filter(item => item.id !== file.id) })} aria-label={`Remove ${file.name}`}>×</button></article>)}</div>}<label className="screenshot-dropzone" onDragOver={event => event.preventDefault()} onDrop={dropScreenshots}><strong>＋ Add screenshots</strong><span>Drop images here or choose screenshots</span><input type="file" multiple accept="image/*" onChange={attachFiles} /></label></section>
      <section className="note-connections"><div><h3>Notes linking here</h3>{backlinks.length ? backlinks.map(note => <a href={`${NOTEBOOK_BASE}/note/${encodeURIComponent(note.id)}`} key={note.id} onClick={(event) => followNotebookLink(event, () => openNote(note.id))}>↗ {note.title}</a>) : <p>Type [[{selected.title}]] in another note to connect it here.</p>}</div><div><h3>Related by tag</h3>{related.length ? related.map(note => <a href={`${NOTEBOOK_BASE}/note/${encodeURIComponent(note.id)}`} key={note.id} onClick={(event) => followNotebookLink(event, () => openNote(note.id))}># {note.title}</a>) : <p>Add the same tag to multiple notes to find related material.</p>}</div></section>
      <footer className="editor-footer"><div><button onClick={summarize}>✦ Summarize note</button><button onClick={extractTasks}>☑ Find action items</button></div><div><button onClick={() => window.print()}>Print / Save PDF</button><button onClick={() => download(`${selected.title}.html`, selected.html, "text/html")}>Export HTML</button><button onClick={() => download(`${selected.title}.md`, textFromHtml(selected.html), "text/markdown")}>Export Markdown</button><button onClick={() => download("notebook-backup.json", JSON.stringify(data, null, 2), "application/json")}>Download full backup</button></div></footer>
      {historyOpen && <aside className="history-panel"><header><h2>Version history</h2><button onClick={() => setHistoryOpen(false)}>×</button></header>{selected.versions.map(version => <button key={version.id} onClick={() => updateNote({ title: version.title, html: version.html })}><strong>{new Date(version.savedAt).toLocaleString()}</strong><span>Restore this version</span></button>)}{!selected.versions.length && <p>Create a snapshot to preserve the current version.</p>}</aside>}
    </main>
  </div>;
}
