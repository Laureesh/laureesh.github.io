import assert from 'node:assert/strict';
import test from 'node:test';
import { pageTransitionKey } from '../src/components/pageTransitionKey.ts';

test('Flashbolt navigation preserves the mounted workspace, including adjacent editors', () => {
  const base = '/admin-dashboard/private-pages/flashbolt';
  for (const suffix of ['', '/library', '/fall-2026/operating-systems/chapter-1/edit', '/fall-2026/operating-systems/chapter-2/edit']) {
    assert.equal(pageTransitionKey(base + suffix), base);
  }
  assert.equal(pageTransitionKey('/flashbolt/library'), pageTransitionKey('/flashbolt/folders'));
});

test('Notebook stays mounted and unrelated pages retain distinct transition keys', () => {
  const notebook = '/admin-dashboard/private-pages/notebook';
  assert.equal(pageTransitionKey(notebook + '/folder/one'), notebook);
  assert.notEqual(pageTransitionKey('/about'), pageTransitionKey('/contact'));
  assert.equal(pageTransitionKey('/flashbolt-other'), '/flashbolt-other');
});
