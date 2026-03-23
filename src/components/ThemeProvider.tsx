import { useEffect, useState, type ReactNode } from "react";
import {
  accentPresets,
  CUSTOMIZATION_STORAGE_KEY,
  defaultCustomization,
  fontPresets,
  LEGACY_PROJECTS_LAYOUT_STORAGE_KEY,
  radiusPresets,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemeCustomizationState,
} from "./themeConfig";
import { ThemeContext } from "./themeContext";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return (savedTheme as Theme) || "dark";
  });
  const [customization, setCustomization] = useState<ThemeCustomizationState>(() => {
    if (typeof window === "undefined") {
      return defaultCustomization;
    }

    try {
      const savedCustomization = window.localStorage.getItem(CUSTOMIZATION_STORAGE_KEY);
      const legacyProjectsLayout =
        window.localStorage.getItem(LEGACY_PROJECTS_LAYOUT_STORAGE_KEY) === "discord"
          ? "discord"
          : defaultCustomization.projectsLayout;

      if (!savedCustomization) {
        return {
          ...defaultCustomization,
          projectsLayout: legacyProjectsLayout,
        };
      }

      const parsed = JSON.parse(savedCustomization) as Partial<ThemeCustomizationState>;

      return {
        style: parsed.style ?? defaultCustomization.style,
        projectsLayout: parsed.projectsLayout ?? legacyProjectsLayout,
        accent: parsed.accent ?? defaultCustomization.accent,
        font: parsed.font ?? defaultCustomization.font,
        radius: parsed.radius ?? defaultCustomization.radius,
      };
    } catch {
      return defaultCustomization;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const accentPreset =
      accentPresets.find((preset) => preset.id === customization.accent) ?? accentPresets[0];
    const fontPreset =
      fontPresets.find((preset) => preset.id === customization.font) ?? fontPresets[0];
    const radiusPreset =
      radiusPresets.find((preset) => preset.id === customization.radius) ?? radiusPresets[1];
    const activeAccent = theme === "light" ? accentPreset.light : accentPreset.dark;

    root.setAttribute("data-theme", theme);
    root.setAttribute("data-theme-style", customization.style);
    root.style.setProperty("--accent", activeAccent.accent);
    root.style.setProperty("--accent-hover", activeAccent.hover);
    root.style.setProperty("--accent-glow", activeAccent.glow);
    root.style.setProperty("--accent-subtle", activeAccent.subtle);
    root.style.setProperty("--gradient-1", activeAccent.gradient);
    root.style.setProperty("--gradient-text", activeAccent.gradientText);
    root.style.setProperty("--shadow-glow", activeAccent.shadowGlow);
    root.style.setProperty("--font-sans", fontPreset.family);
    root.style.setProperty("--radius", radiusPreset.radius);
    root.style.setProperty("--radius-lg", radiusPreset.radiusLg);

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
    window.localStorage.removeItem(LEGACY_PROJECTS_LAYOUT_STORAGE_KEY);
  }, [customization, theme]);

  const toggleTheme = () => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));

  const resetCustomization = () => {
    setCustomization(defaultCustomization);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setThemeMode: setTheme,
        style: customization.style,
        setStyle: (style) => setCustomization((current) => ({ ...current, style })),
        projectsLayout: customization.projectsLayout,
        setProjectsLayout: (projectsLayout) =>
          setCustomization((current) => ({ ...current, projectsLayout })),
        accent: customization.accent,
        setAccent: (accent) => setCustomization((current) => ({ ...current, accent })),
        font: customization.font,
        setFont: (font) => setCustomization((current) => ({ ...current, font })),
        radius: customization.radius,
        setRadius: (radius) => setCustomization((current) => ({ ...current, radius })),
        resetCustomization,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
