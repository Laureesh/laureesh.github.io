export type ClipboardDestination = "title" | "body";
export const CLIPBOARD_SETTING_KEY = "flashbolt.notebook.v1.clipboardDestination";

export function readClipboardDestination(): ClipboardDestination {
  try { return localStorage.getItem(CLIPBOARD_SETTING_KEY) === "body" ? "body" : "title"; }
  catch { return "title"; }
}

export function clipboardTextToHtml(text: string): string {
  if (!text.trim()) return "<p><br></p>";
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\r\n?/g, "\n").replace(/\n/g, "<br>")}</p>`;
}

export function clipboardNoteChanges(text: string, destination: ClipboardDestination): { title?: string; html?: string } | null {
  if (!text.trim()) return null;
  return destination === "body"
    ? { html: clipboardTextToHtml(text) }
    : { title: text.replace(/\s+/g, " ").trim().slice(0, 180) };
}

export async function readClipboardNote(destination: ClipboardDestination) {
  try {
    return clipboardNoteChanges(await navigator.clipboard.readText(), destination);
  } catch {
    // Clipboard access can be unavailable, denied, or cancelled.
    return null;
  }
}
