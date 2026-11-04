import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/app';
import { encodeSharedSet, encodeSharedFolder, folderShareKey, sharedFolderSnapshot, sharedSnapshot, validShareId, type ShareFolder, type SharedFolder } from '../pages/admin/flashbolt/sharing/sharedSet';
import type { StudySet } from '../pages/admin/flashbolt/Flashbolt';

export type SharedPublication = { id: string; revision: string; set: StudySet; folder?: SharedFolder };
const ownerRef = (uid: string, setId: string) => doc(db, 'users', uid, 'flashboltShares', setId);
const publicRef = (id: string) => doc(db, 'sharedFlashboltSets', id);

function decodePublication(id: string, revision: string, payload: string): SharedPublication {
  const value = JSON.parse(payload);
  if (value?.kind === 'folder') {
    const folder = sharedFolderSnapshot(value);
    return { id, revision, set: folder.sets[0], folder };
  }
  return { id, revision, set: sharedSnapshot(value) };
}

export async function readSharedSet(id: string): Promise<SharedPublication | null> {
  if (!validShareId(id)) return null;
  // Check the server on each visit so a revoked link cannot reopen from Firestore's cache.
  const snapshot = await getDocFromServer(publicRef(id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.version !== 1 || typeof data.payload !== 'string' || typeof data.revision !== 'string') throw new Error('This shared set has an unsupported format.');
  return decodePublication(id, data.revision, data.payload);
}

export async function findSetShare(uid: string, setId: string): Promise<SharedPublication | null> {
  const snapshot = await getDocFromServer(ownerRef(uid, setId));
  return snapshot.exists() ? readSharedSet(snapshot.data().shareId) : null;
}

export async function publishSetShare(uid: string, set: StudySet, folder?: ShareFolder, sets: StudySet[] = []): Promise<SharedPublication> {
  const payload = folder ? encodeSharedFolder(folder, sets) : encodeSharedSet(set);
  const candidate = doc(collection(db, 'sharedFlashboltSets'));
  const revision = crypto.randomUUID();
  return runTransaction(db, async transaction => {
    const mapping = ownerRef(uid, folder ? folderShareKey(folder.id) : set.id);
    const existing = await transaction.get(mapping);
    const id = existing.exists() ? existing.data().shareId as string : candidate.id;
    if (!validShareId(id)) throw new Error('Invalid sharing record.');
    transaction.set(publicRef(id), { ownerId: uid, version: 1, revision, payload, updatedAt: serverTimestamp() });
    transaction.set(mapping, { shareId: id });
    return decodePublication(id, revision, payload);
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

export type OwnedShare = { sourceId: string; shareId: string; publication: SharedPublication | null; unavailable: boolean };

export async function listOwnedShares(uid: string): Promise<OwnedShare[]> {
  // Enumerate only this owner's private mappings; public publications cannot be listed.
  const mappings = await getDocsFromServer(collection(db, 'users', uid, 'flashboltShares'));
  return Promise.all(mappings.docs.map(async mapping => {
    const shareId = mapping.data().shareId as string;
    try {
      const publication = await readSharedSet(shareId);
      return { sourceId: mapping.id, shareId, publication, unavailable: !publication };
    } catch {
      // Keep the entry visible and revocable even when its published copy cannot be read.
      return { sourceId: mapping.id, shareId, publication: null, unavailable: true };
    }
  }));
}
