import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { encodeNotebook, decodeNotebook, NOTEBOOK_CHUNK_BYTES } from '../src/services/notebookStorage.ts';

// Exercise the real service with an atomic in-memory Firestore boundary.
let documents = new Map();
let failCommit = false;
let beforeRetry;
let writes = 0;
globalThis.__notebookFirestore = {
  documentRef: (path, id) => ({ path: `${path}/${id}`, firestore: {} }),
  serverTimestamp: () => 'server timestamp',
  async runTransaction(_db, callback) {
    for (;;) {
      const pending = new Map(documents);
      let writing = false;
      let count = 0;
      const result = await callback({
        async get(ref) {
          assert.equal(writing, false, 'all reads must precede writes');
          const data = documents.get(ref.path);
          return { exists: () => data !== undefined, data: () => structuredClone(data) };
        },
        set(ref, data) {
          writing = true;
          assert.ok(Buffer.byteLength(JSON.stringify(data)) < 1048576, 'document stays below Firestore limit');
          pending.set(ref.path, structuredClone(data));
          count++;
        },
        delete(ref) { writing = true; pending.delete(ref.path); count++; },
      });
      if (beforeRetry) { const change = beforeRetry; beforeRetry = null; change(); continue; }
      if (failCommit) throw new Error('simulated network failure');
      documents = pending;
      writes = count;
      return result;
    }
  },
};
const stub = 'data:text/javascript,' + encodeURIComponent('export const {documentRef,serverTimestamp,runTransaction}=globalThis.__notebookFirestore;');
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/services/notebookLibrary.ts')) {
    if (specifier === 'firebase/firestore' || specifier === '../firebase/firestore') return { url: stub, shortCircuit: true };
    if (specifier === './notebookStorage') return next('./notebookStorage.ts', context);
  }
  return next(specifier, context);
} });
const { loadNotebookLibrary, saveNotebookLibrary } = await import('../src/services/notebookLibrary.ts');
const root = 'users/test/notebook/library';
const note = (id, html = 'text') => ({ id, title: id, html, updatedAt: '2026-09-13T12:00:00Z', tags: [], attachments: [], versions: [] });
const library = (notes) => ({ notes, folders: [], deletedNoteIds: {}, deletedFolderIds: {} });

test('UTF-8 chunking preserves large notes, attachments, history, and Unicode exactly', () => {
  const data = library([{ ...note('large', '😀漢é'.repeat(200000)), attachments: [{ id: 'file', dataUrl: 'a'.repeat(900000) }], versions: Array.from({ length: 70 }, (_, i) => ({ id: String(i), html: 'version' })) }]);
  const chunks = encodeNotebook(data);
  assert.ok(chunks.length > 2);
  for (const chunk of chunks) assert.ok(Buffer.byteLength(chunk) <= NOTEBOOK_CHUNK_BYTES);
  assert.deepEqual(decodeNotebook({ format: 'chunked-v1', chunkCount: chunks.length, byteLength: Buffer.byteLength(JSON.stringify(data)) }, chunks), data);
});

test('legacy migration and repeat saves retain the entire library, including over 50 versions', async () => {
  const data = library([{ ...note('large', 'x'.repeat(1500000)), versions: Array.from({ length: 70 }, (_, i) => ({ id: String(i), html: 'old', title: 'old', savedAt: '2026-01-01' })) }]);
  documents = new Map([[root, { data: library([note('remote-only')]) }]]);
  assert.deepEqual(await loadNotebookLibrary('test'), library([note('remote-only')]));
  const saved = await saveNotebookLibrary('test', data);
  assert.equal(saved.notes.length, 2);
  assert.equal(saved.notes.find(n => n.id === 'large').versions.length, 70);
  assert.equal(documents.get(root).data, undefined);
  assert.deepEqual(await loadNotebookLibrary('test'), saved);
  await saveNotebookLibrary('test', saved);
  assert.equal(writes, 1, 'unchanged chunks are not rewritten');
  assert.deepEqual(await loadNotebookLibrary('test'), saved);
});

