export const NOTEBOOK_PREFERENCES_KEY = "flashbolt.notebook.v1.preferences";
export type NotebookPreferences = {
  readClipboard: boolean;
  defaultTitle: string;
  defaultView: "notes" | "calendar";
  showPreviews: boolean;
  fontSize: 16 | 18 | 20 | 22;
  automaticHistory: boolean;
  historyMinutes: 2 | 5 | 10;
};
export const DEFAULT_NOTEBOOK_PREFERENCES: NotebookPreferences = {
  readClipboard: true, defaultTitle: "Untitled note", defaultView: "notes",
  showPreviews: true, fontSize: 18, automaticHistory: true, historyMinutes: 2,
};
export function readNotebookPreferences(): NotebookPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTEBOOK_PREFERENCES_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return { ...DEFAULT_NOTEBOOK_PREFERENCES };
    return {
      readClipboard: typeof saved.readClipboard === "boolean" ? saved.readClipboard : true,
      defaultTitle: typeof saved.defaultTitle === "string" ? saved.defaultTitle.slice(0, 180) : "Untitled note",
      defaultView: saved.defaultView === "calendar" ? "calendar" : "notes",
      showPreviews: typeof saved.showPreviews === "boolean" ? saved.showPreviews : true,
      fontSize: [16, 18, 20, 22].includes(saved.fontSize) ? saved.fontSize : 18,
      automaticHistory: typeof saved.automaticHistory === "boolean" ? saved.automaticHistory : true,
      historyMinutes: [2, 5, 10].includes(saved.historyMinutes) ? saved.historyMinutes : 2,
    };
  } catch { return { ...DEFAULT_NOTEBOOK_PREFERENCES }; }
}
