import assert from 'node:assert/strict';
import test from 'node:test';
import { loadLocalNotebookBackup, saveLocalNotebookBackup, NOTEBOOK_LOCAL_KEY } from '../src/services/notebookLocalBackup.ts';

let stored;
let failWrite = false;
let failOpen = false;
let legacy = 'original backup';
let closes = 0;
globalThis.localStorage = { removeItem(key) { assert.equal(key, NOTEBOOK_LOCAL_KEY); legacy = null; } };
// Model the asynchronous transaction boundary, including abort after put succeeds.
globalThis.indexedDB = { open() {
  const request = {};
  setTimeout(() => {
    if (failOpen) { request.error = new Error('Unavailable'); request.onerror(); return; }
    request.result = {
      close() { closes++; },
      transaction(_store, mode) {
        const transaction = {};
        let candidate;
        let read;
        transaction.objectStore = () => ({
          get() { read = {}; return read; },
          put(value) { candidate = structuredClone(value); },
        });
        setTimeout(() => {
          if (mode === 'readwrite' && failWrite) {
            transaction.error = new Error('Quota exceeded');
            transaction.onabort();
          } else {
            if (mode === 'readwrite') stored = candidate;
            else read.result = structuredClone(stored);
            transaction.oncomplete();
          }
        }, 5);
        return transaction;
      },
    };
    request.onsuccess();
  }, 0);
  return request;
} };

test('large backups retain all attachments and history; migration waits for commit', async () => {
  const library = { notes: [{ html: 'x'.repeat(6 * 1024 * 1024), attachments: [{ dataUrl: 'image-data' }], versions: Array.from({ length: 215 }, (_, id) => ({ id, html: 'history' })) }] };
  const save = saveLocalNotebookBackup(library);
  assert.equal(legacy, 'original backup');
  await save;
  assert.equal(legacy, null);
  assert.deepEqual(await loadLocalNotebookBackup(), library);
  assert.equal(closes, 2);
});

test('aborted transaction preserves previous backup and legacy copy; retry recovers', async () => {
  const previous = structuredClone(stored);
  legacy = 'keep me';
  failWrite = true;
  await assert.rejects(saveLocalNotebookBackup({ notes: [] }), /Quota/);
  assert.deepEqual(stored, previous);
  assert.equal(legacy, 'keep me');
  failWrite = false;
  await saveLocalNotebookBackup({ notes: ['recovered'] });
  assert.deepEqual(await loadLocalNotebookBackup(), { notes: ['recovered'] });
});

test('queued snapshots save in order and cannot be mutated after submission', async () => {
  const first = { notes: ['first'] };
  const a = saveLocalNotebookBackup(first);
  first.notes[0] = 'mutation';
  const b = saveLocalNotebookBackup({ notes: ['latest'] });
  await a;
  assert.deepEqual(stored, { notes: ['first'] });
  await b;
  assert.deepEqual(stored, { notes: ['latest'] });
});

test('unavailable database reports read/write errors without deleting legacy backup', async () => {
  legacy = 'keep me too';
  failOpen = true;
  await assert.rejects(loadLocalNotebookBackup(), /Unavailable/);
  await assert.rejects(saveLocalNotebookBackup({ notes: [] }), /Unavailable/);
  assert.equal(legacy, 'keep me too');
  failOpen = false;
});
