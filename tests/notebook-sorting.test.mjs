import assert from 'node:assert/strict';
import test from 'node:test';
import { compareNotes, SORT_OPTIONS } from '../src/pages/admin/notebook/noteSorting.ts';

const note = (id, changes = {}) => ({ id, title: id, html: '', pinned: false, createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z', attachments: [], ...changes });
const words = text => text.trim().split(/\s+/).filter(Boolean).length;
const ordered = (notes, sort, pinned = false) => [...notes].sort((a, b) => compareNotes(a, b, sort, pinned, words)).map(note => note.id);

test('titles use natural numbers and reverse alphabetic order', () => {
  const notes = [note('10', { title: 'Lesson 10' }), note('2', { title: 'lesson 2' })];
  assert.deepEqual(ordered(notes, 'title'), ['2', '10']);
  assert.deepEqual(ordered(notes, 'title-desc'), ['10', '2']);
});
test('creation, edit, and note dates are independent and reversible', () => {
  const notes = [note('a', { updatedAt: '2026-04-01', noteDate: '2026-05-01' }), note('b', { createdAt: '2026-03-01', updatedAt: '2026-02-01', noteDate: '2026-06-01' })];
  for (const [sort, expected] of [['created', ['b','a']], ['created-asc', ['a','b']], ['updated', ['a','b']], ['updated-asc', ['b','a']], ['date', ['b','a']], ['date-asc', ['a','b']]]) assert.deepEqual(ordered(notes, sort), expected);
});
test('missing and cleared note dates fall back to creation day', () => {
  const notes = [note('a', { noteDate: '' }), note('b', { createdAt: '2026-01-02T12:00:00Z' })];
  assert.deepEqual(ordered(notes, 'date'), ['b','a']);
});
test('pinned-first is optional for every sort mode', () => {
  const notes = [note('a'), note('z', { pinned: true })];
  for (const [sort] of SORT_OPTIONS) assert.equal(ordered(notes, sort, true)[0], 'z');
  assert.deepEqual(ordered(notes, 'title', false), ['a','z']);
});
test('content length and attachment counts sort independently', () => {
  const notes = [note('a', { html: 'three whole words' }), note('b', { html: 'one', attachments: [{}] }), note('c')];
  assert.deepEqual(ordered(notes, 'longest'), ['a','b','c']);
  assert.deepEqual(ordered(notes, 'shortest'), ['c','b','a']);
  assert.deepEqual(ordered(notes, 'attachments'), ['b','a','c']);
});
test('equal values have stable ordering without mutating notes', () => {
  const notes = [note('b'), note('a')];
  assert.deepEqual(ordered(notes, 'updated'), ['a','b']);
  assert.deepEqual(notes.map(note => note.id), ['b','a']);
});
