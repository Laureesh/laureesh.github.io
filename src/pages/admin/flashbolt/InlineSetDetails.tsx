import { useState, type MouseEvent, type ReactNode } from "react";
import { Ellipsis, ExternalLink, Pencil, Play, SlidersHorizontal, Zap } from "lucide-react";
import SetColorPicker from "./SetColorPicker";

export type SetDetails = { title: string; subject: string; description: string; color: string };

type Props = {
  set: SetDetails & { id: string };
  termCount: number;
  folderControl: ReactNode;
  onSave: (details: SetDetails) => void;
  onQuickLearn: () => void;
  editHref: string;
  onEdit: (event: MouseEvent<HTMLAnchorElement>) => void;
  onOpenKahootHelper?: () => void;
  kahootUrl?: string;
  onOpenActions?: (event: MouseEvent<HTMLButtonElement>) => void;
};

function SetTitle({ title }: { title: string }) {
  // Keep the original text intact while highlighting common study-set identifiers.
  const parts = title.split(/(\[[^\]]+\]|\([^()]+\)|\b(?:Quiz|Module|Chapter|Part|Section|Unit|Lesson|Week)\s+\d+(?:\.\d+)*\b|^\d+(?:\.\d+)+\b|\b[A-Z]{2,}-[A-Z]?\d{2,}\b|\b\d+\s*(?:q|questions?)\b|\s+[-–—]\s+)/gi);

  return <strong className="set-tile-title">
    {parts.map((part, index) => {
      if (!part) return null;
      let className = "set-title-main";
      if (/^(?:\[|\()/.test(part)) {
        className = /[A-Z]{2,}-[A-Z]?\d{2,}/i.test(part) ? "set-title-code" : "set-title-section";
      } else if (/^(?:Quiz|Module|Chapter|Part|Section|Unit|Lesson|Week)\s+\d|^\d+(?:\.\d+)+$/i.test(part)) {
        className = "set-title-number";
      } else if (/^[A-Z]{2,}-[A-Z]?\d{2,}$|^\d+\s*(?:q|questions?)$/i.test(part)) {
        className = "set-title-code";
      } else if (/^\s+[-–—]\s+$/.test(part)) {
        className = "set-title-separator";
      }
      return <span className={className} key={index}>{part}</span>;
    })}
  </strong>;
}

export default function InlineSetDetails({ set, termCount, folderControl, onSave, onQuickLearn, editHref, onEdit, onOpenKahootHelper, kahootUrl, onOpenActions }: Props) {
  const [draft, setDraft] = useState<SetDetails | null>(null);
  const [error, setError] = useState("");
  const cancel = () => { setDraft(null); setError(""); };

  if (!draft) return <>
    <div className="set-tile-title-row">
      <div className="set-tile-heading">
        <SetTitle title={set.title} />
        <span className="tile-term-tag"><b>{termCount}</b> {termCount === 1 ? "term" : "terms"}</span>
        {folderControl}
      </div>
      <div className={`set-tile-actions${onOpenKahootHelper ? " has-kahoot-helper" : ""}`}>
        <button type="button" className="set-tile-quick-edit set-action-learn" aria-label={`Quick learn ${set.title}`} title="Start a quick learning session" onClick={onQuickLearn}><Play aria-hidden="true" />Quick learn</button>
        <a className="set-tile-quick-edit set-action-edit" href={editHref} aria-label={`Edit set ${set.title}`} title="Edit cards and set details" onClick={onEdit}><Pencil aria-hidden="true" />Edit set</a>
        <button type="button" className="set-tile-quick-edit" aria-label={`Quick edit ${set.title}`} title="Quickly edit title, subject, description, and color" onClick={() => {
          setDraft({ title: set.title, subject: set.subject, description: set.description, color: set.color });
          setError("");
        }}><SlidersHorizontal aria-hidden="true" />Quick edit</button>
        {onOpenKahootHelper && <button type="button" className="set-tile-quick-edit" aria-label={`Open Kahoot Helper for ${set.title}`} onClick={onOpenKahootHelper}><Zap aria-hidden="true" />Kahoot Helper</button>}
        {kahootUrl && <a className="tile-kahoot-link" href={kahootUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} aria-label={`Linked Kahoot for ${set.title}`}><ExternalLink aria-hidden="true" />Linked Kahoot</a>}
        {onOpenActions && <button type="button" className="set-tile-quick-edit set-actions-trigger" title="More actions" aria-label={`Actions for ${set.title}`} aria-haspopup="menu" onClick={onOpenActions}><Ellipsis aria-hidden="true" /></button>}
      </div>
    </div>
    <span className="tile-description">{set.description || "Your private flashcard set."}</span>
  </>;

  return <form className="set-tile-inline-editor" aria-label={`Edit details for ${set.title}`} onClick={event => event.stopPropagation()} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); }
  }} onSubmit={event => {
    event.preventDefault();
    if (!draft.title.trim()) { setError("Enter a title before saving."); return; }
    onSave({ ...draft, title: draft.title.trim(), subject: draft.subject.trim() || "General", description: draft.description.trim() });
    cancel();
  }}>
    <label>Title<input autoFocus value={draft.title} maxLength={100} aria-invalid={Boolean(error)} onChange={event => { setDraft({ ...draft, title: event.target.value }); setError(""); }} /></label>
    <label>Subject<input value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} /></label>
    <label>Description<textarea rows={3} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
    <div className="set-metadata-field"><span>Color</span><SetColorPicker value={draft.color} onChange={color => setDraft({ ...draft, color })} /></div>
    {error && <p role="alert">{error}</p>}
    <div className="set-tile-inline-actions"><button type="submit" className="button primary">Save changes</button><button type="button" className="button quiet" onClick={cancel}>Cancel</button></div>
  </form>;
}
