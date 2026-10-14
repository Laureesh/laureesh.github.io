export const RAINBOW_COLORS = [
  ["red", "Red", 0], ["orange", "Orange", 25], ["yellow", "Yellow", 48],
  ["lime", "Lime", 82], ["green", "Green", 140], ["teal", "Teal", 170],
  ["cyan", "Cyan", 192], ["blue", "Blue", 215], ["indigo", "Indigo", 240],
  ["violet", "Violet", 265], ["purple", "Purple", 285], ["pink", "Pink", 330],
] as const;
type ColorName = typeof RAINBOW_COLORS[number][0];
export type ThemeName = "dark" | "extreme" | "light" | "white" | "ocean" | "forest" | "sunset" | `${ColorName}-${"light" | "dark"}`;
type Theme = { id: ThemeName; label: string; mode: "light" | "dark"; colors: [string, string]; hue?: number };
export const THEME_OPTIONS: Theme[] = [
  { id: "dark", label: "Original", mode: "dark", colors: ["#0c0c28", "#7b78ff"] },
  { id: "extreme", label: "Midnight", mode: "dark", colors: ["#000000", "#8b82ff"] },
  { id: "light", label: "Original", mode: "light", colors: ["#f7f7fc", "#5552e9"] },
  { id: "white", label: "White", mode: "light", colors: ["#ffffff", "#111827"] },
  { id: "ocean", label: "Ocean", mode: "dark", colors: ["#071b29", "#59cef6"] },
  { id: "forest", label: "Forest", mode: "dark", colors: ["#0a1b16", "#5ed89a"] },
  { id: "sunset", label: "Sunset", mode: "dark", colors: ["#21101d", "#ff83ae"] },
  ...RAINBOW_COLORS.flatMap(([id, label, hue]): Theme[] => (["light", "dark"] as const).map(mode => ({
    id: `${id}-${mode}`, label, mode, hue,
    colors: [`hsl(${hue} 30% ${mode === "light" ? 97 : 8}%)`, `hsl(${hue} 65% ${mode === "light" ? 35 : 72}%)`],
  }))),
];

const paletteKeys = ["ink", "muted", "faint", "bg", "bg-deep", "panel", "panel-2", "panel-3", "line", "line-soft", "primary", "primary-strong", "primary-soft", "shadow", "ambient-glow", "sidebar-bg", "topbar-bg", "mobile-nav-bg"];
export function applyThemeToDocument(id: ThemeName) {
  const theme = THEME_OPTIONS.find(option => option.id === id)!;
  const root = document.documentElement;
  // Keep existing light/dark component treatments for the new color palettes.
  root.dataset.theme = theme.hue === undefined ? id : theme.mode;
  root.dataset.themePalette = id;
  root.style.colorScheme = id === "white" ? "only light" : theme.mode;
  root.style.backgroundColor = id === "white" ? "#ffffff" : "";
  document.body.style.backgroundColor = id === "white" ? "#ffffff" : "";
  paletteKeys.forEach(key => root.style.removeProperty(`--${key}`));
  if (theme.hue === undefined) return;
  const light = theme.mode === "light";
  const color = (saturation: number, brightness: number) => `hsl(${theme.hue} ${saturation}% ${brightness}%)`;
  const palette = {
    ink: color(25, light ? 13 : 96), muted: color(15, light ? 36 : 74), faint: color(13, light ? 42 : 65),
    bg: color(30, light ? 97 : 8), "bg-deep": color(25, light ? 93 : 5),
    panel: color(20, light ? 100 : 12), "panel-2": color(25, light ? 94 : 16), "panel-3": color(25, light ? 90 : 20),
    line: color(20, light ? 81 : 28), "line-soft": color(20, light ? 89 : 20),
    primary: color(65, 35), "primary-strong": color(65, light ? 32 : 72), "primary-soft": color(40, light ? 91 : 21),
    shadow: `0 24px 70px hsl(${theme.hue} 30% 5% / ${light ? .14 : .4})`,
    "ambient-glow": `hsl(${theme.hue} 65% 55% / .09)`,
    "sidebar-bg": color(25, light ? 99 : 6), "topbar-bg": color(25, light ? 98 : 9), "mobile-nav-bg": color(25, light ? 99 : 7),
  };
  Object.entries(palette).forEach(([key, value]) => root.style.setProperty(`--${key}`, value));
}
