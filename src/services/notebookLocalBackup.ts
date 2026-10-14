const DATABASE = "flashbolt-notebook";
const STORE = "backups";
export const NOTEBOOK_LOCAL_KEY = "flashbolt.notebook.v1";

function openBackupDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other notebook tabs and retry the local backup."));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function loadLocalNotebookBackup(): Promise<unknown> {
  const database = await openBackupDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(NOTEBOOK_LOCAL_KEY);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error("Local backup read failed."));
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { database.close(); }
}

// Serialize saves so an older snapshot cannot finish after a newer one.
let pending: Promise<void> = Promise.resolve();
export function saveLocalNotebookBackup(data: unknown): Promise<void> {
  const snapshot = structuredClone(data);
  const save = pending.catch(() => {}).then(async () => {
    const database = await openBackupDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, "readwrite");
        transaction.objectStore(STORE).put(snapshot, NOTEBOOK_LOCAL_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error("Local backup write failed."));
        transaction.onerror = () => reject(transaction.error);
      });
      // Keep the legacy backup until its replacement has committed successfully.
      try { localStorage.removeItem(NOTEBOOK_LOCAL_KEY); } catch { /* Storage may be restricted. */ }
    } finally { database.close(); }
  });
  pending = save;
  return save;
}