test('failed migration leaves legacy data untouched', async () => {
  const old = { data: library([note('remote')]) };
  documents = new Map([[root, old]]);
  failCommit = true;
  await assert.rejects(saveNotebookLibrary('test', library([note('new')])), /network failure/);
  failCommit = false;
  assert.deepEqual([...documents], [[root, old]]);
});

test('transaction retry merges another device edit instead of losing it', async () => {
  documents = new Map([[root, { data: library([note('original')]) }]]);
  beforeRetry = () => documents.set(root, { data: library([note('original'), note('other-device')]) });
  await saveNotebookLibrary('test', library([note('local')]));
  assert.deepEqual((await loadNotebookLibrary('test')).notes.map(n => n.id).sort(), ['local', 'original', 'other-device']);
});

test('missing chunks fail closed on both reads and saves', async () => {
  documents = new Map([[root, { format: 'chunked-v1', chunkCount: 1, byteLength: 20 }]]);
  await assert.rejects(loadNotebookLibrary('test'), /missing/);
  await assert.rejects(saveNotebookLibrary('test', library([note('new')])), /missing/);
  assert.equal(documents.size, 1);
});

test('unknown formats and truncated content cannot silently replace cloud data', () => {
  assert.throws(() => decodeNotebook({ format: 'future' }, []), /newer storage format/);
  assert.throws(() => decodeNotebook({ format: 'chunked-v1', chunkCount: 1, byteLength: 99 }, ['{}']), /incomplete/);
});

test('shrinking the notebook removes unused chunks in the same commit', async () => {
  documents = new Map();
  await saveNotebookLibrary('test', library([note('large', 'x'.repeat(1500000))]));
  assert.ok(documents.size > 2);
  const smaller = library([]);
  smaller.deletedNoteIds.large = '2026-09-14T00:00:00Z';
  await saveNotebookLibrary('test', smaller);
  assert.equal(documents.size, 2);
  assert.deepEqual(await loadNotebookLibrary('test'), smaller);
});

test('failed chunked update preserves the last complete cloud notebook', async () => {
  documents = new Map();
  const original = await saveNotebookLibrary('test', library([note('large', 'x'.repeat(1500000))]));
  const before = structuredClone([...documents]);
  failCommit = true;
  await assert.rejects(saveNotebookLibrary('test', library([note('new')])), /network failure/);
  failCommit = false;
  assert.deepEqual([...documents], before);
  assert.deepEqual(await loadNotebookLibrary('test'), original);
});

test('legacy writes from an older tab are recovered alongside chunked notes', async () => {
  documents = new Map();
  await saveNotebookLibrary('test', library([note('migrated')]));
  documents.get(root).data = library([note('old-tab')]);
  assert.equal((await loadNotebookLibrary('test')).notes.length, 2);
  await saveNotebookLibrary('test', library([note('new-tab')]));
  assert.deepEqual((await loadNotebookLibrary('test')).notes.map(n => n.id).sort(), ['migrated', 'new-tab', 'old-tab']);
  assert.equal(documents.get(root).data, undefined);
});

if (process.env.NOTEBOOK_BACKUP_PATH) {
  test('provided private backup survives actual service migration and repeat sync unchanged', async () => {
    const { readFileSync } = await import('node:fs');
    const bytes = readFileSync(process.env.NOTEBOOK_BACKUP_PATH);
    const backup = JSON.parse(bytes);
    documents = new Map();
    await saveNotebookLibrary('test', backup);
    assert.deepEqual(await loadNotebookLibrary('test'), backup);
    await saveNotebookLibrary('test', backup);
    assert.deepEqual(await loadNotebookLibrary('test'), backup);
    assert.deepEqual(readFileSync(process.env.NOTEBOOK_BACKUP_PATH), bytes);
  });
}
