import {
  collection,
  doc,
  getDoc,
  query,
  serverTimestamp,
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Query,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./app";

export { Timestamp };

export function collectionRef<T extends DocumentData>(path: string) {
  if (!db) {
    throw new Error("Firebase Firestore is not configured.");
  }

  return collection(db, path) as CollectionReference<T>;
}

export function documentRef<T extends DocumentData>(path: string, id: string) {
  if (!db) {
    throw new Error("Firebase Firestore is not configured.");
  }

  return doc(db, path, id) as DocumentReference<T>;
}

export function typedQuery<T extends DocumentData>(path: string, ...constraints: QueryConstraint[]) {
  return query(collectionRef<T>(path), ...constraints) as Query<T>;
}

export async function readDocument<T extends DocumentData>(reference: DocumentReference<T>) {
  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export function timestampNow() {
  return Timestamp.now();
}

export function serverTimestampValue() {
  return serverTimestamp();
}
