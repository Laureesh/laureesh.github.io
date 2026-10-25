import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { colorText, getSetColor, SET_COLORS } from "./setColors";
import "./SetColorPicker.css";

const FAMILIES = ["Popular", "All", "Reds & pinks", "Oranges & browns", "Yellows", "Greens", "Blues & teals", "Purples", "Neutrals"];
const POPULAR = new Set(["violet", "mint", "amber", "coral", "blue", "cyan", "green", "orange", "pink", "red", "cherry-rose", "burgundy", "pastel-pink", "gold", "sage-green", "emerald", "royal-blue", "teal", "lavender", "slate", "peach-fuzz", "coffee-bean", "lilac", "charcoal"]);

export default function SetColorPicker({ id, value, onChange, subject = "set" }: {
  id?: string; value: string; onChange: (value: string) => void; subject?: "set" | "note";
}) {
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("Popular");
  const selected = getSetColor(value);
  const term = query.trim().toLowerCase();
  const colors = SET_COLORS.filter(color => term
    ? color.label.toLowerCase().includes(term) || color.hex.includes(term.replace(/^#/, ""))
    : family === "All" || (family === "Popular" ? POPULAR.has(color.value) : color.family === family));

  useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return;
    const menu = panel.current;
    menu.showPopover();
    const position = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const width = Math.min(380, window.innerWidth - 24);
      const height = Math.min(490, window.innerHeight - 24);
      menu.style.width = `${width}px`;
      menu.style.maxHeight = `${height}px`;
      menu.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
      menu.style.top = `${Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - height - 12))}px`;
    };
    position();
    search.current?.focus();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);

  const close = () => { setOpen(false); trigger.current?.focus(); };
  const toggle = () => { if (open) close(); else { setQuery(""); setFamily("Popular"); setOpen(true); } };
  return <div className="set-color-picker">
    <button ref={trigger} id={id} type="button" className="set-color-trigger"
      style={{ backgroundColor: selected.hex, color: colorText(selected.hex) }}
      title={`${selected.label} · ${selected.hex.toUpperCase()}`}
      aria-label={`Color: ${selected.label}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={toggle} onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (!open) toggle(); }
      }}><span>{selected.label}</span><span aria-hidden="true">▾</span></button>
    {open && <div ref={panel} id={menuId} role="dialog" aria-label={`Choose ${subject} color`} className="set-color-palette" popover="auto"
      onToggle={event => { if (event.newState === "closed") setOpen(false); }}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}>
      <header><div><strong>{subject === "note" ? "Note" : "Set"} color</strong><small>{selected.label} · {selected.hex.toUpperCase()}</small></div><button type="button" onClick={close} aria-label="Close color picker">×</button></header>
      <input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search names or #hex…" aria-label={`Search ${subject} colors`} />
      <div className="set-color-families" role="group" aria-label="Color families">
        {FAMILIES.map(item => <button type="button" key={item} aria-pressed={!term && family === item} onClick={() => { setFamily(item); setQuery(""); }}>{item}</button>)}
      </div>
      <div className="set-color-results-count" role="status">{colors.length} colors</div>
      <div className="set-color-swatches" role="group" aria-label="Color choices" onKeyDown={event => {
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (index < 0 || !buttons.length) return;
        let next: number;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === "ArrowDown") next = Math.min(index + 3, buttons.length - 1);
        else if (event.key === "ArrowUp") next = Math.max(index - 3, 0);
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = buttons.length - 1;
        else return;
        event.preventDefault(); buttons[next].focus();
      }}>
        {colors.map(color => <button key={color.value} type="button" aria-label={`${color.label}, ${color.hex.toUpperCase()}`} aria-pressed={selected.value === color.value}
          title={`${color.label} · ${color.hex.toUpperCase()}`} style={{ "--swatch": color.hex, "--swatch-ink": colorText(color.hex) } as CSSProperties}
          onClick={() => { onChange(color.value); close(); }}><span className="set-color-swatch" aria-hidden="true">{selected.value === color.value ? "✓" : ""}</span><span>{color.label}</span></button>)}
        {!colors.length && <p>No matching colors. Try a name like “sage” or a hex code.</p>}
      </div>
    </div>}
  </div>;
}
