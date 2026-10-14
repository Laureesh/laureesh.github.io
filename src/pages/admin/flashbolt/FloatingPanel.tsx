import { useLayoutEffect, useRef, type RefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function FloatingPanel({ anchor, id, label, onClose, children }: {
  anchor: RefObject<HTMLButtonElement | null>; id: string; label: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);
  useLayoutEffect(() => {
    const panel = ref.current!;
    const button = anchor.current!;
    const position = () => {
      const rect = button.getBoundingClientRect();
      const width = Math.min(420, window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const down = below >= 300 || below >= above;
      panel.style.width = `${width}px`;
      panel.style.maxHeight = `${Math.max(80, down ? below : above)}px`;
      panel.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
      panel.style.top = `${Math.max(12, down ? rect.bottom + 8 : rect.top - panel.offsetHeight - 8)}px`;
    };
    position();
    panel.querySelector<HTMLElement>('select, input, button')?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target) && !button.contains(event.target)) closeRef.current();
    };
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    document.addEventListener("pointerdown", outside);
    return () => { observer.disconnect(); window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); document.removeEventListener("pointerdown", outside); };
  }, [anchor]);
  return createPortal(<div ref={ref} id={id} className="flashbolt-filter-panel" role="dialog" aria-label={label} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); anchor.current?.focus(); }
  }} onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && !anchor.current?.contains(event.relatedTarget)) onClose(); }}>{children}</div>, document.body);
}
