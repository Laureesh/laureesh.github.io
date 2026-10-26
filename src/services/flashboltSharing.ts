import { collection, doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/app';
import { encodeSharedSet, sharedSnapshot, validShareId } from '../pages/admin/flashbolt/sharing/sharedSet';
import type { StudySet } from '../pages/admin/flashbolt/Flashbolt';

export type SharedPublication = { id: string; revision: string; set: StudySet };
const ownerRef = (uid: string, setId: string) => doc(db, 'users', uid, 'flashboltShares', setId);
const publicRef = (id: string) => doc(db, 'sharedFlashboltSets', id);

export async function readSharedSet(id: string): Promise<SharedPublication | null> {
  if (!validShareId(id)) return null;
  // Check the server on each visit so a revoked link cannot reopen from Firestore's cache.
  const snapshot = await getDocFromServer(publicRef(id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.version !== 1 || typeof data.payload !== 'string' || typeof data.revision !== 'string') throw new Error('This shared set has an unsupported format.');
  return { id, revision: data.revision, set: sharedSnapshot(JSON.parse(data.payload)) };
}

export async function findSetShare(uid: string, setId: string): Promise<SharedPublication | null> {
  const snapshot = await getDocFromServer(ownerRef(uid, setId));
  return snapshot.exists() ? readSharedSet(snapshot.data().shareId) : null;
}

export async function publishSetShare(uid: string, set: StudySet): Promise<SharedPublication> {
  const payload = encodeSharedSet(set);
  const candidate = doc(collection(db, 'sharedFlashboltSets'));
  const revision = crypto.randomUUID();
  return runTransaction(db, async transaction => {
    const mapping = ownerRef(uid, set.id);
    const existing = await transaction.get(mapping);
    const id = existing.exists() ? existing.data().shareId as string : candidate.id;
    if (!validShareId(id)) throw new Error('Invalid sharing record.');
    transaction.set(publicRef(id), { ownerId: uid, version: 1, revision, payload, updatedAt: serverTimestamp() });
    transaction.set(mapping, { shareId: id });
    return { id, revision, set: sharedSnapshot(JSON.parse(payload)) };
  });
}

export async function revokeSetShare(uid: string, setId: string): Promise<void> {
  await runTransaction(db, async transaction => {
    const mapping = ownerRef(uid, setId);
    const existing = await transaction.get(mapping);
    if (existing.exists()) transaction.delete(publicRef(existing.data().shareId));
    transaction.delete(mapping);
  });
}
