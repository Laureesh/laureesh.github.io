export const SORT_OPTIONS = [
  ["updated", "Recently edited"], ["updated-asc", "Least recently edited"],
  ["created", "Newest created"], ["created-asc", "Oldest created"],
  ["date", "Note date: newest"], ["date-asc", "Note date: oldest"],
  ["title", "Title A–Z"], ["title-desc", "Title Z–A"],
  ["longest", "Longest notes"], ["shortest", "Shortest notes"],
  ["attachments", "Most attachments"],
] as const;
export type NoteSort = typeof SORT_OPTIONS[number][0];

type SortableNote = {
  id: string; title: string; html: string; pinned: boolean; noteDate?: string;
  createdAt: string; updatedAt: string; attachments: unknown[];
};

export function compareNotes(a: SortableNote, b: SortableNote, sort: NoteSort, pinnedFirst: boolean, wordCount: (html: string) => number) {
    const pinOrder = pinnedFirst ? Number(b.pinned) - Number(a.pinned) : 0;
    if (pinOrder) return pinOrder;
    let order = 0;
    switch (sort) {
      case "title": case "title-desc": order = a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }) * (sort === "title" ? 1 : -1); break;
      case "date": case "date-asc": order = (a.noteDate || a.createdAt.slice(0, 10)).localeCompare(b.noteDate || b.createdAt.slice(0, 10)) * (sort === "date" ? -1 : 1); break;
      case "created": case "created-asc": order = a.createdAt.localeCompare(b.createdAt) * (sort === "created" ? -1 : 1); break;
      case "longest": case "shortest": order = (wordCount(a.html) - wordCount(b.html)) * (sort === "longest" ? -1 : 1); break;
      case "attachments": order = b.attachments.length - a.attachments.length; break;
      default: order = a.updatedAt.localeCompare(b.updatedAt) * (sort === "updated" ? -1 : 1);
    }
    return order || a.id.localeCompare(b.id);
}
