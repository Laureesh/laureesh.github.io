import { useState } from "react";

export type SetDetails = { title: string; subject: string; description: string; color: string };

type Props = {
  set: SetDetails & { id: string };
  onSave: (details: SetDetails) => void;
};

export default function InlineSetDetails({ set, onSave }: Props) {
  const [draft, setDraft] = useState<SetDetails | null>(null);
  const [error, setError] = useState("");
  const cancel = () => { setDraft(null); setError(""); };

  if (!draft) return <>
    <div className="set-tile-title-row">
      <strong className="set-tile-title">{set.title}</strong>
      <button type="button" className="set-tile-quick-edit" aria-label={`Quick edit ${set.title}`} onClick={() => {
        setDraft({ title: set.title, subject: set.subject, description: set.description, color: set.color });
        setError("");
      }}>Quick edit</button>
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
    <label>Color<select value={draft.color} onChange={event => setDraft({ ...draft, color: event.target.value })}><option value="violet">Violet</option><option value="mint">Mint</option><option value="amber">Amber</option><option value="coral">Coral</option></select></label>
    {error && <p role="alert">{error}</p>}
    <div className="set-tile-inline-actions"><button type="submit" className="button primary">Save changes</button><button type="button" className="button quiet" onClick={cancel}>Cancel</button></div>
  </form>;
}
