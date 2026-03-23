import {
  addDoc,
  deleteDoc,
  setDoc,
  updateDoc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type PartialWithFieldValue,
  type UpdateData,
} from "firebase/firestore";
import { readDocument } from "../firebase/firestore";

export async function getRecord<T extends DocumentData>(reference: DocumentReference<T>) {
  return readDocument(reference);
}

export async function createRecord<T extends DocumentData>(
  reference: CollectionReference<T>,
  data: T,
) {
  return addDoc(reference, data);
}

export async function setRecord<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: T,
) {
  await setDoc(reference, data);
}

export async function mergeRecord<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: PartialWithFieldValue<T>,
) {
  await setDoc(reference, data, { merge: true });
}

export async function updateRecord<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: UpdateData<T>,
) {
  await updateDoc(reference, data);
}

export async function deleteRecord<T extends DocumentData>(
  reference: DocumentReference<T>,
) {
  await deleteDoc(reference);
}
