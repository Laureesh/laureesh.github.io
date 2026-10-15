import assert from 'node:assert/strict';
import test from 'node:test';
import { withLibraryLoadTimeout } from '../src/pages/admin/flashbolt/libraryLoadTimeout.ts';

test('a stalled cloud request releases loading with an actionable error', async () => {
  await assert.rejects(withLibraryLoadTimeout(new Promise(() => {}), 10), /Cloud loading timed out/);
});
test('successful cloud reads preserve the library', async () => {
  const library = { sets: [{ id: 'saved-set' }] };
  assert.equal(await withLibraryLoadTimeout(Promise.resolve(library), 100), library);
});
test('cloud errors reach the existing local backup fallback', async () => {
  const error = new Error('offline');
  await assert.rejects(withLibraryLoadTimeout(Promise.reject(error), 100), error);
});
test('late cloud results cannot replace the timeout fallback', async () => {
  let resolve;
  const request = new Promise(done => { resolve = done; });
  const result = withLibraryLoadTimeout(request, 10).catch(() => 'local backup');
  assert.equal(await result, 'local backup');
  resolve('late cloud library');
  assert.equal(await result, 'local backup');
});
