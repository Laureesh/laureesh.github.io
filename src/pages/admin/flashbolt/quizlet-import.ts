export type QuizletImportCard = {
  term: string;
  definition: string;
};

export type QuizletImportSet = {
  sourceId: string;
  title: string;
  description: string;
  subject: string;
  cards: QuizletImportCard[];
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" ? value as UnknownRecord : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstResponse(payload: unknown) {
  const root = asRecord(payload);
  const response = asArray(root?.responses)[0];
  return asRecord(response);
}

function responseModels(payload: unknown) {
  return asRecord(firstResponse(payload)?.models);
}

function textFromSide(value: unknown) {
  const side = asRecord(value);
  const media = asArray(side?.media);
  for (const entry of media) {
    const item = asRecord(entry);
    const plainText = asString(item?.plainText);
    if (plainText) return plainText;
  }
  return "";
}

export function parseQuizletSetLink(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname !== "quizlet.com") return null;

  const setId = url.pathname.split("/").find((part) => /^\d+$/.test(part));
  if (!setId) return null;

  return {
    setId,
    canonicalUrl: `https://quizlet.com/${setId}/flash-cards/`,
  };
}

export function quizletPagingDetails(payload: unknown) {
  const paging = asRecord(firstResponse(payload)?.paging);
  return {
    total: typeof paging?.total === "number" ? paging.total : 0,
    token: asString(paging?.token) || undefined,
  };
}

export function parseQuizletCardsPayload(payload: unknown): QuizletImportCard[] {
  const items = asArray(responseModels(payload)?.studiableItem);
  const cards: QuizletImportCard[] = [];

  for (const value of items) {
    const item = asRecord(value);
    const sides = asArray(item?.cardSides);
    const labeledSides = new Map<string, unknown>();
    for (const side of sides) {
      const sideRecord = asRecord(side);
      const label = asString(sideRecord?.label).toLowerCase();
      if (label) labeledSides.set(label, side);
    }

    const term = textFromSide(labeledSides.get("word") ?? labeledSides.get("term") ?? sides[0]);
    const definition = textFromSide(labeledSides.get("definition") ?? sides[1]);
    if (term && definition) cards.push({ term, definition });
  }

  return cards;
}

export function parseQuizletImport(
  setId: string,
  metadataPayload: unknown,
  cards: QuizletImportCard[],
): QuizletImportSet {
  const setValue = asArray(responseModels(metadataPayload)?.set)[0];
  const set = asRecord(setValue);
  const title = asString(set?.title) || `Quizlet set ${setId}`;
  const description = asString(set?.description);

  return {
    sourceId: setId,
    title,
    description,
    subject: "Quizlet import",
    cards,
  };
}
