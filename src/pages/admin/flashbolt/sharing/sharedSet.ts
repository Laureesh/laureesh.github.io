import type { Card, StudySet } from '../Flashbolt';

export const SHARED_SET_MAX_BYTES = 900_000;
export const validShareId = (id: string) => /^[A-Za-z0-9]{20}$/.test(id);
export const sharedStudyPath = (id: string, mode = 'learn') => `/flashbolt/shared/${id}/${mode}`;
export const sharedProgressKey = (id: string, revision: string) => `flashbolt.shared.${id}.${revision}`;

const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Explicit allowlist: never publish folders, account data, progress or editor metadata.
export function sharedSnapshot(value: unknown): StudySet {
  if (!record(value) || typeof value.title !== 'string' || !value.title.trim() || !Array.isArray(value.cards) || !value.cards.length) {
    throw new Error('Add a title and at least one card before sharing.');
  }
  const ids = new Set<string>();
  const cards: Card[] = value.cards.map((item: unknown) => {
    if (!record(item) || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.term !== 'string' || typeof item.definition !== 'string') throw new Error('This set contains an invalid card.');
    ids.add(item.id);
    const card: Card = { id: item.id, term: item.term, definition: item.definition };
    for (const key of ['explanation', 'termLanguage', 'definitionLanguage', 'imageName'] as const) {
      if (typeof item[key] === 'string') card[key] = item[key];
    }
    for (const key of ['references', 'answerChoices', 'correctAnswers'] as const) {
      if (strings(item[key])) card[key] = [...item[key]];
    }
    if (typeof item.learnEnabled === 'boolean') card.learnEnabled = item.learnEnabled;
    if (typeof item.questionType === 'string' && ['flashcard', 'multiple-choice', 'true-false', 'select-all', 'written', 'matching'].includes(item.questionType)) card.questionType = item.questionType as Card['questionType'];
    if (record(item.choiceExplanations)) card.choiceExplanations = Object.fromEntries(Object.entries(item.choiceExplanations).filter(([, text]) => typeof text === 'string')) as Record<string, string>;
    if (Array.isArray(item.matchingPairs)) card.matchingPairs = item.matchingPairs.filter((pair): pair is { id: string; left: string; right: string } => record(pair) && typeof pair.id === 'string' && typeof pair.left === 'string' && typeof pair.right === 'string').map(pair => ({ id: pair.id, left: pair.left, right: pair.right }));
    if (typeof item.imageData === 'string' && /^(https?:\/\/|data:image\/(png|jpeg|gif|webp);base64,)/i.test(item.imageData)) card.imageData = item.imageData;
    return card;
  });
  return { id: 'shared-set', title: value.title, description: typeof value.description === 'string' ? value.description : '', subject: typeof value.subject === 'string' ? value.subject : '', color: typeof value.color === 'string' ? value.color : 'violet', updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '', cards };
}

export function encodeSharedSet(set: unknown): string {
  const payload = JSON.stringify(sharedSnapshot(set));
  if (new TextEncoder().encode(payload).length > SHARED_SET_MAX_BYTES) throw new Error('This set is too large to share. Reduce image sizes or split it into smaller sets, then try again.');
  return payload;
}
