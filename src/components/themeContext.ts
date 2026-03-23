import { createContext, useContext } from "react";
import type {
  AccentPresetId,
  FontPresetId,
  ProjectsLayoutMode,
  RadiusPresetId,
  Theme,
  ThemeStyleId,
} from "./themeConfig";

export type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setThemeMode: (theme: Theme) => void;
  style: ThemeStyleId;
  setStyle: (style: ThemeStyleId) => void;
  projectsLayout: ProjectsLayoutMode;
  setProjectsLayout: (layout: ProjectsLayoutMode) => void;
  accent: AccentPresetId;
  setAccent: (accent: AccentPresetId) => void;
  font: FontPresetId;
  setFont: (font: FontPresetId) => void;
  radius: RadiusPresetId;
  setRadius: (radius: RadiusPresetId) => void;
  resetCustomization: () => void;
};

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  setThemeMode: () => {},
  style: "default",
  setStyle: () => {},
  projectsLayout: "standard",
  setProjectsLayout: () => {},
  accent: "indigo",
  setAccent: () => {},
  font: "inter",
  setFont: () => {},
  radius: "balanced",
  setRadius: () => {},
  resetCustomization: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
