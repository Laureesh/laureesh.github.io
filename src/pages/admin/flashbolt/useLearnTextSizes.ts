import { useEffect, useState, type CSSProperties } from "react";

const STORAGE_KEY = "flashbolt.local.v1.learnTextSizes";
export const GROUPS = [
  ["question", "Question title"],
  ["answers", "Answer choices & inputs"],
  ["feedback", "Feedback & explanations"],
  ["header", "Header & progress"],
  ["knowledge", "Knowledge panel"],
  ["rounds", "Rounds panel"],
  ["other", "Labels, setup & summary"],
] as const;
type Group = typeof GROUPS[number][0];
type TextSizes = Record<Group, number>;
export const defaults = () => Object.fromEntries(GROUPS.map(([key]) => [key, 100])) as TextSizes;

export function useLearnTextSizes() {
  const [sizes, setSizes] = useState<TextSizes>(() => {
    const result = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      for (const [key] of GROUPS) {
        if (typeof saved?.[key] === "number" && Number.isFinite(saved[key])) {
          result[key] = Math.max(75, Math.min(200, Math.round(saved[key] / 5) * 5));
        }
      }
    } catch { /* Use defaults when saved preferences are unavailable. */ }
    return result;
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes)); }
    catch { /* Keep preferences for this session if storage is unavailable. */ }
  }, [sizes]);
  const style = Object.fromEntries(GROUPS.map(([key]) => [`--learn-size-${key}`, sizes[key] / 100])) as CSSProperties;
  return { sizes, setSizes, style };
}

