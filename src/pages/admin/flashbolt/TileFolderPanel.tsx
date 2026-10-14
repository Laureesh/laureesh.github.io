import { useLayoutEffect, useRef, type ReactNode } from "react";

export default function TileFolderPanel({ id, label, children }: {
  id: string; label: string; children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = panel.current;
    const trigger = element?.parentElement?.querySelector<HTMLButtonElement>(".tile-folder-badge");
    if (!element || !trigger) return;
    element.showPopover();
    const position = () => {
      const anchor = trigger.getBoundingClientRect();
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const left = Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12));
      const below = window.innerHeight - anchor.bottom - 20;
      const top = below >= height || below >= anchor.top - 20
        ? Math.min(anchor.bottom + 8, window.innerHeight - height - 12)
        : anchor.top - height - 8;
      element.style.left = `${left}px`;
      element.style.top = `${Math.max(12, top)}px`;
    };
    position();
    element.querySelector<HTMLInputElement>('input[type="search"]')?.focus({ preventScroll: true });
    const observer = new ResizeObserver(position);
    observer.observe(element);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (element.contains(document.activeElement)) trigger.focus({ preventScroll: true });
      element.hidePopover();
    };
  }, []);
  return <div ref={panel} popover="manual" className="tile-folder-menu" id={id} role="dialog" aria-label={label}>{children}</div>;
}
