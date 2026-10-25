export function referenceUrl(value: string): string | null {
  const text = value.trim();
  try {
    const url = new URL(text.startsWith("www.") ? `https://${text}` : text);
    return (url.protocol === "https:" || url.protocol === "http:") ? url.href : null;
  } catch {
    return null;
  }
}

