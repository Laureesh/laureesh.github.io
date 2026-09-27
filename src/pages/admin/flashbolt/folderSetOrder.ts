const subjectCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Preserve the selected set sort within each subject, as displayed in folders. */
export function groupFolderSets<T extends { subject: string }>(sets: T[]) {
  const groups = new Map<string, { subject: string; sets: T[] }>();
  for (const set of sets) {
    const subject = set.subject.trim() || "General";
    const key = subject.toLocaleLowerCase();
    const existing = groups.get(key);
    if (existing) existing.sets.push(set);
    else groups.set(key, { subject, sets: [set] });
  }
  return [...groups.values()].sort((a, b) => subjectCollator.compare(a.subject, b.subject));
}
