import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

// Exercise the real service with an atomic in-memory Firestore boundary.
let documents = new Map();
let failCommit = false;
let beforeRetry;
globalThis.__flashboltFirestore = {
  documentRef: (path, id) => ({ path: `${path}/${id}`, firestore: {} }),
  serverTimestamp: () => 'server timestamp',
  async runTransaction(_db, callback) {
    for (;;) {
      const pending = new Map(documents);
      let writing = false;
      const result = await callback({
        async get(ref) {
          assert.equal(writing, false, 'all reads must precede writes');
          const data = documents.get(ref.path);
          return { exists: () => data !== undefined, data: () => structuredClone(data) };
        },
        set(ref, data, options) {
          writing = true;
          assert.ok(Buffer.byteLength(JSON.stringify(data)) < 1048576, 'document stays below Firestore limit');
          pending.set(ref.path, structuredClone(options?.mergeFields ? { ...pending.get(ref.path), ...data } : data));
        },
        delete(ref) { writing = true; pending.delete(ref.path); },
      });
      if (beforeRetry) { const change = beforeRetry; beforeRetry = null; change(); continue; }
      if (failCommit) throw new Error('simulated network failure');
      documents = pending;
      return result;
    }
  },
};
const stub = 'data:text/javascript,' + encodeURIComponent('export const {documentRef,serverTimestamp,runTransaction}=globalThis.__flashboltFirestore;');
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/services/flashboltLibrary.ts')) {
    if (specifier === 'firebase/firestore' || specifier === '../firebase/firestore') return { url: stub, shortCircuit: true };
    if (specifier === './flashboltStorage') return next('./flashboltStorage.ts', context);
    if (specifier === './saveQueue') return next('./saveQueue.ts', context);
  }
  return next(specifier, context);
} });
const { loadFlashboltLibrary, mergeAndSaveFlashboltLibrary } = await import('../src/services/flashboltLibrary.ts');
const root = 'users/test';
const merge = (cloud, local) => ({ sets: [...cloud.sets, ...local.sets] });

test('concurrent saves merge against the preceding committed library', async () => {
  documents = new Map([[root, { flashboltLibrary: { data: { sets: [] } } }]]);
  await Promise.all([
    mergeAndSaveFlashboltLibrary('test', { sets: [{ id: 'first' }] }, merge),
    mergeAndSaveFlashboltLibrary('test', { sets: [{ id: 'second' }] }, merge),
  ]);
  assert.deepEqual((await loadFlashboltLibrary('test')).sets, [{ id: 'first' }, { id: 'second' }]);
});

test('large libraries migrate atomically, preserve profile and remote cards, and round trip Unicode', async () => {
  const old = { sets: [{ id: 'remote' }] };
  documents = new Map([[root, { name: 'Keep', flashboltLibrary: { data: old } }]]);
  assert.deepEqual(await loadFlashboltLibrary('test'), old);
  const local = { sets: [{ id: 'local', imageData: '😀漢é'.repeat(200000) }] };
  const saved = await mergeAndSaveFlashboltLibrary('test', local, merge);
  assert.equal(saved.sets.length, 2);
  assert.equal(documents.get(root).name, 'Keep');
  assert.equal(documents.get(root).flashboltLibrary.data, undefined);
  assert.deepEqual(await loadFlashboltLibrary('test'), saved);
  await mergeAndSaveFlashboltLibrary('test', old, (_remote, local) => local);
  assert.equal(documents.size, 2, 'obsolete chunks removed');
});

test('failed migration retains the original library', async () => {
  const old = { sets: [{ id: 'remote' }] };
  documents = new Map([[root, { flashboltLibrary: { data: old } }]]);
  failCommit = true;
  await assert.rejects(mergeAndSaveFlashboltLibrary('test', { sets: [] }, merge));
  failCommit = false;
  assert.deepEqual(await loadFlashboltLibrary('test'), old);
});

test('missing chunks block writes instead of overwriting the cloud backup', async () => {
  await mergeAndSaveFlashboltLibrary('test', { sets: [] }, merge);
  documents.delete('users/test/flashbolt/library-chunk-0');
  await assert.rejects(mergeAndSaveFlashboltLibrary('test', { sets: [] }, merge), /missing/);
});
