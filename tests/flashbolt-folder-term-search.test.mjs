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

test('folder search includes disabled questions and correct answers, but excludes other folders', () => {
  const results = searchFolderTerms(sets, ['a', 'b', 'a'], '  MITOCHONDRIA  ');
  assert.deepEqual(results.map(result => result.card.id), ['disabled', 'answer']);
  assert.equal(results[1].index, 0);
  assert.equal(results[1].set.id, 'b');
});

test('subject search stays inside the folder and normalizes subject names', () => {
  assert.deepEqual(searchFolderTerms(sets, ['a', 'b'], 'mitochondria', 'biology').map(result => result.card.id), ['disabled']);
  assert.deepEqual(searchFolderTerms(sets, ['general'], 'mitochondria', 'General').map(result => result.card.id), ['pairs']);
});

test('empty and unmatched searches have no folder results; single-set empty search retains cards', () => {
  assert.deepEqual(searchFolderTerms(sets, ['a'], '  '), []);
  assert.deepEqual(searchFolderTerms(sets, ['a'], 'absent'), []);
  assert.equal(matchesTermSearch(card('a'), ''), true);
  assert.equal(matchesTermSearch(card('a'), 'answer'), true);
});


test('wrong choices never match, while every explicit correct answer can match', () => {
  const question = card('aws', { term: 'Which service queries S3?', definition: 'Legacy answer', answerChoices: ['Athena', 'QuickSight', 'Glue'], correctAnswers: ['Athena', 'Glue'] });
  const search = query => searchFolderTerms([{ id: 'aws', subject: 'AWS', cards: [question] }], ['aws'], query);
  assert.equal(search('quicksight').length, 0);
  assert.equal(search('legacy').length, 0);
  assert.equal(search('athena').length, 1);
  assert.equal(search('glue').length, 1);
  assert.equal(search('queries').length, 1);
  assert.equal(matchesTermSearch(question, 'quicksight'), true);
});

test('definition supplies the correct answer when explicit answers are absent', () => {
  const question = card('aws', { term: 'Which service queries S3?', definition: 'Athena', answerChoices: ['Athena', 'QuickSight'] });
  const search = query => searchFolderTerms([{ id: 'aws', subject: 'AWS', cards: [question] }], ['aws'], query);
  assert.equal(search('athena').length, 1);
  assert.equal(search('quicksight').length, 0);
});

test('embedded wrong choices are excluded from the question text', () => {
  const question = card('embedded', { term: 'Which service queries S3? Answer choices: A. Athena B. QuickSight', definition: 'Athena' });
  const search = query => searchFolderTerms([{ id: 'aws', subject: 'AWS', cards: [question] }], ['aws'], query);
  assert.equal(search('quicksight').length, 0);
  assert.equal(search('athena').length, 1);
});
