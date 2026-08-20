import { getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { documentRef } from "../firebase/firestore";

type FlashboltUserRecord = {
  flashboltLibrary?: {
    data: unknown;
    updatedAt?: unknown;
  };
};

function flashboltLibraryDocument(uid: string) {
  return documentRef<FlashboltUserRecord>("users", uid);
}

export async function loadFlashboltLibrary(uid: string) {
  const snapshot = await getDoc(flashboltLibraryDocument(uid));
  return snapshot.exists() ? snapshot.data().flashboltLibrary?.data ?? null : null;
}

export async function saveFlashboltLibrary(uid: string, data: unknown) {
  // JSON serialization also removes optional properties whose value is undefined,
  // which Firestore does not accept inside nested objects.
  const firestoreSafeData = JSON.parse(JSON.stringify(data)) as unknown;
  await setDoc(
    flashboltLibraryDocument(uid),
    {
      flashboltLibrary: {
        data: firestoreSafeData,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true },
  );
}
