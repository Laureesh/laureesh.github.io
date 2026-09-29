import { useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function ConfirmSetTerms({ title, count, onCancel, onConfirm }: {
  title: string; count: number; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement;
    element.showModal();
    cancel.current?.focus();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={dialog} className="set-terms-confirm" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); onCancel(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel();
  }}>
    <div className="set-terms-confirm-heading"><span className="set-terms-confirm-icon" aria-hidden="true">−</span><button type="button" className="set-terms-confirm-close" aria-label="Close confirmation" onClick={onCancel}>×</button></div>
    <h2 id={titleId}>Remove all terms?</h2>
    <div id={descriptionId}><p>Remove {count} {count === 1 ? "term" : "terms"} from <strong>“{title}”</strong>?</p><p className="set-terms-confirm-note">The set will remain. This cannot be undone.</p></div>
    <div className="set-terms-confirm-actions"><button ref={cancel} type="button" onClick={onCancel}>Cancel</button><button type="button" className="set-terms-confirm-remove" onClick={onConfirm}>Remove all terms</button></div>
  </dialog>, document.body);
}
