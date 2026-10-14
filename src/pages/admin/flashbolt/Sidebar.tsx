import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function Sidebar({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<{ text: string; x: number; y: number } | null>(null);

  function showLabel(target: EventTarget | null) {
    const control = target instanceof Element ? target.closest("a, button, summary") : null;
    const text = control?.getAttribute("title") || control?.getAttribute("aria-label");
    if (!control || !text) {
      setLabel(null);
      return;
    }
    const rect = control.getBoundingClientRect();
    setLabel({ text, x: Math.min(rect.right + 10, window.innerWidth - 210), y: Math.max(24, Math.min(rect.top + rect.height / 2, window.innerHeight - 24)) });
  }

  useEffect(() => {
    const dismiss = () => setLabel(null);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, []);

  return <>
    <aside className="sidebar"
      onMouseOver={event => showLabel(event.target)}
      onMouseLeave={() => setLabel(null)}
      onFocus={event => showLabel(event.target)}
      onBlur={() => setLabel(null)}
      onClick={() => setLabel(null)}
      onKeyDown={event => { if (event.key === "Escape") setLabel(null); }}
    >{children}</aside>
    {label && createPortal(<span className="flashbolt-sidebar-tooltip" aria-hidden="true" style={{ left: label.x, top: label.y }}>{label.text}</span>, document.body)}
  </>;
}
