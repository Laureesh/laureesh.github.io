import { getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { documentRef } from "../firebase/firestore";

type NotebookRecord = { data?: unknown; updatedAt?: unknown };

function notebookDocument(uid: string) {
  return documentRef<NotebookRecord>(`users/${uid}/notebook`, "library");
}

export async function loadNotebookLibrary(uid: string) {
  const snapshot = await getDoc(notebookDocument(uid));
  return snapshot.exists() ? snapshot.data().data ?? null : null;
}

export async function saveNotebookLibrary(uid: string, data: unknown) {
  const safeData = JSON.parse(JSON.stringify(data)) as unknown;
  await setDoc(notebookDocument(uid), { data: safeData, updatedAt: serverTimestamp() }, { merge: true });
}
