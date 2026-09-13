// Leave ample room below Firestore's 1 MiB document limit for field/path overhead.
export const NOTEBOOK_CHUNK_BYTES = 700 * 1024;
export const NOTEBOOK_STORAGE_FORMAT = "chunked-v1";

export type NotebookRecord = {
  data?: unknown;
  format?: string;
  chunkCount?: number;
  byteLength?: number;
  updatedAt?: unknown;
};

export function encodeNotebook(data: unknown): string[] {
  const json = JSON.stringify(data);
  if (typeof json !== "string") throw new Error("Notebook data could not be serialized.");
  const chunks: string[] = [];
  let start = 0;
  let offset = 0;
  let bytes = 0;
  // Count UTF-8 bytes, and never split a surrogate pair between documents.
  for (const character of json) {
    const point = character.codePointAt(0)!;
    const size = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes + size > NOTEBOOK_CHUNK_BYTES) {
      chunks.push(json.slice(start, offset));
      start = offset;
      bytes = 0;
    }
    bytes += size;
    offset += character.length;
  }
  chunks.push(json.slice(start));
  return chunks;
}

export function notebookChunkCount(record: NotebookRecord): number {
  if (!record.format) return 0; // Original single-document notebooks.
  if (record.format !== NOTEBOOK_STORAGE_FORMAT) {
    throw new Error("This notebook uses a newer storage format. Refresh or update the app before syncing.");
  }
  if (!Number.isSafeInteger(record.chunkCount) || record.chunkCount! < 1 || !Number.isSafeInteger(record.byteLength) || record.byteLength! < 1) {
    throw new Error("The cloud notebook manifest is incomplete. Keep your backup and retry; cloud data has not been overwritten.");
  }
  return record.chunkCount!;
}

export function decodeNotebook(record: NotebookRecord, chunks: unknown[]): unknown {
  const count = notebookChunkCount(record);
  if (!count) return record.data ?? null;
  if (chunks.length !== count || chunks.some((chunk) => typeof chunk !== "string")) {
    throw new Error("Part of the cloud notebook is missing. Keep your backup and retry; cloud data has not been overwritten.");
  }
  const json = chunks.join("");
  if (new TextEncoder().encode(json).byteLength !== record.byteLength) {
    throw new Error("The cloud notebook is incomplete. Keep your backup and retry; cloud data has not been overwritten.");
  }
  return JSON.parse(json) as unknown;
}
