export type Theme = "dark" | "light";
export type ThemeStyleId = "default" | "discord" | "fortnite" | "youtube";
export type ProjectsLayoutMode = "standard" | "discord";
export type AccentPresetId =
  | "indigo"
  | "emerald"
  | "cyan"
  | "rose"
  | "amber"
  | "discord"
  | "fortnite"
  | "youtube";
export type FontPresetId = "inter" | "manrope" | "space" | "discord" | "fortnite" | "youtube";
export type RadiusPresetId = "balanced" | "sharp" | "soft";

export const THEME_STORAGE_KEY = "portfolio-theme";
export const CUSTOMIZATION_STORAGE_KEY = "portfolio-theme-customization";
export const LEGACY_PROJECTS_LAYOUT_STORAGE_KEY = "portfolio-projects-theme";

type AccentPalette = {
  accent: string;
  hover: string;
  glow: string;
  subtle: string;
  gradient: string;
  gradientText: string;
  shadowGlow: string;
};

type AccentPreset = {
  id: AccentPresetId;
  label: string;
  preview: string;
  dark: AccentPalette;
  light: AccentPalette;
};

type FontPreset = {
  id: FontPresetId;
  label: string;
  family: string;
  sample: string;
};

type RadiusPreset = {
  id: RadiusPresetId;
  label: string;
  radius: string;
  radiusLg: string;
};

type StylePreset = {
  id: ThemeStyleId;
  label: string;
  sample: string;
};

export type ThemeCustomizationState = {
  style: ThemeStyleId;
  projectsLayout: ProjectsLayoutMode;
  accent: AccentPresetId;
  font: FontPresetId;
  radius: RadiusPresetId;
};

export const defaultCustomization: ThemeCustomizationState = {
  style: "default",
  projectsLayout: "standard",
  accent: "indigo",
  font: "inter",
  radius: "balanced",
};

export const stylePresets: StylePreset[] = [
  {
    id: "default",
    label: "Default",
    sample: "Current portfolio look",
  },
  {
    id: "discord",
    label: "Discord",
    sample: "Channel-inspired surfaces",
  },
  {
    id: "fortnite",
    label: "Fortnite",
    sample: "Arcade HUD energy",
  },
  {
    id: "youtube",
    label: "YouTube",
    sample: "Creator dashboard minimalism",
  },
];

