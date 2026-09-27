import assert from 'node:assert/strict';
import test from 'node:test';
import { groupFolderSets } from '../src/pages/admin/flashbolt/folderSetOrder.ts';

const sets = [
  { id: 'ch1', subject: 'Kahoot import - Chapter 1' },
  { id: 'ch2', subject: 'Kahoot import - Chapter 2' },
  { id: 'ch3-part1', subject: 'Kahoot import' },
  { id: 'ch3-part2', subject: 'Kahoot import' },
  { id: 'ch7', subject: 'Kahoot import - Chapter 7' },
  { id: 'ch11', subject: 'Kahoot import - Chapter 11' },
];
const order = input => groupFolderSets(input).flatMap(group => group.sets).map(set => set.id);

test('navigation follows displayed subject groups instead of global title or insertion order', () => {
  assert.deepEqual(order(sets), ['ch3-part1', 'ch3-part2', 'ch1', 'ch2', 'ch7', 'ch11']);
  assert.deepEqual(order([...sets].reverse()), ['ch3-part2', 'ch3-part1', 'ch1', 'ch2', 'ch7', 'ch11']);
});

test('filtered sets stay excluded and subject normalization matches the folder', () => {
  assert.deepEqual(order(sets.filter(set => set.id !== 'ch3-part2')), ['ch3-part1', 'ch1', 'ch2', 'ch7', 'ch11']);
  const groups = groupFolderSets([{ subject: '  ' }, { subject: 'General' }, { subject: 'general' }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].subject, 'General');
  assert.equal(groups[0].sets.length, 3);
});
