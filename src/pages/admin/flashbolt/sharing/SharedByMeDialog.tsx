import { useEffect, useState } from 'react';
import Modal from '../Modal';
import type { StudySet } from '../Flashbolt';
import { listOwnedShares, revokeSetShare, type OwnedShare } from '../../../../services/flashboltSharing';
import { folderShareKey, sharedStudyPath, validShareId, type ShareFolder } from './sharedSet';
import './Sharing.css';

export default function SharedByMeDialog({ uid, sets, folders, onManageSet, onManageFolder, onClose }: {
  uid: string;
  sets: StudySet[];
  folders: ShareFolder[];
  onManageSet: (set: StudySet) => void;
  onManageFolder: (id: string) => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<OwnedShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let cancelled = false;
    listOwnedShares(uid).then(result => { if (!cancelled) setEntries(result); })
      .catch(() => { if (!cancelled) setError('Could not load your shared links. Check your connection and try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [uid, attempt]);
  const rows = entries.map(entry => {
    const folder = folders.find(item => folderShareKey(item.id) === entry.sourceId);
    const isFolder = entry.sourceId.startsWith('folder:');
    const set = isFolder ? undefined : sets.find(item => item.id === entry.sourceId);
    const title = entry.publication?.folder?.name ?? entry.publication?.set.title ?? folder?.name ?? set?.title ?? 'Unavailable shared copy';
    return { ...entry, folder, set, isFolder, title };
  }).sort((a, b) => a.title.localeCompare(b.title));
  const visible = rows.filter(row => (filter === 'all' || (filter === 'folders') === row.isFolder) && row.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  async function stop(sourceId: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      await revokeSetShare(uid, sourceId);
      setEntries(current => current.filter(entry => entry.sourceId !== sourceId));
      setStopping(null); setMessage('Sharing stopped. The old link will no longer open.');
    } catch { setError('Could not stop sharing. Try again; the link may still be active.'); }
    finally { setBusy(false); }
  }
  return <Modal className="share-set-dialog shared-by-me-dialog" labelledBy="shared-by-me-title" onClose={() => { if (!busy) onClose(); }}>
    <header><div><span className="eyebrow">Your study links</span><h2 id="shared-by-me-title">Shared by me</h2></div><button className="icon-button" aria-label="Close shared links" disabled={busy} onClick={onClose}>×</button></header>
    <p>Manage your shared sets and folders. Sets included in a shared folder appear under that folder’s link.</p>
    {loading ? <p role="status">Loading shared links…</p> : <>
      <div className="shared-links-filters"><label>Search<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search shared titles" /></label><label>Show<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All links ({rows.length})</option><option value="sets">Sets ({rows.filter(row => !row.isFolder).length})</option><option value="folders">Folders ({rows.filter(row => row.isFolder).length})</option></select></label></div>
      {!rows.length && !error && <p>You haven’t shared any sets or folders yet. Open a set or folder to create a study link.</p>}
      {rows.length > 0 && !visible.length && <p>No shared links match your search or filter.</p>}
      <div className="shared-links-list">{visible.map(row => {
        const url = validShareId(row.shareId) ? new URL(sharedStudyPath(row.shareId), window.location.origin).href : '';
        return <article key={row.sourceId} aria-label={row.title}>
          <span className="eyebrow">{row.isFolder ? 'Folder' : 'Set'}</span><h3>{row.title}</h3>
          {row.publication?.folder && <details><summary>{row.publication.folder.sets.length} shared sets</summary><ul>{row.publication.folder.sets.map(set => <li key={set.id}>{set.title} · {set.cards.length} cards</li>)}</ul></details>}
          {row.publication && !row.isFolder && <p>{row.publication.set.cards.length} cards</p>}
          {row.unavailable && <p>Could not read this shared copy. Retry loading or stop the link below.</p>}
          {!row.folder && !row.set && <p>The original is no longer in your library. You can still stop sharing its published copy.</p>}
          {url && <label className="share-link-label">Study link<input aria-label={`Study link for ${row.title}`} value={url} readOnly onFocus={event => event.currentTarget.select()} /></label>}
          <div className="button-row">
            {url && <><button className="button quiet" disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage(`Link copied for ${row.title}.`); } catch { setMessage('Select the study link and copy it.'); } }}>Copy link</button><a className="button quiet" href={url} target="_blank" rel="noreferrer">Open link ↗</a></>}
            {(row.folder || row.set) && <button className="button primary" disabled={busy} onClick={() => { if (row.folder) onManageFolder(row.folder.id); else if (row.set) onManageSet(row.set); }}>Manage sharing</button>}
            <button className="button quiet" disabled={busy} onClick={() => setStopping(row.sourceId)}>Stop sharing</button>
          </div>
          {stopping === row.sourceId && <div className="share-stop-confirm"><p>Stop sharing “{row.title}”? People may still have a copy they already opened or saved.</p><div className="button-row"><button className="button danger" disabled={busy} onClick={() => void stop(row.sourceId)}>Confirm stop sharing</button><button className="button quiet" disabled={busy} onClick={() => setStopping(null)}>Cancel</button></div></div>}
        </article>;
      })}</div>
    </>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <footer><button className="button quiet" disabled={loading || busy} onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1); }}>Refresh links</button><button className="button quiet" disabled={busy} onClick={onClose}>Done</button></footer>
  </Modal>;
}
