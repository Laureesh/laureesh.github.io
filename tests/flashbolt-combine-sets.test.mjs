import assert from 'node:assert/strict';
import test from 'node:test';
import { combineStudySets } from '../src/pages/admin/flashbolt/combineSets.ts';

test('combining preserves card details and order while isolating the originals', () => {
  const sources = [
    { id: 'a', title: 'Part 1', subject: 'OS', color: 'amber', kahootUrl: 'https://kahoot.it', cards: [{ id: 'same', term: 'Q', definition: 'A', learnEnabled: false, references: ['url'], answerChoices: ['A', 'B'], matchingPairs: [{ id: 'pair', left: 'L', right: 'R' }] }] },
    { id: 'b', title: 'Part 2', subject: 'OS', color: 'blue', cards: [{ id: 'same', term: 'Q2', definition: 'A2', imageData: 'image', explanation: 'Because' }] },
  ];
  const before = structuredClone(sources);
  let sequence = 0;
  const combined = combineStudySets(sources, ' All parts ', prefix => `${prefix}-${++sequence}`);
  assert.equal(combined.title, 'All parts');
  assert.equal(combined.subject, 'OS');
  assert.equal(combined.kahootUrl, undefined);
  assert.equal(new Set(combined.cards.map(card => card.id)).size, 2);
  assert.deepEqual(combined.cards.map(({ id, ...card }) => card), sources.flatMap(set => set.cards.map(({ id, ...card }) => card)));
  combined.cards[0].references.push('new');
  combined.cards[0].matchingPairs[0].left = 'changed';
  assert.deepEqual(sources, before);
});

test('requires two sets and a nonempty title', () => {
  assert.throws(() => combineStudySets([], 'Combined', () => 'id'));
  assert.throws(() => combineStudySets([{}, {}], '  ', () => 'id'));
});
