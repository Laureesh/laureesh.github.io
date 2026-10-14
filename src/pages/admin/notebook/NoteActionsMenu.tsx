import { useLayoutEffect, useRef } from "react";

type Props = {
  x: number;
  y: number;
  title: string;
  folderId: string | null;
  folders: { id: string; name: string; parentId: string | null }[];
  actions: { label: string; danger?: boolean; run: () => void }[];
  onMove: (folderId: string | null) => void;
  onClose: () => void;
};

export default function NoteActionsMenu({ x, y, title, folderId, folders, actions, onMove, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const previousFocus = document.activeElement;
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
    menu.querySelector<HTMLButtonElement>("button")?.focus();
    const dismiss = (event: PointerEvent) => { if (!menu.contains(event.target as Node)) closeRef.current(); };
    const resize = () => closeRef.current();
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", resize);
      if (menu.contains(document.activeElement) && previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [x, y]);

  return <div ref={menuRef} className="note-actions-menu" role="dialog" aria-label={`Actions for ${title || "Untitled"}`} style={{ left: x, top: y }} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Tab"].includes(event.key) || (event.target instanceof HTMLSelectElement && event.key !== "Tab")) return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button, select")];
    const index = controls.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1 : (index + (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey) ? -1 : 1) + controls.length) % controls.length;
    event.preventDefault(); controls[next]?.focus();
  }}>
    <header><strong>{title || "Untitled"}</strong><button aria-label="Close note actions" onClick={onClose}>×</button></header>
    {actions.map(action => <button key={action.label} className={action.danger ? "danger" : ""} onClick={() => { onClose(); action.run(); }}>{action.label}</button>)}
    <label>Move to folder<select value={folderId ?? ""} onChange={event => { onMove(event.target.value || null); onClose(); }}><option value="">No folder</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.parentId ? `${folders.find(parent => parent.id === folder.parentId)?.name ?? ""} / ` : ""}{folder.name}</option>)}</select></label>
  </div>;
}
