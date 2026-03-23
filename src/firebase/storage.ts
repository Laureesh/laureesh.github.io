import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
  type UploadMetadata,
} from "firebase/storage";
import { storage } from "./app";

function cleanSegments(segments: Array<string | number | null | undefined>) {
  return segments
    .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== "")
    .map((segment) => String(segment).replace(/^\/+|\/+$/g, ""));
}

export function storagePath(...segments: Array<string | number | null | undefined>) {
  return cleanSegments(segments).join("/");
}

export function storageRef(path: string) {
  if (!storage) {
    throw new Error("Firebase Storage is not configured.");
  }

  return ref(storage, path);
}

export function userStoragePath(uid: string, ...segments: Array<string | number | null | undefined>) {
  return storagePath("users", uid, ...segments);
}

export function projectStoragePath(projectId: string, ...segments: Array<string | number | null | undefined>) {
  return storagePath("projects", projectId, ...segments);
}

export async function uploadFile(path: string, file: Blob, metadata?: UploadMetadata) {
  return uploadBytes(storageRef(path), file, metadata);
}

export async function getFileUrl(path: string) {
  return getDownloadURL(storageRef(path));
}

export async function removeFile(path: string) {
  await deleteObject(storageRef(path));
}
