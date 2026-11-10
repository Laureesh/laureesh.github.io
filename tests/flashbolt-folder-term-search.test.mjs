import assert from 'node:assert/strict';
import test from 'node:test';
import { searchFolderTerms, matchesTermSearch } from '../src/pages/admin/flashbolt/termSearch.ts';

const card = (id, extra = {}) => ({ id, term: 'Question', definition: 'Answer', ...extra });
const sets = [
  { id: 'a', subject: ' Biology ', cards: [card('disabled', { term: 'Mitochondria', learnEnabled: false }), card('choice', { answerChoices: ['Mitochondria'] })] },
  { id: 'b', subject: 'Chemistry', cards: [card('answer', { correctAnswers: ['Mitochondria'] })] },
  { id: 'outside', subject: 'Biology', cards: [card('outside', { definition: 'Mitochondria' })] },
  { id: 'general', subject: '', cards: [card('pairs', { matchingPairs: [{ id: 'p', left: 'Cell', right: 'Mitochondria' }] })] },
];

test('folder search includes disabled questions and choices, but excludes other folders', () => {
  const results = searchFolderTerms(sets, ['a', 'b', 'a'], '  MITOCHONDRIA  ');
  assert.deepEqual(results.map(result => result.card.id), ['disabled', 'choice', 'answer']);
  assert.equal(results[1].index, 1);
  assert.equal(results[1].set.id, 'a');
});

test('subject search stays inside the folder and normalizes subject names', () => {
  assert.deepEqual(searchFolderTerms(sets, ['a', 'b'], 'mitochondria', 'biology').map(result => result.card.id), ['disabled', 'choice']);
  assert.deepEqual(searchFolderTerms(sets, ['general'], 'mitochondria', 'General').map(result => result.card.id), ['pairs']);
});

test('empty and unmatched searches have no folder results; single-set empty search retains cards', () => {
  assert.deepEqual(searchFolderTerms(sets, ['a'], '  '), []);
  assert.deepEqual(searchFolderTerms(sets, ['a'], 'absent'), []);
  assert.equal(matchesTermSearch(card('a'), ''), true);
  assert.equal(matchesTermSearch(card('a'), 'answer'), true);
});
