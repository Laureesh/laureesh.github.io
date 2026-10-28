import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalSemester, similarFolderNames, findFolderNameConflict, folderLibraryConflict } from '../src/pages/admin/flashbolt/folderNames.ts';

test('semester spelling variants resolve to one fixed semester', () => {
  for (const name of ['Fall 2026', ' fall  2026 ', 'FALL-2026', 'Ｆａｌｌ ２０２６']) assert.equal(canonicalSemester(name), 'Fall 2026');
  assert.equal(canonicalSemester('Spring 2026'), 'Spring 2026');
  assert.equal(canonicalSemester(''), '');
  assert.equal(canonicalSemester('No semester'), '');
  assert.equal(canonicalSemester('Faal 2026'), null);
  assert.equal(canonicalSemester('Fall 2028'), null);
});

test('duplicates ignore formatting, accents, word order and small typos', () => {
  for (const [a, b] of [
    ['ITEC 4450', 'itec-4450'], ['Operating Systems', 'OperatingSystems'],
    ['Biology', 'Bioloyg'], ['Biology', 'Biolgy'], ['Operating Systems', 'Operatng Sytems'],
    ['Café', 'Cafe'], ['Science & Math', 'Science and Math'], ['Computer Science', 'Science Computer'],
  ]) assert.equal(similarFolderNames(a, b), true, `${a} / ${b}`);
});

test('different course numbers, levels, short names and unrelated courses remain distinct', () => {
  for (const [a, b] of [
    ['ITEC 4450', 'ITEC 4460'], ['Biology 1', 'Biology 2'], ['Calculus I', 'Calculus II'],
    ['Math', 'Path'], ['Chemistry', 'Geography'], ['Biology', 'Biology 2'],
  ]) assert.equal(similarFolderNames(a, b), false, `${a} / ${b}`);
});

test('creation, rename and moves check the destination semester and exclude the edited folder', () => {
  const folders = [{ id: 'a', name: 'Biology', semester: 'Fall 2026' }, { id: 'b', name: 'Physics', semester: 'Spring 2026' }];
  assert.equal(findFolderNameConflict(folders, 'Biolgy', 'fall-2026')?.id, 'a');
  assert.equal(findFolderNameConflict(folders, 'Biology', 'Fall 2026', 'a'), undefined);
  assert.equal(findFolderNameConflict(folders, 'Biology', 'Spring 2026'), undefined);
  assert.equal(findFolderNameConflict(folders, 'Biology', 'Fall 2026', 'b')?.id, 'a');
  assert.equal(findFolderNameConflict([{ id: 'c', name: 'Biology' }], 'biology', '')?.id, 'c');
});

test('backup restores reject duplicate folders and semester labels without changing data', () => {
  const folders = [{ id: 'a', name: 'Biology', semester: 'Fall 2026' }, { id: 'b', name: 'Physics', semester: 'Fall 2026' }];
  const snapshot = JSON.stringify(folders);
  assert.equal(folderLibraryConflict(folders), null);
  assert.match(folderLibraryConflict([...folders, { id: 'c', name: 'Biolgy', semester: 'Fall 2026' }]), /similar folders/);
  assert.match(folderLibraryConflict([...folders, { id: 'c', name: 'Math', semester: 'fall-2026' }]), /duplicate semester labels/);
  assert.equal(JSON.stringify(folders), snapshot);
});
