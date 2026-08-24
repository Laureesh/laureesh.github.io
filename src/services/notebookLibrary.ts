import { getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { documentRef } from "../firebase/firestore";

type NotebookUserRecord = {
  notebookLibrary?: { data: unknown; updatedAt?: unknown };
};

function notebookDocument(uid: string) {
  return documentRef<NotebookUserRecord>("users", uid);
}

export async function loadNotebookLibrary(uid: string) {
  const snapshot = await getDoc(notebookDocument(uid));
  return snapshot.exists() ? snapshot.data().notebookLibrary?.data ?? null : null;
}

export async function saveNotebookLibrary(uid: string, data: unknown) {
  const safeData = JSON.parse(JSON.stringify(data)) as unknown;
  await setDoc(notebookDocument(uid), { notebookLibrary: { data: safeData, updatedAt: serverTimestamp() } }, { merge: true });
}
