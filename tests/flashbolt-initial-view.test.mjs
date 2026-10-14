import assert from 'node:assert/strict';
import test from 'node:test';
import { initialFlashboltView } from '../src/pages/admin/flashbolt/initialView.ts';

test('direct edit reload starts in the editor rather than Home', () => {
  assert.equal(initialFlashboltView('/admin-dashboard/private-pages/flashbolt/fall-2026/itec-3600-operating-systems/chapter-2-os-structures-itec-3600/edit'), 'create');
  assert.equal(initialFlashboltView('/flashbolt/no-semester/unfiled/example/edit'), 'create');
});
test('initial view follows other workspace URLs', () => {
  const base = '/admin-dashboard/private-pages/flashbolt';
  assert.equal(initialFlashboltView(base), 'home');
  assert.equal(initialFlashboltView(base + '/folders'), 'folders');
  assert.equal(initialFlashboltView(base + '/fall-2026/course'), 'library');
  assert.equal(initialFlashboltView(base + '/fall-2026/course/set/helper'), 'helper');
});

test('every supported deep link starts directly in its requested view', () => {
  for (const base of ['/admin-dashboard/private-pages/flashbolt', '/flashbolt']) {
    for (const view of ['home', 'review', 'library', 'folders', 'create', 'guide', 'helper']) {
      assert.equal(initialFlashboltView(`${base}/${view}`), view);
    }
    assert.equal(initialFlashboltView(`${base}/fall-2026/course/create`), 'create');
    for (const folder of ['fall-2026/course', 'no-semester/unfiled']) {
      for (const [mode, view] of [['edit', 'create'], ['flashcards', 'set'], ['learn', 'learn'], ['test', 'test'], ['helper', 'helper']]) {
        assert.equal(initialFlashboltView(`${base}/${folder}/example/${mode}`), view);
      }
    }
  }
});
