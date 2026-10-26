import { useLayoutEffect, useRef, type ElementType, type MouseEvent, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { checklistRoot } from './checklistDocument';
import { inlineEditorHtml, isEmptyInlineParagraph } from './inlineChecklistEditing';
type Props = { as?: string; html: string; label: string; className?: string; onChange: (html: string) => void; onRemoveEmpty?: () => void };
/** An uncontrolled editing surface keeps the caret stable through note autosaves. */
export default function InlineChecklistText({ as = 'div', html, label, className = '', onChange, onRemoveEmpty }: Props) {
  const ref = useRef<HTMLElement>(null);
  const composing = useRef(false);
  const removing = useRef(false);
  const latestHtml = useRef(html);
  useLayoutEffect(() => {
    latestHtml.current = html;
    const element = ref.current;
    if (element && document.activeElement !== element) {
      const next = inlineEditorHtml(html);
      if (element.innerHTML !== next) element.innerHTML = next;
    }
  }, [html]);
  const save = () => { if (ref.current) onChange(ref.current.innerHTML); };
  const removeEmpty = () => {
    if (!onRemoveEmpty || !ref.current || !isEmptyInlineParagraph(ref.current)) return;
    removing.current = true;
    ref.current.blur();
    removing.current = false;
    onRemoveEmpty();
  };
  const blank = document.createElement(as);
  blank.append(...checklistRoot(html).childNodes);
  const showRemove = Boolean(onRemoveEmpty && isEmptyInlineParagraph(blank));
  const Tag = as as ElementType;
  const editor = <Tag {...{
    ref, className: `checklist-inline-text ${className}`, contentEditable: true, suppressContentEditableWarning: true,
    role: 'textbox', 'aria-label': label, 'aria-multiline': true, spellCheck: true,
    onInput: () => { if (!composing.current) save(); },
    onCompositionStart: () => { composing.current = true; },
    onCompositionEnd: () => { composing.current = false; save(); },
    onBlur: () => {
      if (removing.current) return;
      save();
      // Reconcile protected values after React processes the last input, never while typing.
      window.setTimeout(() => {
        const element = ref.current;
        if (element && document.activeElement !== element) {
          const next = inlineEditorHtml(latestHtml.current);
          if (element.innerHTML !== next) element.innerHTML = next;
        }
      }, 0);
    },
    onClick: (event: MouseEvent) => { if ((event.target as Element).closest('a') && !event.ctrlKey && !event.metaKey) event.preventDefault(); },
    onKeyDown: (event: KeyboardEvent) => {
      if ((event.key === 'Backspace' || event.key === 'Delete') && !composing.current && onRemoveEmpty && ref.current && isEmptyInlineParagraph(ref.current)) {
        event.preventDefault();
        removeEmpty();
        return;
      }
      if (event.key === 'Enter' && !composing.current) {
        event.preventDefault(); document.execCommand('insertLineBreak'); save();
      }
    },
    onPaste: (event: ClipboardEvent) => {
      event.preventDefault();
      // Plain-text paste avoids injecting active content into the live editor.
      event.clipboardData.getData('text/plain').split(/\r?\n/).forEach((line, index) => {
        if (index) document.execCommand('insertLineBreak');
        if (line) document.execCommand('insertText', false, line);
      });
      save();
    },
    onDrop: (event: DragEvent) => event.preventDefault(),
  }} />;
  if (!onRemoveEmpty) return editor;
  return <div className={`checklist-inline-box${showRemove ? ' is-empty' : ''}`}>
    {editor}
    {showRemove && <button type="button" className="checklist-remove-empty" aria-label="Remove empty text box" title="Remove empty text box" onMouseDown={event => event.preventDefault()} onClick={removeEmpty}>×</button>}
  </div>;
}
