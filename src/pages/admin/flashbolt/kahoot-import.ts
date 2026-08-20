export type KahootImportCard = {
  term: string;
  definition: string;
  answerChoices?: string[];
};

export type KahootImportSet = {
  sourceId: string;
  title: string;
  description: string;
  subject: string;
  cards: KahootImportCard[];
};

type UnknownRecord = Record<string, unknown>;

const KAHOOT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" ? value as UnknownRecord : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function decodeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseKahootQuizReference(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (KAHOOT_ID_PATTERN.test(trimmed)) {
    return {
      quizId: trimmed.toLowerCase(),
      canonicalUrl: `https://create.kahoot.it/details/${trimmed.toLowerCase()}`,
    };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname !== "kahoot.it" && !hostname.endsWith(".kahoot.it")) return null;

  const candidates = [
    ...url.pathname.split("/"),
    ...url.searchParams.values(),
  ];
  const quizId = candidates.find((part) => KAHOOT_ID_PATTERN.test(part));
  if (!quizId) return null;

  return {
    quizId: quizId.toLowerCase(),
    canonicalUrl: `https://create.kahoot.it/details/${quizId.toLowerCase()}`,
  };
}

export function parseKahootImport(quizId: string, payload: unknown): KahootImportSet {
  const quiz = asRecord(payload);
  const cards: KahootImportCard[] = [];

  for (const value of asArray(quiz?.questions).slice(0, 2_000)) {
    const question = asRecord(value);
    const term = decodeText(question?.question);
    const choices = asArray(question?.choices)
      .map((choiceValue) => {
        const choice = asRecord(choiceValue);
        return {
          answer: decodeText(choice?.answer),
          correct: choice?.correct === true,
        };
      })
      .filter((choice) => choice.answer);
    const correctAnswers = choices.filter((choice) => choice.correct).map((choice) => choice.answer);
    if (!term || !correctAnswers.length) continue;

    const answerChoices = [...new Set(choices.map((choice) => choice.answer))];
    cards.push({
      term,
      definition: correctAnswers.join("; "),
      ...(answerChoices.length >= 2 ? { answerChoices } : {}),
    });
  }

  return {
    sourceId: quizId,
    title: decodeText(quiz?.title) || `Kahoot quiz ${quizId}`,
    description: decodeText(quiz?.description),
    subject: "Kahoot import",
    cards,
  };
}
