import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { mergeReviewProgress } from '../src/pages/admin/flashbolt/review-engine.ts';
import { mergeSemesterVisibility, normalizeSemesterVisibility } from '../src/pages/admin/flashbolt/semesterVisibility.ts';

// Exercise the actual library transformations without mounting the React page.
const source = readFileSync(new URL('../src/pages/admin/flashbolt/Flashbolt.tsx', import.meta.url), 'utf8');
const functions = source.slice(source.indexOf('function withDataDefaults('), source.indexOf('function applyThemeToDocument('));
const compiled = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const { mergeLibraries, removeSetFromLibraryData, withDataDefaults } = new Function(
  'mergeReviewProgress', 'mergeSemesterVisibility', 'normalizeSemesterVisibility',
  `${compiled}; return { mergeLibraries, removeSetFromLibraryData, withDataDefaults };`,
)(mergeReviewProgress, mergeSemesterVisibility, normalizeSemesterVisibility);

const library = () => ({
  sets: [
    { id: 'aws', title: 'AWS-CCPv2', updatedAt: '2026-09-26T00:00:00Z', cards: [] },
    { id: 'keep', title: 'Keep me', updatedAt: '2026-09-26T00:00:00Z', cards: [] },
  ],
  folders: [{ id: 'cloud', setIds: ['aws', 'keep'] }],
  mastered: { aws: ['card'] },
  learnProgress: { aws: { cards: {}, updatedAt: '2026-09-26T00:00:00Z' } },
  activeLearn: { setId: 'aws' },
  sessions: 3,
});

function assertDeleted(data) {
  assert.deepEqual(data.sets.map(set => set.id), ['keep']);
  assert.deepEqual(data.deletedSetIds, ['aws']);
  assert.deepEqual(data.folders[0].setIds, ['keep']);
  assert.equal(data.mastered.aws, undefined);
  assert.equal(data.learnProgress.aws, undefined);
  assert.equal(data.activeLearn, undefined);
}

test('deleting a set survives cloud save, reload, and a stale device save', () => {
  const stale = library();
  const deleted = removeSetFromLibraryData(library(), 'aws');
  assertDeleted(deleted);
  const saved = mergeLibraries(stale, deleted);
  assertDeleted(saved);
  const reloaded = withDataDefaults(JSON.parse(JSON.stringify(saved)));
  assertDeleted(reloaded);
  assertDeleted(mergeLibraries(reloaded, stale));
  assertDeleted(mergeLibraries(stale, reloaded));
});

test('stale edits cannot resurrect a deleted set and repeat deletes remain stable', () => {
  const stale = library();
  stale.sets[0].updatedAt = '2027-01-01T00:00:00Z';
  const deleted = removeSetFromLibraryData(removeSetFromLibraryData(library(), 'aws'), 'aws');
  assertDeleted(mergeLibraries(deleted, stale));
});

test('legacy libraries without deletion records retain their sets', () => {
  const result = mergeLibraries(library(), library());
  assert.deepEqual(result.sets.map(set => set.id), ['aws', 'keep']);
  assert.deepEqual(result.deletedSetIds, []);
});
