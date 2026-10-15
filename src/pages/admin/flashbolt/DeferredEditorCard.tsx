import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

// Keep a scroll target for every card, but mount expensive form controls only
// near the viewport. Once mounted, retain them to preserve focus and editing.
export default function DeferredEditorCard({ children, register, index }: {
  children: () => ReactNode;
  register: (element: HTMLDivElement | null) => void;
  index: number;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const focusOnReveal = useRef(false);
  const [visible, setVisible] = useState(index < 2);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (visible) {
      if (focusOnReveal.current) {
        element.querySelector<HTMLTextAreaElement>(".card-text-field textarea")?.focus({ preventScroll: true });
        focusOnReveal.current = false;
      }
      return;
    }
    const reveal = () => flushSync(() => setVisible(true));
    element.addEventListener("reveal-editor-card", reveal);
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setVisible(true));
      return () => element.removeEventListener("reveal-editor-card", reveal);
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setVisible(true);
    }, { rootMargin: "900px 0px" });
    observer.observe(element);
    return () => {
      observer.disconnect();
      element.removeEventListener("reveal-editor-card", reveal);
    };
  }, [visible]);
  return <div className="card-editor-wrap" ref={element => {
    elementRef.current = element;
    register(element);
  }}>
    {visible ? children() : <button type="button" className="card-editor-placeholder" style={{ minHeight: 500, width: "100%" }} onFocus={() => { focusOnReveal.current = true; setVisible(true); }} onClick={() => setVisible(true)}>Card {index + 1} · Open editor</button>}
  </div>;
}

