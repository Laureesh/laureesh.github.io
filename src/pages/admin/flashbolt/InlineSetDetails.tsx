import { useState } from "react";
import SetColorPicker from "./SetColorPicker";

export type SetDetails = { title: string; subject: string; description: string; color: string };

type Props = {
  set: SetDetails & { id: string };
  onSave: (details: SetDetails) => void;
  onOpenKahootHelper?: () => void;
  kahootUrl?: string;
};

export default function InlineSetDetails({ set, onSave, onOpenKahootHelper, kahootUrl }: Props) {
  const [draft, setDraft] = useState<SetDetails | null>(null);
  const [error, setError] = useState("");
  const cancel = () => { setDraft(null); setError(""); };

  if (!draft) return <>
    <div className="set-tile-title-row">
      <strong className="set-tile-title">{set.title}</strong>
      <div className={`set-tile-actions${onOpenKahootHelper ? " has-kahoot-helper" : ""}`}>
        <button type="button" className="set-tile-quick-edit" aria-label={`Quick edit ${set.title}`} onClick={() => {
          setDraft({ title: set.title, subject: set.subject, description: set.description, color: set.color });
          setError("");
        }}>Quick edit</button>
        {onOpenKahootHelper && <button type="button" className="set-tile-quick-edit" aria-label={`Open Kahoot Helper for ${set.title}`} onClick={onOpenKahootHelper}>Kahoot Helper</button>}
        {kahootUrl && <a className="tile-kahoot-link" href={kahootUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} aria-label={`Linked Kahoot for ${set.title}`}>Linked Kahoot <span aria-hidden="true">↗</span></a>}
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
