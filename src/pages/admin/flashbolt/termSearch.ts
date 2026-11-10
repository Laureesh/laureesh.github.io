import type { Card, StudySet } from './Flashbolt';
import { parseEmbeddedQuestion } from './note-parser.ts';

export function matchesTermSearch(card: Card, search: string) {
  const query = search.trim().toLocaleLowerCase();
  return !query || [card.term, card.definition, ...(card.answerChoices ?? []), ...(card.correctAnswers ?? []),
    ...(card.matchingPairs ?? []).flatMap(pair => [pair.left, pair.right])]
    .some(value => value.toLocaleLowerCase().includes(query));
}

function matchesFolderTermSearch(card: Card, search: string) {
  const query = search.trim().toLocaleLowerCase();
  const { prompt } = parseEmbeddedQuestion(card.term, card.definition, card.answerChoices);
  const answers = card.correctAnswers?.length ? card.correctAnswers : [card.definition];
  return [prompt, ...answers, ...(card.matchingPairs ?? []).flatMap(pair => [pair.left, pair.right])]
    .some(value => value.toLocaleLowerCase().includes(query));
}

export function searchFolderTerms(sets: StudySet[], setIds: string[], search: string, subject = '') {
  if (!search.trim()) return [];
  const ids = new Set(setIds);
  return sets.filter(set => ids.has(set.id) && (!subject || (set.subject.trim() || 'General').toLocaleLowerCase() === subject.toLocaleLowerCase()))
    .flatMap(set => set.cards.flatMap((card, index) => matchesFolderTermSearch(card, search) ? [{ set, card, index }] : []));
}
