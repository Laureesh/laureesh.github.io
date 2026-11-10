import type { Card, StudySet } from './Flashbolt';

export function matchesTermSearch(card: Card, search: string) {
  const query = search.trim().toLocaleLowerCase();
  return !query || [card.term, card.definition, ...(card.answerChoices ?? []), ...(card.correctAnswers ?? []),
    ...(card.matchingPairs ?? []).flatMap(pair => [pair.left, pair.right])]
    .some(value => value.toLocaleLowerCase().includes(query));
}

export function searchFolderTerms(sets: StudySet[], setIds: string[], search: string, subject = '') {
  if (!search.trim()) return [];
  const ids = new Set(setIds);
  return sets.filter(set => ids.has(set.id) && (!subject || (set.subject.trim() || 'General').toLocaleLowerCase() === subject.toLocaleLowerCase()))
    .flatMap(set => set.cards.flatMap((card, index) => matchesTermSearch(card, search) ? [{ set, card, index }] : []));
}
