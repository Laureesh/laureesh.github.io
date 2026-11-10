import { useState } from 'react';
import type { StudySet } from './Flashbolt';
import { groupFolderSets } from './folderSetOrder';
import { searchFolderTerms } from './termSearch';
import { StudyExplanation } from './StudySummary';
import './FolderTermSearch.css';

export default function FolderTermSearch({ sets, folder, onOpenSet }: {
  sets: StudySet[];
  folder: { name: string; setIds: string[] };
  onOpenSet: (id: string, query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [limit, setLimit] = useState(50);
  const groups = groupFolderSets(sets.filter(set => folder.setIds.includes(set.id)));
  const activeSubject = groups.some(group => group.subject === subject) ? subject : '';
  const results = searchFolderTerms(sets, folder.setIds, query, activeSubject);
  return <section className="folder-term-search" aria-label={`Search terms in ${folder.name}`}>
    <div className="section-heading term-list-heading">
      <div><span className="eyebrow">Review</span><h2>Search terms in this folder</h2></div>
      <div className="folder-term-search-controls">
        <label>Subject<select aria-label="Term search subject" value={activeSubject} onChange={event => { setSubject(event.target.value); setLimit(50); }}>
          <option value="">All subjects</option>
          {groups.map(group => <option key={group.subject} value={group.subject}>{group.subject}</option>)}
        </select></label>
        <div className="term-search">
          <input type="search" aria-label="Search terms, definitions, and answer choices in this folder" placeholder="Search terms and answers" value={query} onChange={event => { setQuery(event.target.value); setLimit(50); }} />
          {query && <button type="button" aria-label="Clear folder term search" onClick={() => setQuery('')}>×</button>}
        </div>
      </div>
    </div>
    <p>Search all questions, including those disabled in Learn mode.</p>
    {query.trim() && <>
      <p role="status">{results.length} matching {results.length === 1 ? 'term' : 'terms'}{activeSubject ? ` in ${activeSubject}` : ' across all subjects'}.</p>
      <div className="folder-term-results">
        {results.slice(0, limit).map(({ set, card, index }) => <article key={`${set.id}-${card.id}`}>
          <header><button type="button" className="text-button" onClick={() => onOpenSet(set.id, query)}>{set.title} →</button><small>{set.subject.trim() || 'General'} · Question {index + 1}{card.learnEnabled === false ? ' · Disabled in Learn' : ''}</small></header>
          <h3>{card.term}</h3>
          <p>{card.definition}</p>
          {Boolean(card.answerChoices?.length) && <ul aria-label="Answer choices">{card.answerChoices?.map((choice, index) => <li key={index}>{choice}</li>)}</ul>}
          {Boolean(card.correctAnswers?.length) && <p><strong>Correct answer: </strong>{card.correctAnswers?.join('; ')}</p>}
          {card.matchingPairs?.map(pair => <p key={pair.id}>{pair.left} — {pair.right}</p>)}
          <StudyExplanation text={card.explanation} />
        </article>)}
      </div>
      {!results.length && <div className="term-search-empty"><strong>No matching terms</strong><p>Try another keyword or choose a different subject.</p><button type="button" className="button quiet" onClick={() => setQuery('')}>Clear search</button></div>}
      {results.length > limit && <button type="button" className="button quiet" onClick={() => setLimit(value => value + 50)}>Show more results ({results.length - limit} remaining)</button>}
    </>}
  </section>;
}
