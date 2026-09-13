export type NotebookDraftSource = {
  title: string;
  text: string;
  subject: string;
  returnTo: string;
  attachmentCount: number;
};

export const notebookDraftKey = (userId: string, draftId: string) =>
  `flashbolt.notebook-draft.${encodeURIComponent(userId)}.${encodeURIComponent(draftId)}`;

/** Keep block boundaries so separate definitions do not become one card. */
export function notebookHtmlToText(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script, style, iframe, object").forEach(node => node.remove());
  document.querySelectorAll("br").forEach(node => node.replaceWith("\n"));
  document.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6, blockquote, pre, tr").forEach(node => node.append("\n\n"));
  document.querySelectorAll("td, th").forEach(node => node.append("\t"));
  return (document.body.textContent ?? "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isNotebookDraftSource(value: unknown): value is NotebookDraftSource {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<NotebookDraftSource>;
  return typeof source.title === "string" && typeof source.text === "string"
    && typeof source.subject === "string" && typeof source.returnTo === "string"
    && source.returnTo.startsWith("/admin-dashboard/private-pages/notebook/note/")
    && typeof source.attachmentCount === "number";
}
