export function describeNotebookSyncError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code).replace(/^firestore\//, "") : "";
  const message = error instanceof Error ? error.message : "Cloud save failed.";
  const detail = code ? `${code}: ${message}` : message;
  if (/maximum.*(?:size|bytes)|too large|1048576|1\s*mib/i.test(message)) return `The notebook exceeds the cloud document size limit. Download a backup and share this error so storage can be repaired without removing notes. ${detail}`;
  if (code === "permission-denied") return `Firebase rejected access to this notebook. Your sign-in and the deployed notebook permissions need checking. ${detail}`;
  if (code === "unauthenticated") return `Your sign-in has expired. Download a backup, sign in again, then retry. ${detail}`;
  if (["unavailable", "deadline-exceeded"].includes(code)) return `The cloud service could not be reached. Check your connection, then retry. ${detail}`;
  if (code === "resource-exhausted") return `Firebase reports a quota or resource limit. ${detail}`;
  return detail;
}
