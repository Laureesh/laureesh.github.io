import { getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { documentRef } from "../firebase/firestore";

type FlashboltLibraryRecord = {
  data: unknown;
  updatedAt?: unknown;
};

function flashboltLibraryDocument(uid: string) {
  return documentRef<FlashboltLibraryRecord>(`users/${uid}/private_apps`, "flashbolt");
}

export async function loadFlashboltLibrary(uid: string) {
  const snapshot = await getDoc(flashboltLibraryDocument(uid));
  return snapshot.exists() ? snapshot.data().data : null;
}

export async function saveFlashboltLibrary(uid: string, data: unknown) {
  // JSON serialization also removes optional properties whose value is undefined,
  // which Firestore does not accept inside nested objects.
  const firestoreSafeData = JSON.parse(JSON.stringify(data)) as unknown;
  await setDoc(flashboltLibraryDocument(uid), {
    data: firestoreSafeData,
    updatedAt: serverTimestamp(),
  });
}
