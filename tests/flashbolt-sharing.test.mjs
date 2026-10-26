import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeSharedSet, sharedSnapshot, sharedProgressKey, sharedStudyPath, validShareId } from '../src/pages/admin/flashbolt/sharing/sharedSet.ts';

const set = { id: 'private-id', title: 'Threads', description: 'Chapter 4', subject: 'OS', color: 'violet', updatedAt: 'today', folders: ['private'], mastered: { secret: true }, email: 'private@example.com', cards: [
  { id: 'q1', term: 'What do threads share?', definition: 'Code', questionType: 'multiple-choice', answerChoices: ['Code', 'Registers'], correctAnswers: ['Code'], explanation: 'Threads share process code.', references: ['Slide 2'], choiceExplanations: { Registers: 'Registers are per thread.' }, learnEnabled: true, secret: 'private', autoTypePreviousChoices: ['old'] },
] };
test('snapshot retains complete learning content and excludes private/editor fields', () => {
  const snapshot = sharedSnapshot(set);
  assert.equal(snapshot.id, 'shared-set');
  assert.equal(snapshot.cards[0].explanation, set.cards[0].explanation);
  assert.deepEqual(snapshot.cards[0].answerChoices, ['Code', 'Registers']);
  assert.deepEqual(snapshot.cards[0].references, ['Slide 2']);
  assert.deepEqual(snapshot.cards[0].choiceExplanations, { Registers: 'Registers are per thread.' });
  for (const hidden of ['private-id', 'private@example.com', 'secret', 'autoTypePreviousChoices', 'folders', 'mastered']) assert(!encodeSharedSet(set).includes(hidden), hidden);
  snapshot.cards[0].answerChoices.push('new');
  assert.equal(set.cards[0].answerChoices.length, 2);
});
test('empty/malformed/duplicate/oversized sets fail before publishing', () => {
  for (const bad of [null, {}, { ...set, title: '' }, { ...set, cards: [] }, { ...set, cards: [{ id: 'bad' }] }, { ...set, cards: [set.cards[0], set.cards[0]] }, { ...set, description: '🦊'.repeat(250000) }]) assert.throws(() => encodeSharedSet(bad));
});
test('unsafe image protocols are excluded while valid study images remain', () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>']) assert.equal(sharedSnapshot({ ...set, cards: [{ ...set.cards[0], imageData: url }] }).cards[0].imageData, undefined);
  const imageData = 'data:image/png;base64,AAAA';
  assert.equal(sharedSnapshot({ ...set, cards: [{ ...set.cards[0], imageData }] }).cards[0].imageData, imageData);
});
test('links and progress are isolated by share and revision', () => {
  const id = 'Abcdefghijklmnopqrst';
  assert(validShareId(id)); assert(!validShareId('../private')); assert(!validShareId(''));
  assert.equal(sharedStudyPath(id), `/flashbolt/shared/${id}/learn`);
  assert.notEqual(sharedProgressKey(id, '1'), sharedProgressKey(id, '2'));
  assert.notEqual(sharedProgressKey(id, '1'), sharedProgressKey('OtherShare', '1'));
  assert(!sharedProgressKey(id, '1').startsWith('flashbolt.local'));
});
