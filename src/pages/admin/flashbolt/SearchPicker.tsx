import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type Option = { id: string; title: string; detail: string; color?: string; disabled?: boolean };
const PAGE_SIZE = 6;

export default function SearchPicker({ label, value, options, onChange }: {
  label: string; value: string; options: Option[]; onChange: (id: string) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const selected = options.find(option => option.id === value);
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = options.filter(option => words.every(word => `${option.title} ${option.detail}`.toLocaleLowerCase().includes(word)));
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = matches.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  function close() { setOpen(false); trigger.current?.focus(); }
  function choose(id: string) { onChange(id); close(); }
  useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return;
    const element = panel.current;
    const button = trigger.current;
    const position = () => {
      const anchor = button.getBoundingClientRect();
      const width = Math.min(Math.max(anchor.width, 360), window.innerWidth - 24);
      const below = window.innerHeight - anchor.bottom - 20;
      const above = anchor.top - 20;
      const useBelow = below >= 320 || below >= above;
      element.style.width = `${width}px`;
      element.style.maxHeight = `${Math.max(0, Math.min(480, useBelow ? below : above))}px`;
      element.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12))}px`;
      element.style.top = `${useBelow ? anchor.bottom + 8 : Math.max(12, anchor.top - element.offsetHeight - 8)}px`;
    };
    position();
    input.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !element.contains(event.target) && !button.contains(event.target)) setOpen(false);
    };
    const observer = new ResizeObserver(position);
    observer.observe(element);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  return <div className="search-picker-field">
    <span>{label}</span>
    <button ref={trigger} type="button" className="search-picker-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? titleId : undefined} disabled={!options.length} onClick={() => {
      setQuery(""); setPage(0); setOpen(!open);
    }}>
      <span className={selected?.color ? "folder-filter-icon folder" : "search-picker-symbol"} style={selected?.color ? { "--folder-color": selected.color } as CSSProperties : undefined} aria-hidden="true">{selected?.color ? null : "▦"}</span>
      <span className="search-picker-value"><strong>{selected?.title ?? `Choose ${label.toLowerCase()}`}</strong><small>{selected?.detail ?? "Search and choose"}</small></span>
      <span className="search-picker-chevron" aria-hidden="true">{open ? "⌃" : "⌄"}</span>
    </button>
    {open && createPortal(<div ref={panel} id={titleId} className="flashbolt-search-picker" role="dialog" aria-label={`Choose ${label.toLowerCase()}`} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    }} onBlur={event => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && !trigger.current?.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="search-picker-input"><span aria-hidden="true">⌕</span><input ref={input} aria-label={`Search ${label.toLowerCase()}`} placeholder={`Search ${label.toLowerCase()} by name…`} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} onKeyDown={event => {
        if (event.key === "ArrowDown") { event.preventDefault(); panel.current?.querySelector<HTMLButtonElement>(".search-picker-result:not(:disabled)")?.focus(); }
        if (event.key === "Enter" && matches.filter(option => !option.disabled).length === 1) choose(matches.find(option => !option.disabled)!.id);
      }} />{query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); setPage(0); input.current?.focus(); }}>×</button>}</div>
      <p className="search-picker-count" role="status">{matches.length} {matches.length === 1 ? "match" : "matches"}{!query && " · Type to narrow it down"}</p>
      <div className="search-picker-results" onKeyDown={event => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        event.preventDefault();
        if (event.key === "ArrowUp" && index === 0) input.current?.focus();
        else buttons[index + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
      }}>
        {visible.map(option => <button type="button" key={option.id} className={`search-picker-result ${option.id === value ? "is-selected" : ""}`} disabled={option.disabled} aria-current={option.id === value ? "true" : undefined} onClick={() => choose(option.id)}><span className={option.color ? "folder-filter-icon folder" : "search-picker-symbol"} style={option.color ? { "--folder-color": option.color } as CSSProperties : undefined} aria-hidden="true">{option.color ? null : "▦"}</span><span><strong>{option.title}</strong><small>{option.detail}</small></span><span className="search-picker-check" aria-hidden="true">{option.id === value ? "✓" : "→"}</span></button>)}
        {!matches.length && <div className="search-picker-empty"><strong>No matches found</strong><p>Try a shorter name or a different keyword.</p></div>}
      </div>
      <footer><span>↑ ↓ to browse · Esc to close</span>{pages > 1 && <nav aria-label="Search results pages"><button type="button" aria-label="Previous results" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>←</button><span>{currentPage + 1} / {pages}</span><button type="button" aria-label="Next results" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)}>→</button></nav>}</footer>
    </div>, document.body)}
  </div>;
}