export const accentPresets: AccentPreset[] = [
  {
    id: "indigo",
    label: "Indigo",
    preview: "#6366f1",
    dark: {
      accent: "#6366f1",
      hover: "#818cf8",
      glow: "rgba(99, 102, 241, 0.25)",
      subtle: "rgba(99, 102, 241, 0.08)",
      gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      gradientText: "linear-gradient(135deg, #c7d2fe, #e0e7ff, #fafafa)",
      shadowGlow: "0 0 60px rgba(99, 102, 241, 0.15)",
    },
    light: {
      accent: "#4f46e5",
      hover: "#6366f1",
      glow: "rgba(79, 70, 229, 0.2)",
      subtle: "rgba(79, 70, 229, 0.06)",
      gradient: "linear-gradient(135deg, #4f46e5, #7c3aed)",
      gradientText: "linear-gradient(135deg, #312e81, #4338ca, #18181b)",
      shadowGlow: "0 0 60px rgba(79, 70, 229, 0.08)",
    },
  },
  {
    id: "emerald",
    label: "Emerald",
    preview: "#10b981",
    dark: {
      accent: "#10b981",
      hover: "#34d399",
      glow: "rgba(16, 185, 129, 0.24)",
      subtle: "rgba(16, 185, 129, 0.08)",
      gradient: "linear-gradient(135deg, #10b981, #14b8a6)",
      gradientText: "linear-gradient(135deg, #a7f3d0, #d1fae5, #fafafa)",
      shadowGlow: "0 0 60px rgba(16, 185, 129, 0.14)",
    },
    light: {
      accent: "#059669",
      hover: "#10b981",
      glow: "rgba(5, 150, 105, 0.18)",
      subtle: "rgba(5, 150, 105, 0.06)",
      gradient: "linear-gradient(135deg, #059669, #0f766e)",
      gradientText: "linear-gradient(135deg, #065f46, #047857, #18181b)",
      shadowGlow: "0 0 60px rgba(5, 150, 105, 0.08)",
    },
  },
  {
    id: "cyan",
    label: "Cyan",
    preview: "#06b6d4",
    dark: {
      accent: "#06b6d4",
      hover: "#22d3ee",
      glow: "rgba(6, 182, 212, 0.24)",
      subtle: "rgba(6, 182, 212, 0.08)",
      gradient: "linear-gradient(135deg, #06b6d4, #3b82f6)",
      gradientText: "linear-gradient(135deg, #a5f3fc, #dbeafe, #fafafa)",
      shadowGlow: "0 0 60px rgba(6, 182, 212, 0.14)",
    },
    light: {
      accent: "#0891b2",
      hover: "#06b6d4",
      glow: "rgba(8, 145, 178, 0.18)",
      subtle: "rgba(8, 145, 178, 0.06)",
      gradient: "linear-gradient(135deg, #0891b2, #2563eb)",
      gradientText: "linear-gradient(135deg, #155e75, #1d4ed8, #18181b)",
      shadowGlow: "0 0 60px rgba(8, 145, 178, 0.08)",
    },
  },
  {
    id: "rose",
    label: "Rose",
    preview: "#f43f5e",
    dark: {
      accent: "#f43f5e",
      hover: "#fb7185",
      glow: "rgba(244, 63, 94, 0.24)",
      subtle: "rgba(244, 63, 94, 0.08)",
      gradient: "linear-gradient(135deg, #f43f5e, #ec4899)",
      gradientText: "linear-gradient(135deg, #fecdd3, #fbcfe8, #fafafa)",
      shadowGlow: "0 0 60px rgba(244, 63, 94, 0.14)",
    },
    light: {
      accent: "#e11d48",
      hover: "#f43f5e",
      glow: "rgba(225, 29, 72, 0.18)",
      subtle: "rgba(225, 29, 72, 0.06)",
      gradient: "linear-gradient(135deg, #e11d48, #db2777)",
      gradientText: "linear-gradient(135deg, #9f1239, #be185d, #18181b)",
      shadowGlow: "0 0 60px rgba(225, 29, 72, 0.08)",
    },
  },
  {
    id: "amber",
    label: "Amber",
    preview: "#f59e0b",
    dark: {
      accent: "#f59e0b",
      hover: "#fbbf24",
      glow: "rgba(245, 158, 11, 0.24)",
      subtle: "rgba(245, 158, 11, 0.08)",
      gradient: "linear-gradient(135deg, #f59e0b, #f97316)",
      gradientText: "linear-gradient(135deg, #fde68a, #fed7aa, #fafafa)",
      shadowGlow: "0 0 60px rgba(245, 158, 11, 0.14)",
    },
    light: {
      accent: "#d97706",
      hover: "#f59e0b",
      glow: "rgba(217, 119, 6, 0.18)",
      subtle: "rgba(217, 119, 6, 0.06)",
      gradient: "linear-gradient(135deg, #d97706, #ea580c)",
      gradientText: "linear-gradient(135deg, #92400e, #c2410c, #18181b)",
      shadowGlow: "0 0 60px rgba(217, 119, 6, 0.08)",
    },
  },
  {
    id: "discord",
    label: "Discord",
    preview: "#5865f2",
    dark: {
      accent: "#5865f2",
      hover: "#7983f5",
      glow: "rgba(88, 101, 242, 0.28)",
      subtle: "rgba(88, 101, 242, 0.14)",
      gradient: "linear-gradient(135deg, #5865f2, #7983f5)",
      gradientText: "linear-gradient(135deg, #cdd3ff, #e7e9ff, #f2f3f5)",
      shadowGlow: "0 0 60px rgba(88, 101, 242, 0.18)",
    },
    light: {
      accent: "#4752c4",
      hover: "#5865f2",
      glow: "rgba(71, 82, 196, 0.2)",
      subtle: "rgba(71, 82, 196, 0.1)",
      gradient: "linear-gradient(135deg, #4752c4, #5865f2)",
      gradientText: "linear-gradient(135deg, #2e3a9f, #4752c4, #1e1f22)",
      shadowGlow: "0 0 60px rgba(71, 82, 196, 0.12)",
    },
  },
  {
    id: "fortnite",
    label: "Fortnite",
    preview: "#00d8ff",
    dark: {
      accent: "#00d8ff",
      hover: "#76efff",
      glow: "rgba(0, 216, 255, 0.28)",
      subtle: "rgba(0, 216, 255, 0.12)",
      gradient: "linear-gradient(135deg, #00d8ff, #3d7cff)",
      gradientText: "linear-gradient(135deg, #9ceeff, #fff1a8, #ffffff)",
      shadowGlow: "0 0 60px rgba(0, 216, 255, 0.18)",
    },
    light: {
      accent: "#007fd6",
      hover: "#00a8f5",
      glow: "rgba(0, 127, 214, 0.2)",
      subtle: "rgba(0, 127, 214, 0.1)",
      gradient: "linear-gradient(135deg, #00a8f5, #1d4ed8)",
      gradientText: "linear-gradient(135deg, #0f3d91, #007fd6, #1b1c2d)",
      shadowGlow: "0 0 60px rgba(0, 127, 214, 0.12)",
    },
  },
  {
    id: "youtube",
    label: "YouTube",
    preview: "#ff0033",
    dark: {
      accent: "#ff0033",
      hover: "#ff4d6d",
      glow: "rgba(255, 0, 51, 0.22)",
      subtle: "rgba(255, 0, 51, 0.1)",
      gradient: "linear-gradient(135deg, #ff0033, #ff4d6d)",
      gradientText: "linear-gradient(135deg, #ffd7df, #ffffff, #f1f1f1)",
      shadowGlow: "0 0 60px rgba(255, 0, 51, 0.14)",
    },
    light: {
      accent: "#cc0000",
      hover: "#ff0033",
      glow: "rgba(204, 0, 0, 0.18)",
      subtle: "rgba(204, 0, 0, 0.08)",
      gradient: "linear-gradient(135deg, #cc0000, #ff0033)",
      gradientText: "linear-gradient(135deg, #7f1d1d, #cc0000, #18181b)",
      shadowGlow: "0 0 60px rgba(204, 0, 0, 0.1)",
    },
  },
];

export const fontPresets: FontPreset[] = [
  {
    id: "inter",
    label: "Inter",
    family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    sample: "Balanced and familiar",
  },
  {
    id: "manrope",
    label: "Manrope",
    family: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    sample: "Clean and modern",
  },
  {
    id: "space",
    label: "Space Grotesk",
    family: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    sample: "More playful display feel",
  },
  {
    id: "discord",
    label: "Discord",
    family: '"gg sans", "DM Sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    sample: "Discord-inspired UI stack",
  },
  {
    id: "fortnite",
    label: "Fortnite",
    family: '"Burbank Big Condensed", Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
    sample: "Bold battle-pass headline feel",
  },
  {
    id: "youtube",
    label: "YouTube",
    family: '"Roboto Condensed", "Roboto", "Arial", sans-serif',
    sample: "Clean creator-platform UI",
  },
];

export const radiusPresets: RadiusPreset[] = [
  {
    id: "sharp",
    label: "Sharp",
    radius: "8px",
    radiusLg: "12px",
  },
  {
    id: "balanced",
    label: "Balanced",
    radius: "12px",
    radiusLg: "16px",
  },
  {
    id: "soft",
    label: "Soft",
    radius: "16px",
    radiusLg: "24px",
  },
];
