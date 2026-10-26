import { createElement, useLayoutEffect, useRef } from 'react';
import { inlineEditorHtml } from './inlineChecklistEditing';
type Props = { as?: string; html: string; label: string; className?: string; onChange: (html: string) => void };
/** An uncontrolled editing surface keeps the caret stable through note autosaves. */
export default function InlineChecklistText({ as = 'div', html, label, className = '', onChange }: Props) {
  const ref = useRef<HTMLElement>(null);
  const composing = useRef(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element && document.activeElement !== element) {
      const next = inlineEditorHtml(html);
      if (element.innerHTML !== next) element.innerHTML = next;
    }
  }, [html]);
  const save = () => { if (ref.current) onChange(ref.current.innerHTML); };
  return createElement(as, {
    ref, className: `checklist-inline-text ${className}`, contentEditable: true, suppressContentEditableWarning: true,
    role: 'textbox', 'aria-label': label, 'aria-multiline': true, spellCheck: true,
    onInput: () => { if (!composing.current) save(); },
    onCompositionStart: () => { composing.current = true; },
    onCompositionEnd: () => { composing.current = false; save(); },
    onBlur: save,
    onClick: (event: React.MouseEvent) => { if ((event.target as Element).closest('a') && !event.ctrlKey && !event.metaKey) event.preventDefault(); },
    onPaste: (event: React.ClipboardEvent) => {
      event.preventDefault();
      // Plain-text paste avoids injecting active content into the live editor.
      document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
      save();
    },
    onDrop: (event: React.DragEvent) => event.preventDefault(),
  });
}
