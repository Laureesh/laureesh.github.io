import { getDoc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
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

export async function mergeAndSaveFlashboltLibrary<T>(uid: string, localData: T, merge: (cloudData: T, localData: T) => T) {
  if (!db) throw new Error("Firebase Firestore is not configured.");
  const reference = flashboltLibraryDocument(uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const cloudData = snapshot.exists() ? snapshot.data().flashboltLibrary?.data as T | undefined : undefined;
    const mergedData = cloudData === undefined ? localData : merge(cloudData, localData);
    const firestoreSafeData = JSON.parse(JSON.stringify(mergedData)) as T;
    transaction.set(reference, {
      flashboltLibrary: {
        data: firestoreSafeData,
        updatedAt: serverTimestamp(),
      },
    }, { merge: true });
    return firestoreSafeData;
  });
}
