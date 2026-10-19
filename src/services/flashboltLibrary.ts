import { runTransaction, serverTimestamp, type Transaction } from "firebase/firestore";
import { documentRef } from "../firebase/firestore";
import { createSaveQueue } from "./saveQueue";
import { decodeFlashbolt, encodeFlashbolt, flashboltChunkCount, FLASHBOLT_STORAGE_FORMAT, type FlashboltRecord } from "./flashboltStorage";

type FlashboltUserRecord = { flashboltLibrary?: FlashboltRecord };
const enqueueSave = createSaveQueue();

function libraryDocument(uid: string) {
  return documentRef<FlashboltUserRecord>("users", uid);
}

function chunkDocument(uid: string, index: number) {
  return documentRef<{ text: string }>(`users/${uid}/flashbolt`, `library-chunk-${index}`);
}

async function readLibrary(transaction: Transaction, uid: string) {
  const snapshot = await transaction.get(libraryDocument(uid));
  const record = snapshot.exists() ? snapshot.data().flashboltLibrary ?? {} : {};
  const count = flashboltChunkCount(record);
  const snapshots = await Promise.all(Array.from({ length: count }, (_, index) => transaction.get(chunkDocument(uid, index))));
  const chunks = snapshots.map(snapshot => snapshot.exists() ? snapshot.data().text : undefined);
  return { data: decodeFlashbolt(record, chunks), chunks };
}

export async function loadFlashboltLibrary(uid: string) {
  return runTransaction(libraryDocument(uid).firestore, async transaction => (await readLibrary(transaction, uid)).data);
}

export async function saveFlashboltLibrary(uid: string, data: unknown) {
  return mergeAndSaveFlashboltLibrary(uid, data, (_cloud, local) => local);
}

export async function mergeAndSaveFlashboltLibrary<T>(uid: string, localData: T, merge: (cloudData: T, localData: T) => T) {
  const reference = libraryDocument(uid);
  return enqueueSave(uid, () => runTransaction(reference.firestore, async transaction => {
    const remote = await readLibrary(transaction, uid);
    const merged = remote.data == null ? localData : merge(remote.data as T, localData);
    const chunks = encodeFlashbolt(merged);
    chunks.forEach((text, index) => {
      if (text !== remote.chunks[index]) transaction.set(chunkDocument(uid, index), { text });
    });
    for (let index = chunks.length; index < remote.chunks.length; index++) transaction.delete(chunkDocument(uid, index));
    // Replace the whole field so the oversized legacy payload is removed atomically.
    // Other profile fields remain untouched.
    transaction.set(reference, { flashboltLibrary: {
      format: FLASHBOLT_STORAGE_FORMAT,
      chunkCount: chunks.length,
      byteLength: new TextEncoder().encode(chunks.join("")).byteLength,
      updatedAt: serverTimestamp(),
    } }, { mergeFields: ["flashboltLibrary"] });
    return JSON.parse(chunks.join("")) as T;
  }, { maxAttempts: 10 }));
}
