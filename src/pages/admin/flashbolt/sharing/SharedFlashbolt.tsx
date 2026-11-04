import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Flashbolt from '../Flashbolt';
import { readSharedSet, type SharedPublication } from '../../../../services/flashboltSharing';
import './Sharing.css';

export default function SharedFlashbolt() {
  const { shareId = '' } = useParams();
  const [search] = useSearchParams();
  const [result, setResult] = useState<{ id: string; publication: SharedPublication | null; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    readSharedSet(shareId).then(publication => { if (!cancelled) setResult({ id: shareId, publication }); })
      .catch((error: unknown) => { if (!cancelled) setResult({ id: shareId, publication: null, error: (error as { code?: string })?.code === 'permission-denied' ? undefined : 'Check your connection and try again.' }); });
    return () => { cancelled = true; };
  }, [shareId, attempt]);
  if (!result || result.id !== shareId) return <main className="shared-set-status" role="status"><h1>Opening shared study link…</h1><p>No account needed.</p></main>;
  if (!result.publication) return <main className="shared-set-status"><h1>{result.error ? 'Could not load this study link' : 'This study link is unavailable'}</h1><p>{result.error ?? 'The owner may have stopped sharing it. Ask them for a new study link.'}</p><button onClick={() => { setResult(null); setAttempt(value => value + 1); }}>Try again</button></main>;
  const publication = result.publication;
  const selected = publication.folder?.sets.find(set => set.id === search.get('set')) ?? publication.set;
  return <Flashbolt key={`${shareId}-${publication.revision}-${selected.id}`} shared={{ ...publication, set: selected }} />;
}
