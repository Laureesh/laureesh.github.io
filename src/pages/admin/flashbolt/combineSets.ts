import type { StudySet } from './Flashbolt';

export function combineStudySets(sets: StudySet[], title: string, makeId: (prefix: string) => string): StudySet {
  if (sets.length < 2 || !title.trim()) throw new Error('Choose at least two sets and enter a title.');
  return {
    id: makeId('set'),
    title: title.trim(),
    description: `Combined from: ${sets.map(set => set.title).join(', ')}`,
    subject: sets.every(set => set.subject === sets[0].subject) ? sets[0].subject : 'Combined study set',
    color: sets[0].color,
    updatedAt: new Date().toISOString(),
    cards: sets.flatMap(set => set.cards.map(card => ({ ...structuredClone(card), id: makeId('card') }))),
  };
}
