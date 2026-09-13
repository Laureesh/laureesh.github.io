export function clipboardTextToHtml(text: string): string {
  if (!text.trim()) return "<p><br></p>";
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\r\n?/g, "\n").replace(/\n/g, "<br>")}</p>`;
}

export async function readClipboardNote(): Promise<string> {
  try {
    return clipboardTextToHtml(await navigator.clipboard.readText());
  } catch {
    // Clipboard access can be unavailable, denied, or cancelled.
    return "<p><br></p>";
  }
}
