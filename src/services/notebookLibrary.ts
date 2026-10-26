import { getDoc, setDoc, runTransaction, serverTimestamp, type Transaction } from "firebase/firestore";
import { documentRef } from "../firebase/firestore";
import { decodeNotebook, encodeNotebook, notebookChunkCount, NOTEBOOK_STORAGE_FORMAT, type NotebookRecord } from "./notebookStorage";

type SyncItem = { id: string; updatedAt?: string; title?: string; html?: string; tags?: string[]; attachments?: Array<{ id: string }>; versions?: Array<{ id: string; title: string; html: string; savedAt: string }>; [key: string]: unknown };
type SyncLibrary = { notes?: SyncItem[]; folders?: SyncItem[]; deletedNoteIds?: Record<string, string>; deletedFolderIds?: Record<string, string>; [key: string]: unknown };

function notebookDocument(uid: string) {
  return documentRef<NotebookRecord>(`users/${uid}/notebook`, "library");
}

export async function loadNotebookLibrary(uid: string) {
  return (await readCurrentNotebook(uid)).data;
}

function chunkDocument(uid: string, index: number, record?: NotebookRecord) {
  // Siblings use the existing owner-only notebook rules.
  return documentRef<{ text: string }>(`users/${uid}/notebook`, record?.chunkIds?.[index] ?? `library-chunk-${index}`);
}

async function readNotebook(transaction: Transaction, uid: string) {
  const snapshot = await transaction.get(notebookDocument(uid));
  const record = snapshot.exists() ? snapshot.data() : {};
  const count = notebookChunkCount(record);
  const snapshots = await Promise.all(Array.from({ length: count }, (_, index) => transaction.get(chunkDocument(uid, index, record))));
  const chunks = snapshots.map((chunk) => chunk.exists() ? chunk.data().text : undefined);
  return unpackNotebook(record, chunks);
}

function unpackNotebook(record: NotebookRecord, chunks: unknown[]) {
  const decoded = decodeNotebook(record, chunks);
  // Preserve edits made by legacy clients that merge a data field into the root.
  const data = record.format && record.data ? mergeNotebookLibraries(decoded, record.data) : decoded;
  return { data, chunks, record };
}

async function readCurrentNotebook(uid: string) {
  const reference = notebookDocument(uid);
  const snapshot = await getDoc(reference);
  const record = snapshot.exists() ? snapshot.data() : {};
  if (record.format === 'chunked-v1') {
    // The old format overwrites chunks in place, so it needs a consistent read.
    return runTransaction(reference.firestore, transaction => readNotebook(transaction, uid));
  }
  const count = notebookChunkCount(record);
  const chunks: unknown[] = [];
  // V2 parts are immutable; an old manifest remains readable during another save.
  for (let index = 0; index < count; index += 4) {
    const group = await Promise.all(Array.from({ length: Math.min(4, count - index) }, async (_, offset) => {
      const chunk = await getDoc(chunkDocument(uid, index + offset, record));
      return chunk.exists() ? chunk.data().text : undefined;
    }));
    chunks.push(...group);
  }
  return unpackNotebook(record, chunks);
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
  for (let attempt = 0; attempt < 5; attempt++) {
    const remote = await readCurrentNotebook(uid);
    const merged = mergeNotebookLibraries(remote.data, safeData);
    const chunks = encodeNotebook(merged);
    const generation = crypto.randomUUID();
    const chunkIds = chunks.map((text, index) => remote.record.format === NOTEBOOK_STORAGE_FORMAT && text === remote.chunks[index]
      ? remote.record.chunkIds![index] : `library-part-${generation}-${index}`);
    // Each independent upload is smaller than the document AND request limits.
    // Never overwrite published chunks or publish a partially uploaded snapshot.
    for (let index = 0; index < chunks.length; index += 4) {
      await Promise.all(chunks.slice(index, index + 4).map(async (text, offset) => {
        const position = index + offset;
        if (chunkIds[position] === remote.record.chunkIds?.[position]) return;
        await setDoc(documentRef<{ text: string }>(`users/${uid}/notebook`, chunkIds[position]), { text });
      }));
    }
    const published = await runTransaction(reference.firestore, async transaction => {
      const snapshot = await transaction.get(reference);
      const current = snapshot.exists() ? snapshot.data() : {};
      if (JSON.stringify(current) !== JSON.stringify(remote.record)) return false;
      transaction.set(reference, {
        format: NOTEBOOK_STORAGE_FORMAT,
        chunkCount: chunks.length,
        chunkIds,
        byteLength: chunks.reduce((bytes, text) => bytes + new TextEncoder().encode(text).byteLength, 0),
        updatedAt: serverTimestamp(),
      });
      return true;
    });
    if (published) return merged;
    // Another device published first: re-read and merge before trying again.
  }
  throw new Error("The notebook changed on another device during sync. Your local copy is saved; retry cloud sync.");
}
