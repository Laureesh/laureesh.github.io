import { runTransaction, serverTimestamp, type Transaction } from "firebase/firestore";
import { documentRef } from "../firebase/firestore";
import { decodeNotebook, encodeNotebook, notebookChunkCount, NOTEBOOK_STORAGE_FORMAT, type NotebookRecord } from "./notebookStorage";

type SyncItem = { id: string; updatedAt?: string; title?: string; html?: string; tags?: string[]; attachments?: Array<{ id: string }>; versions?: Array<{ id: string; title: string; html: string; savedAt: string }>; [key: string]: unknown };
type SyncLibrary = { notes?: SyncItem[]; folders?: SyncItem[]; deletedNoteIds?: Record<string, string>; deletedFolderIds?: Record<string, string>; [key: string]: unknown };

function notebookDocument(uid: string) {
  return documentRef<NotebookRecord>(`users/${uid}/notebook`, "library");
}

export async function loadNotebookLibrary(uid: string) {
  const reference = notebookDocument(uid);
  // A transaction prevents mixing a manifest with chunks from another save.
  return runTransaction(reference.firestore, async (transaction) => (await readNotebook(transaction, uid)).data);
}

function chunkDocument(uid: string, index: number) {
  // Siblings use the existing owner-only notebook rules; no rules migration needed.
  return documentRef<{ text: string }>(`users/${uid}/notebook`, `library-chunk-${index}`);
}

async function readNotebook(transaction: Transaction, uid: string) {
  const snapshot = await transaction.get(notebookDocument(uid));
  const record = snapshot.exists() ? snapshot.data() : {};
  const count = notebookChunkCount(record);
  const snapshots = await Promise.all(Array.from({ length: count }, (_, index) => transaction.get(chunkDocument(uid, index))));
  const chunks = snapshots.map((chunk) => chunk.exists() ? chunk.data().text : undefined);
  const decoded = decodeNotebook(record, chunks);
  // An older open tab may still merge a legacy `data` field into the manifest.
  // Preserve those edits too; the next successful save migrates them again.
  const data = count && record.data ? mergeNotebookLibraries(decoded, record.data) : decoded;
  return { data, chunks };
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
      versions,
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
    const remote = await readNotebook(transaction, uid);
    const merged = mergeNotebookLibraries(remote.data, safeData);
    const chunks = encodeNotebook(merged);
    // All reads precede writes. The legacy document is replaced only if every
    // chunk commits successfully, including on transaction retries/conflicts.
    chunks.forEach((text, index) => {
      if (text !== remote.chunks[index]) transaction.set(chunkDocument(uid, index), { text });
    });
    for (let index = chunks.length; index < remote.chunks.length; index++) transaction.delete(chunkDocument(uid, index));
    transaction.set(reference, {
      format: NOTEBOOK_STORAGE_FORMAT,
      chunkCount: chunks.length,
      byteLength: chunks.reduce((bytes, text) => bytes + new TextEncoder().encode(text).byteLength, 0),
      updatedAt: serverTimestamp(),
    });
    return merged;
  });
}
