import { useId, useState } from "react";
import { isFinalCheckTitle, type StepChange } from "./stepLayout";

function useRememberedSection(section: string) {
  const key = `flashbolt.notebook.v1.steps.${section}.open`;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(key) !== "false"; }
    catch { return true; }
  });
  const rememberOpen = (next: boolean) => {
    if (next === open) return;
    setOpen(next);
    try { localStorage.setItem(key, String(next)); }
    catch { /* Keep the panel usable when browser storage is unavailable. */ }
  };
  return [open, rememberOpen] as const;
}

type Props = {
  steps: { title: string; completed: boolean }[];
  onChange: (change: StepChange) => void;
  onEdit: (index: number) => void;
  onUndo: () => void;
  canUndo: boolean;
};

export default function StepControls({ steps, onChange, onEdit, onUndo, canUndo }: Props) {
  const [panelOpen, setPanelOpen] = useRememberedSection("panel");
  const panelId = useId();
  const [guideOpen, setGuideOpen] = useRememberedSection("formatting-guide");
  const [manageOpen, setManageOpen] = useRememberedSection("manage");
  const completed = steps.filter(step => step.completed).length;
  return <section className="notebook-step-controls" aria-label="Step controls">
    <header><div><strong>Steps</strong><span aria-live="polite">{completed} of {steps.length} complete</span></div><div className="step-panel-actions">{panelOpen && <button onClick={() => onChange({ type: "add", index: steps.length })}>＋ Add step</button>}<button type="button" aria-expanded={panelOpen} aria-controls={panelId} aria-label={panelOpen ? "Minimize Steps section" : "Expand Steps section"} onClick={() => setPanelOpen(!panelOpen)}><span aria-hidden="true">{panelOpen ? "⌃" : "⌄"}</span> {panelOpen ? "Minimize" : "Expand"}</button></div></header>
    <div id={panelId} hidden={!panelOpen}>
    <progress value={completed} max={Math.max(1, steps.length)} aria-label="Step completion" />
    <p>Edit titles below, or select Edit content to jump to a step’s instructions. Changes save automatically.</p>
    <details className="step-formatting-guide" open={guideOpen} onToggle={event => setGuideOpen(event.currentTarget.open)}>
      <summary>How to style your steps</summary>
      <p>Use the formatting toolbar above this panel while editing the note. These examples show how each part gets its appearance.</p>
      <div className="step-formatting-examples">
        <article>
          <h3>Colored step titles</h3>
          <div className="step-guide-title">Enable the Anaconda Service</div>
          <p>Change a title under <strong>Manage steps</strong>, then press Enter or click outside the field. The purple color and bold style apply automatically.</p>
        </article>
        <article>
          <h3>Command boxes</h3>
          <pre className="step-guide-command"><code>systemctl enable anaconda.service</code></pre>
          <p>Choose <strong>Edit content</strong>. Type “At the prompt, type:” as normal text, then put the command on its own line. Place your cursor in the command line and click <strong>Code</strong> in the toolbar.</p>
          <p>The dark background, purple border, and pale green text are automatic inside Steps layout.</p>
        </article>
        <article>
          <h3>Main heading</h3>
          <div className="step-guide-heading">Lab Steps — Easy Version</div>
          <p>Type a heading in the note, place your cursor on that line, and choose <strong>Heading 1</strong> for a large heading or <strong>Heading 2</strong> for a smaller one. Main headings are white by default. Select a word or phrase and choose <strong>Text color</strong> in the toolbar to change its color.</p>
        </article>
        <article>
          <h3>Numbered instructions</h3>
          <ol><li>Open Terminal.</li><li>Type the command.</li></ol>
          <p>Within a step’s content, click <strong>Numbers</strong> and type your first instruction. Press Enter for the next numbered item. Press Shift+Enter for a new line within that item, without another number. Press Enter on an empty item to end the list, or place your cursor in an item and click Exit list for a plain line below it. Use <strong>Bullets</strong> for an unordered list.</p>
        </article>
        <article>
          <h3>Bold, italic, and highlight</h3>
          <div>Press <strong>Enter</strong> · <em>Optional</em> · <mark>Remember this</mark></div>
          <p>Select the words you want to change, then click <strong>Bold</strong>, <strong>Italic</strong>, or <strong>Highlight</strong>. Highlight adds a yellow background to selected text.</p>
        </article>
        <article>
          <h3>Step numbers and completion</h3>
          <div className="step-guide-badges"><span>1</span><span>2</span><span className="complete">✓</span></div>
          <p>The numbered circles and connecting line come from Steps layout. Add, delete, or move a step and the circle numbers update automatically.</p>
          <p>To start a new step at a heading inside an existing step, place the cursor at the beginning of that heading and press Enter. The heading and everything after it move into the new step.</p>
          <p>Check a step’s box under <strong>Manage steps</strong> to turn its circle and title green and update the progress bar.</p>
        </article>
      </div>
      <p><strong>Changing the structure:</strong> Add step appends a step; ＋ After inserts one below a particular step. Use ↑ / ↓ to reorder, Duplicate to copy, or Delete to remove. Undo last step change reverses the latest change if you have not edited the note since. Earlier content is available in History.</p>
      <p><strong>Remove the look:</strong> Click <strong>Steps layout</strong> in the toolbar again to remove the timeline while keeping your text. This guide is separate from your saved note and is hidden when printing.</p>
    </details>
    <details open={manageOpen} onToggle={event => setManageOpen(event.currentTarget.open)}><summary>Manage steps</summary>
      {steps.map((step, index) => <div className="notebook-step-control-row" key={index}>
        <label className="step-complete-toggle" title={isFinalCheckTitle(step.title) ? "Final Check is always checked" : undefined}><input type="checkbox" checked={step.completed || isFinalCheckTitle(step.title)} disabled={isFinalCheckTitle(step.title)} onChange={() => onChange({ type: "complete", index })} aria-label={`Mark step ${index + 1} complete`} /><span>{index + 1}</span></label>
        <input key={step.title} className="step-title-input" aria-label={`Step ${index + 1} title`} defaultValue={step.title} maxLength={180} onBlur={event => { if (event.target.value !== step.title) onChange({ type: "title", index, title: event.target.value }); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
        <div className="step-row-actions">
          <button onClick={() => onEdit(index)}>Edit content</button>
          <button disabled={index === 0} onClick={() => onChange({ type: "up", index })} aria-label={`Move step ${index + 1} up`}>↑</button>
          <button disabled={index === steps.length - 1} onClick={() => onChange({ type: "down", index })} aria-label={`Move step ${index + 1} down`}>↓</button>
          <button onClick={() => onChange({ type: "duplicate", index })} aria-label={`Duplicate step ${index + 1}`}>Duplicate</button>
          <button onClick={() => onChange({ type: "add", index: index + 1 })} aria-label={`Add step after step ${index + 1}`}>＋ After</button>
          <button className="danger" onClick={() => onChange({ type: "remove", index })} aria-label={`Delete step ${index + 1}`}>Delete</button>
        </div>
      </div>)}
      {!steps.length && <p>No steps yet. Use Add step to start again.</p>}
    </details>
    <button disabled={!canUndo} onClick={onUndo}>Undo last step change</button>
    </div>
  </section>;
}
