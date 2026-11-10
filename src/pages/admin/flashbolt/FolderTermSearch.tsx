import { useState } from 'react';
import type { StudySet } from './Flashbolt';
import { groupFolderSets } from './folderSetOrder';
import { searchFolderTerms } from './termSearch';
import { withCorrectChoiceAnswers } from './questionTypeDetection';
import { normalizeAnswer } from './learn-engine';
import { Search } from 'lucide-react';
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
        <div className="term-search"><Search size={18} aria-hidden="true" />
          <input type="search" aria-label="Search terms, definitions, and answer choices in this folder" placeholder="Search terms and answers" value={query} onChange={event => { setQuery(event.target.value); setLimit(50); }} />
          {query && <button type="button" aria-label="Clear folder term search" onClick={() => setQuery('')}>×</button>}
        </div>
      </div>
    </div>
    <p>Search all questions, including those disabled in Learn mode.</p>
    {query.trim() && <>
      <p role="status">{results.length} matching {results.length === 1 ? 'term' : 'terms'}{activeSubject ? ` in ${activeSubject}` : ' across all subjects'}.</p>
      <div className="folder-term-results">
        {results.slice(0, limit).map(({ set, card, index }) => {
          const repaired = withCorrectChoiceAnswers(card);
          const answers = repaired.correctAnswers?.length ? repaired.correctAnswers : [card.definition.replace(/^[A-Z][).:-]\s*/i, '').trim()];
          const hasChoices = Boolean(card.answerChoices && card.answerChoices.length > 1);
          return <article className="folder-term-result" key={`${set.id}-${card.id}`}>
            <header className="folder-term-source">
              <button type="button" className="text-button" onClick={() => onOpenSet(set.id, query)}>{set.title} <span aria-hidden="true">↗</span></button>
              <div><small>{set.subject.trim() || 'General'}</small>{card.learnEnabled === false && <span className="folder-term-disabled">Disabled in Learn</span>}</div>
            </header>
            <div className="folder-term-review">
              <span className="folder-term-number" aria-label={`Question ${index + 1}`}>{index + 1}</span>
              <h3>{card.term}</h3>
              {hasChoices ? <ol className="term-review-choices" aria-label={`Answer choices for ${card.term}`}>
                {card.answerChoices?.map((choice, choiceIndex) => {
                  const isCorrect = answers.some(answer => normalizeAnswer(answer) === normalizeAnswer(choice));
                  return <li className={isCorrect ? 'correct' : ''} key={choiceIndex}><span>{String.fromCharCode(65 + choiceIndex)}</span><b>{choice}</b>{isCorrect && <em>Correct</em>}</li>;
                })}
              </ol> : <div className="folder-term-answer">
                <span className="eyebrow">Answer</span>
                {card.matchingPairs?.length ? card.matchingPairs.map(pair => <p key={pair.id}>{pair.left} — {pair.right}</p>) : <p>{card.definition}</p>}
              </div>}
              {card.imageData && <img className="folder-term-image" src={card.imageData} alt="Question illustration" />}
              <StudyExplanation text={card.explanation} />
            </div>
          </article>;
        })}
      </div>
      {!results.length && <div className="term-search-empty"><strong>No matching terms</strong><p>Try another keyword or choose a different subject.</p><button type="button" className="button quiet" onClick={() => setQuery('')}>Clear search</button></div>}
      {results.length > limit && <button type="button" className="button quiet" onClick={() => setLimit(value => value + 50)}>Show more results ({results.length - limit} remaining)</button>}
    </>}
  </section>;
}
