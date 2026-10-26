import { useEffect, useState } from 'react';
import Modal from '../Modal';
import type { StudySet } from '../Flashbolt';
import { findSetShare, publishSetShare, revokeSetShare, type SharedPublication } from '../../../../services/flashboltSharing';
import { sharedStudyPath } from './sharedSet';
import './Sharing.css';

export default function ShareSetDialog({ uid, set, onClose }: { uid: string; set: StudySet; onClose: () => void }) {
  const [publication, setPublication] = useState<SharedPublication | null>(null);
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmStop, setConfirmStop] = useState(false);
  useEffect(() => {
    let cancelled = false;
    findSetShare(uid, set.id).then(result => { if (!cancelled) { setPublication(result); setLoaded(true); } })
      .catch(() => { if (!cancelled) setError('Could not check sharing. Check your connection and try reopening this dialog.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [uid, set.id]);
  const url = publication ? new URL(sharedStudyPath(publication.id), window.location.origin).href : '';
  async function publish() {
    setBusy(true); setError(''); setMessage('');
    try { setPublication(await publishSetShare(uid, set)); setMessage(publication ? 'Shared copy updated. The link stays the same.' : 'Your study link is ready.'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Sharing failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function stop() {
    setBusy(true); setError(''); setMessage('');
    try { await revokeSetShare(uid, set.id); setPublication(null); setConfirmStop(false); setMessage('Sharing stopped. The old link will no longer open this set.'); }
    catch { setError('Could not stop sharing. Try again; the link is still active.'); }
    finally { setBusy(false); }
  }
  return <Modal className="share-set-dialog" labelledBy="share-set-title" onClose={() => { if (!busy) onClose(); }}>
    <header><div><span className="eyebrow">Study together</span><h2 id="share-set-title">Share this set</h2></div><button className="icon-button" aria-label="Close sharing" disabled={busy} onClick={onClose}>×</button></header>
    <h3>{set.title}</h3><p>{set.cards.length} cards · Learn, flashcards, and practice tests</p>
    <p>Anyone with the link can study without an account. Their progress stays in their own browser. Only this set’s title, description, cards, images, answers, and explanations are shared.</p>
    {publication && <><label className="share-link-label">Study link<input aria-label="Study link" value={url} readOnly onFocus={event => event.currentTarget.select()} /></label><div className="button-row"><button className="button primary" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage('Link copied.'); } catch { setMessage('Select the study link above and copy it.'); } }}>Copy link</button><a className="button quiet" href={url} target="_blank" rel="noreferrer">Open study link ↗</a></div><p>Edits stay private until you update the shared copy. Updating starts fresh progress for classmates on their next visit.</p></>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <footer><button className="button primary" disabled={busy || !loaded || !set.cards.length} onClick={() => void publish()}>{busy ? 'Please wait…' : publication ? 'Update shared copy' : 'Create study link'}</button>{publication && <button className="button quiet" disabled={busy} onClick={() => setConfirmStop(true)}>Stop sharing</button>}</footer>
    {confirmStop && <div className="share-stop-confirm"><p>Stop this link from opening the set? People may still have a copy they already opened or saved.</p><div className="button-row"><button className="button danger" disabled={busy} onClick={() => void stop()}>Confirm stop sharing</button><button className="button quiet" disabled={busy} onClick={() => setConfirmStop(false)}>Cancel</button></div></div>}
  </Modal>;
}
