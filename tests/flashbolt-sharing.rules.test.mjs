import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const requireTools = createRequire(process.env.FIREBASE_TEST_PACKAGE || new URL('../package.json', import.meta.url));
const { initializeTestEnvironment, assertFails, assertSucceeds } = requireTools('@firebase/rules-unit-testing');
const firestore = requireTools('firebase/firestore');
const { doc, getDoc, setDoc, getDocs, collection, deleteDoc, serverTimestamp } = firestore;
let env;
const projectId = 'demo-flashbolt-sharing';
const uid = 'sharing-owner';
const otherUid = 'other-admin';
const shareId = 'Abcdefghijklmnopqrst';
const data = () => ({ ownerId: uid, version: 1, revision: 'v1', payload: '{}', updatedAt: serverTimestamp() });
const publicDoc = (db, id = shareId) => doc(db, 'sharedFlashboltSets', id);
before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8088, rules: readFileSync(new URL('../src/firebase/firestore.rules', import.meta.url), 'utf8') } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const id of [uid, otherUid]) await setDoc(doc(db, 'users', id), { role: 'admin', status: 'active' });
    await setDoc(doc(db, 'users', 'member'), { role: 'member', status: 'active' });
    await setDoc(doc(db, 'users', 'suspended'), { role: 'admin', status: 'suspended' });
    await setDoc(doc(db, 'users', uid, 'flashbolt', 'library-chunk-0'), { text: 'PRIVATE LIBRARY' });
  });
});
after(async () => { await env?.cleanup(); });

test('guests can get one published set but cannot list, write or read private data', async () => {
  const owner = env.authenticatedContext(uid).firestore();
  const guest = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(publicDoc(owner), data()));
  await assertSucceeds(getDoc(publicDoc(guest)));
  await assertFails(getDocs(collection(guest, 'sharedFlashboltSets')));
  await assertFails(setDoc(publicDoc(guest), data()));
  await assertFails(deleteDoc(publicDoc(guest)));
  await assertFails(getDoc(doc(guest, 'users', uid)));
  await assertFails(getDoc(doc(guest, 'users', uid, 'flashbolt', 'library-chunk-0')));
  await assertFails(getDoc(doc(guest, 'users', uid, 'flashboltShares', 'set1')));
});
test('members, suspended admins and other admins cannot mutate someone else’s share', async () => {
  for (const id of ['member', 'suspended', otherUid]) {
    const db = env.authenticatedContext(id).firestore();
    await assertFails(setDoc(publicDoc(db), { ...data(), ownerId: id }));
    await assertFails(deleteDoc(publicDoc(db)));
  }
  for (const id of ['member', 'suspended']) {
    await assertFails(setDoc(publicDoc(env.authenticatedContext(id).firestore(), 'NewDocument1234567890'), { ...data(), ownerId: id }));
  }
});
test('ownership, schema and mapping cannot be forged', async () => {
  const owner = env.authenticatedContext(uid).firestore();
  await assertFails(setDoc(publicDoc(owner), { ...data(), ownerId: otherUid }));
  await assertFails(setDoc(publicDoc(owner), { ...data(), unexpected: 'field' }));
  await assertFails(setDoc(doc(owner, 'users', uid, 'flashboltShares', 'set1'), { shareId: 'MissingDocument12345' }));
  const other = env.authenticatedContext(otherUid).firestore();
  await assertFails(setDoc(doc(other, 'users', otherUid, 'flashboltShares', 'stolen'), { shareId }));
});

// Execute the production service against the emulator, with only its Firebase client injected.
function service(db) {
  const load = (path, imports = {}) => {
    const exports = {};
    const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInThisContext(`(function(exports, require) { ${code}\n})`)(exports, name => { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name]; });
    return exports;
  };
  const shared = load('../src/pages/admin/flashbolt/sharing/sharedSet.ts');
  return load('../src/services/flashboltSharing.ts', { 'firebase/firestore': firestore, '../firebase/app': { db }, '../pages/admin/flashbolt/sharing/sharedSet': shared });
}
test('production service creates multiple links, updates in place, revokes and rotates on re-share', async () => {
  const owner = service(env.authenticatedContext(uid).firestore());
  const guest = service(env.unauthenticatedContext().firestore());
  const set = { id: 'source-set', title: 'Threads', subject: 'OS', description: '', color: 'violet', updatedAt: 'now', cards: [{ id: 'card1', term: 'Question?', definition: 'Answer', explanation: 'Reason' }] };
  const first = await owner.publishSetShare(uid, set);
  assert.equal((await guest.readSharedSet(first.id)).set.title, 'Threads');
  assert.equal((await owner.findSetShare(uid, set.id)).id, first.id);
  const updated = await owner.publishSetShare(uid, { ...set, title: 'Threads updated' });
  assert.equal(updated.id, first.id); assert.notEqual(updated.revision, first.revision);
  assert.equal((await guest.readSharedSet(first.id)).set.title, 'Threads updated');
  const second = await owner.publishSetShare(uid, { ...set, id: 'source-set-2' });
  assert.notEqual(second.id, first.id);
  await owner.revokeSetShare(uid, set.id);
  assert.equal(await guest.readSharedSet(first.id), null);
  assert.equal(await owner.findSetShare(uid, set.id), null);
  assert.equal((await guest.readSharedSet(second.id)).set.title, 'Threads');
  const recreated = await owner.publishSetShare(uid, set);
  assert.notEqual(recreated.id, first.id);
  assert.equal(await guest.readSharedSet(first.id), null);
  // Concurrent first-time publish resolves to one reusable link for a set.
  const [a, b] = await Promise.all([owner.publishSetShare(uid, { ...set, id: 'concurrent' }), owner.publishSetShare(uid, { ...set, id: 'concurrent' })]);
  assert.equal(a.id, b.id);
});
