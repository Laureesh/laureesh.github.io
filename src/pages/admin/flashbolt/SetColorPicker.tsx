import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

const COLORS = [
  { value: "violet", label: "Violet", background: "#7055df", foreground: "#ffffff" },
  { value: "mint", label: "Mint", background: "#71d9bf", foreground: "#111827" },
  { value: "amber", label: "Amber", background: "#ffca66", foreground: "#111827" },
  { value: "coral", label: "Coral", background: "#ff8f7c", foreground: "#111827" },
  { value: "blue", label: "Blue", background: "#209cee", foreground: "#081827" },
  { value: "cyan", label: "Cyan", background: "#22d3ee", foreground: "#111827" },
  { value: "green", label: "Green", background: "#39ed32", foreground: "#111827" },
  { value: "orange", label: "Orange", background: "#ff9800", foreground: "#111827" },
  { value: "pink", label: "Pink", background: "#d90078", foreground: "#ffffff" },
  { value: "red", label: "Red", background: "#d83242", foreground: "#ffffff" },
];

export default function SetColorPicker({ id, value, onChange }: {
  id?: string; value: string; onChange: (value: string) => void;
}) {
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = COLORS.find(color => color.value === value) ?? COLORS[0];
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div ref={root} className="set-color-picker" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <button ref={trigger} id={id} type="button" className="set-color-trigger"
      style={{ backgroundColor: selected.background, color: selected.foreground }}
      aria-label={`Color: ${selected.label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => setOpen(!open)} onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
      }}><span>{selected.label}</span><span aria-hidden="true">▾</span></button>
    {open && <div id={menuId} role="menu" aria-label="Set color" className="set-color-menu" onKeyDown={event => {
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      let next: number;
      if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
      else if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else return;
      event.preventDefault(); buttons[next].focus();
    }}>
      {COLORS.map(color => <button key={color.value} type="button" role="menuitemradio" aria-checked={selected.value === color.value}
        tabIndex={-1} style={{ "--option-background": color.background, "--option-foreground": color.foreground } as CSSProperties}
        onClick={() => { onChange(color.value); close(); }}><span>{color.label}</span>{selected.value === color.value && <span aria-hidden="true">✓</span>}</button>)}
    </div>}
  </div>;
}
