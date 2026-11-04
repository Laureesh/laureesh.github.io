import { useEffect, useState } from 'react';
import Modal from '../Modal';
import type { StudySet } from '../Flashbolt';
import { findSetShare, publishSetShare, revokeSetShare, type SharedPublication } from '../../../../services/flashboltSharing';
import { folderShareKey, type ShareFolder, sharedStudyPath } from './sharedSet';
import './Sharing.css';

export default function ShareSetDialog({ uid, set, folder, sets = [], onClose }: { uid: string; set?: StudySet; folder?: ShareFolder; sets?: StudySet[]; onClose: () => void }) {
  const kind = folder ? 'folder' : 'set';
  const sourceId = folder ? folderShareKey(folder.id) : set!.id;
  const folderSets = folder ? folder.setIds.map(id => sets.find(item => item.id === id)).filter((item): item is StudySet => Boolean(item)) : [];
  const emptySets = folderSets.filter(item => item.cards.length === 0);
  const includedSetCount = folderSets.length - emptySets.length;
  const cardCount = folder ? folderSets.reduce((total, item) => total + item.cards.length, 0) : set!.cards.length;
  const [publication, setPublication] = useState<SharedPublication | null>(null);
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmStop, setConfirmStop] = useState(false);
  useEffect(() => {
    let cancelled = false;
    findSetShare(uid, sourceId).then(result => { if (!cancelled) { setPublication(result); setLoaded(true); } })
      .catch(() => { if (!cancelled) setError('Could not check sharing. Check your connection and try reopening this dialog.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [uid, sourceId]);
  const url = publication ? new URL(sharedStudyPath(publication.id), window.location.origin).href : '';
  async function publish() {
    setBusy(true); setError(''); setMessage('');
    try { setPublication(await publishSetShare(uid, (set ?? folderSets[0])!, folder, sets)); setMessage(publication ? 'Shared copy updated. The link stays the same.' : 'Your study link is ready.'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Sharing failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function stop() {
    setBusy(true); setError(''); setMessage('');
    try { await revokeSetShare(uid, sourceId); setPublication(null); setConfirmStop(false); setMessage(`Sharing stopped. The old link will no longer open this ${kind}.`); }
    catch { setError('Could not stop sharing. Try again; the link is still active.'); }
    finally { setBusy(false); }
  }
  return <Modal className="share-set-dialog" labelledBy="share-set-title" onClose={() => { if (!busy) onClose(); }}>
    <header><div><span className="eyebrow">Study together</span><h2 id="share-set-title">Share this {kind}</h2></div><button className="icon-button" aria-label="Close sharing" disabled={busy} onClick={onClose}>×</button></header>
    <h3>{folder?.name ?? set!.title}</h3><p>{folder && `${includedSetCount} sets to share · `}{cardCount} cards · Learn, flashcards, and practice tests</p>
    <p>Anyone with the link can study without an account. Their progress stays in their own browser. {folder ? "The folder name and its nonempty sets’ titles, descriptions, cards, images, answers, and explanations are shared." : "Only this set’s title, description, cards, images, answers, and explanations are shared."}</p>
    {folder && emptySets.length > 0 && <div className="share-empty-sets"><p>{emptySets.length} empty {emptySets.length === 1 ? 'set is' : 'sets are'} not included in the shared copy. Add cards and update the shared copy to include them later.</p><details><summary>View empty sets</summary><ul>{emptySets.map(item => <li key={item.id}>{item.title.trim() || 'Untitled set'}</li>)}</ul></details></div>}
    {folder && !cardCount && <p>Add at least one card to a set in this folder before sharing.</p>}
    {publication && <><label className="share-link-label">Study link<input aria-label="Study link" value={url} readOnly onFocus={event => event.currentTarget.select()} /></label><div className="button-row"><button className="button primary" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage('Link copied.'); } catch { setMessage('Select the study link above and copy it.'); } }}>Copy link</button><a className="button quiet" href={url} target="_blank" rel="noreferrer">Open study link ↗</a></div><p>Edits stay private until you update the shared copy. Updating starts fresh progress for classmates on their next visit.</p></>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <footer><button className="button primary" disabled={busy || !loaded || !cardCount} onClick={() => void publish()}>{busy ? 'Please wait…' : publication ? 'Update shared copy' : 'Create study link'}</button>{publication && <button className="button quiet" disabled={busy} onClick={() => setConfirmStop(true)}>Stop sharing</button>}</footer>
    {confirmStop && <div className="share-stop-confirm"><p>Stop this link from opening the {kind}? People may still have a copy they already opened or saved.</p><div className="button-row"><button className="button danger" disabled={busy} onClick={() => void stop()}>Confirm stop sharing</button><button className="button quiet" disabled={busy} onClick={() => setConfirmStop(false)}>Cancel</button></div></div>}
  </Modal>;
}
