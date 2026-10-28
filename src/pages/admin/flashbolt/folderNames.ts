interface NamedFolder { id: string; name: string; semester?: string }

export const SEMESTER_OPTIONS = Array.from({ length: 8 }, (_, index) => 2020 + index)
  .flatMap(year => ["Spring", "Summer", "Fall"].map(term => `${term} ${year}`));

function words(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter(Boolean);
}

export function normalizedName(value: string) { return words(value).join(""); }

export function canonicalSemester(value: string) {
  const key = normalizedName(value);
  if (!key || key === "nosemester") return "";
  return SEMESTER_OPTIONS.find(option => normalizedName(option) === key) ?? null;
}

// Restricted Damerau-Levenshtein also catches adjacent letter transpositions.
function editDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, i) =>
    Array.from({ length: right.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[left.length][right.length];
}

export function similarFolderNames(left: string, right: string) {
  const a = normalizedName(left);
  const b = normalizedName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  // Course numbers and Roman-numeral levels identify distinct courses.
  const identifiers = (value: string) => [
    ...(value.match(/\d+/g) ?? []),
    ...words(value).filter(word => /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(word)),
  ].join("|");
  if (identifiers(left) !== identifiers(right)) return false;
  if (words(left).sort().join(" ") === words(right).sort().join(" ")) return true;
  const length = Math.min(a.length, b.length);
  if (length < 5) return false;
  const tolerance = length >= 12 ? 2 : 1;
  return Math.abs(a.length - b.length) <= tolerance && editDistance(a, b) <= tolerance;
}

function semesterKey(value: string) {
  return normalizedName(canonicalSemester(value) ?? value);
}

export function findFolderNameConflict<T extends NamedFolder>(
  folders: T[], name: string, semester: string, editingId: string | null = null,
): T | undefined {
  return folders.find(folder => folder.id !== editingId
    && semesterKey(folder.semester ?? "") === semesterKey(semester)
    && similarFolderNames(folder.name, name));
}

export function folderLibraryConflict(folders: NamedFolder[]): string | null {
  const labels = new Map<string, string>();
  for (let index = 0; index < folders.length; index++) {
    const folder = folders[index];
    const label = folder.semester ?? "";
    const key = semesterKey(label);
    if (labels.has(key) && labels.get(key) !== label) {
      return `The backup has duplicate semester labels: “${labels.get(key) || "No semester"}” and “${label || "No semester"}”. Use one spelling before restoring.`;
    }
    labels.set(key, label);
    const conflict = findFolderNameConflict(folders.slice(0, index), folder.name, label);
    if (conflict) return `The backup has similar folders: “${folder.name}” and “${conflict.name}” in ${label || "No semester"}. Rename one before restoring.`;
  }
  return null;
}
