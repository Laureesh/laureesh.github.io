import { getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { documentRef } from "../firebase/firestore";

type NotebookRecord = { data?: unknown; updatedAt?: unknown };
type SyncItem = { id: string; updatedAt?: string; title?: string; html?: string; tags?: string[]; attachments?: Array<{ id: string }>; versions?: Array<{ id: string; title: string; html: string; savedAt: string }>; [key: string]: unknown };
type SyncLibrary = { notes?: SyncItem[]; folders?: SyncItem[]; deletedNoteIds?: Record<string, string>; deletedFolderIds?: Record<string, string>; [key: string]: unknown };

function notebookDocument(uid: string) {
  return documentRef<NotebookRecord>(`users/${uid}/notebook`, "library");
}

export async function loadNotebookLibrary(uid: string) {
  const snapshot = await getDoc(notebookDocument(uid));
  return snapshot.exists() ? snapshot.data().data ?? null : null;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function itemTime(item: SyncItem) {
  const value = Date.parse(item.updatedAt ?? "");
  return Number.isFinite(value) ? value : 0;
}

export function mergeNotebookLibraries(remoteValue: unknown, localValue: unknown) {
  const remote = remoteValue && typeof remoteValue === "object" ? remoteValue as SyncLibrary : {};
  const local = localValue && typeof localValue === "object" ? localValue as SyncLibrary : {};
  const remoteNotes = Array.isArray(remote.notes) ? remote.notes : [];
  const localNotes = Array.isArray(local.notes) ? local.notes : [];
  const deletedNoteIds = { ...(remote.deletedNoteIds ?? {}), ...(local.deletedNoteIds ?? {}) };
  const deletedFolderIds = { ...(remote.deletedFolderIds ?? {}), ...(local.deletedFolderIds ?? {}) };
  const notes = new Map(remoteNotes.filter((note) => typeof note?.id === "string").map((note) => [note.id, note]));

  localNotes.filter((note) => typeof note?.id === "string").forEach((localNote) => {
    const remoteNote = notes.get(localNote.id);
    if (!remoteNote) { notes.set(localNote.id, localNote); return; }
    const localWins = itemTime(localNote) >= itemTime(remoteNote);
    const winner = localWins ? localNote : remoteNote;
    const loser = localWins ? remoteNote : localNote;
    const versions = uniqueById([...(Array.isArray(winner.versions) ? winner.versions : []), ...(Array.isArray(loser.versions) ? loser.versions : [])]);
    if ((winner.title !== loser.title || winner.html !== loser.html) && typeof loser.html === "string") {
      const conflictId = `sync-${loser.id}-${loser.updatedAt ?? "unknown"}`;
      if (!versions.some((version) => version.id === conflictId)) versions.unshift({ id: conflictId, title: String(loser.title ?? "Untitled note"), html: loser.html, savedAt: loser.updatedAt ?? new Date().toISOString() });
    }
    notes.set(localNote.id, {
      ...winner,
      tags: [...new Set([...(Array.isArray(remoteNote.tags) ? remoteNote.tags : []), ...(Array.isArray(localNote.tags) ? localNote.tags : [])])],
      attachments: uniqueById([...(Array.isArray(remoteNote.attachments) ? remoteNote.attachments : []), ...(Array.isArray(localNote.attachments) ? localNote.attachments : [])]),
      versions: versions.slice(0, 50),
    });
  });

  const remoteFolders = Array.isArray(remote.folders) ? remote.folders : [];
  const localFolders = Array.isArray(local.folders) ? local.folders : [];
  const folders = new Map(remoteFolders.filter((folder) => typeof folder?.id === "string").map((folder) => [folder.id, folder]));
  localFolders.filter((folder) => typeof folder?.id === "string").forEach((folder) => {
    const existing = folders.get(folder.id);
    if (!existing || itemTime(folder) >= itemTime(existing)) folders.set(folder.id, folder);
  });
  const survivesDeletion = (item: SyncItem, deletedIds: Record<string, string>) => { const deletedAt = Date.parse(deletedIds[item.id] ?? ""); return !Number.isFinite(deletedAt) || deletedAt < itemTime(item); };
  const activeNotes = [...notes.values()].filter((note) => survivesDeletion(note, deletedNoteIds));
  const activeFolders = [...folders.values()].filter((folder) => survivesDeletion(folder, deletedFolderIds));
  return { ...remote, ...local, notes: activeNotes, folders: activeFolders, deletedNoteIds, deletedFolderIds };
}

export async function saveNotebookLibrary(uid: string, data: unknown) {
  const safeData = JSON.parse(JSON.stringify(data)) as unknown;
  const reference = notebookDocument(uid);
  return runTransaction(reference.firestore, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const merged = mergeNotebookLibraries(snapshot.exists() ? snapshot.data().data : null, safeData);
    transaction.set(reference, { data: merged, updatedAt: serverTimestamp() }, { merge: true });
    return merged;
  });
}
