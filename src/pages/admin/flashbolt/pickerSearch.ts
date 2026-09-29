function tokens(text: string): string[] {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase().match(/\p{L}+|\p{N}+/gu) ?? [];
}

/** Match adjacent words, with exact numbers so chapter 3 cannot match 3600. */
export function matchesPickerSearch(query: string, ...fields: string[]): boolean {
  const requested = tokens(query);
  if (!requested.length) return true;
  return fields.some(field => {
    const words = tokens(field);
    return words.some((_, start) => requested.every((word, offset) => {
      const candidate = words[start + offset];
      return /^\p{N}+$/u.test(word) ? candidate === word : candidate?.startsWith(word);
    }));
  });
}
