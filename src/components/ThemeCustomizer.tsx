import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Moon, RotateCcw, SlidersHorizontal, Sun, X } from "lucide-react";
import {
  accentPresets,
  defaultCustomization,
  fontPresets,
  radiusPresets,
  stylePresets,
  type ThemeStyleId,
} from "./themeConfig";
import { useTheme } from "./themeContext";
import "./ThemeCustomizer.css";

export default function ThemeCustomizer() {
  const [open, setOpen] = useState(false);
  const customizerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const {
    theme,
    setThemeMode,
    style,
    setStyle,
    projectsLayout,
    setProjectsLayout,
    accent,
    setAccent,
    font,
    setFont,
    radius,
    setRadius,
    resetCustomization,
  } = useTheme();
  const showProjectsLayoutControls = location.pathname.startsWith("/projects");

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (customizerRef.current && !customizerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleStyleChange = (nextStyle: ThemeStyleId) => {
    setStyle(nextStyle);

    if (nextStyle === "default") {
      setThemeMode("dark");
      setAccent(defaultCustomization.accent);
      setFont(defaultCustomization.font);
      setRadius(defaultCustomization.radius);
      return;
    }

    if (nextStyle === "discord") {
      setThemeMode("dark");
      setAccent("discord");
      setFont("discord");
      setRadius("balanced");
      return;
    }

    if (nextStyle === "fortnite") {
      setThemeMode("dark");
      setAccent("fortnite");
      setFont("fortnite");
      setRadius("sharp");
      return;
    }

    if (nextStyle === "youtube") {
      setThemeMode("dark");
      setAccent("youtube");
      setFont("youtube");
      setRadius("balanced");
    }
  };

  return (
    <div className="theme-customizer" ref={customizerRef} data-no-swipe="true">
      <button
        type="button"
        className={`theme-toggle theme-customizer-trigger ${open ? "active" : ""}`}
        aria-label="Theme customizer"
        aria-expanded={open}
        data-tour="theme-toggle"
        title="Theme customizer"
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal size={18} />
      </button>

      <div className={`theme-customizer-panel ${open ? "open" : ""}`} role="dialog" aria-label="Theme customizer">
        <div className="theme-customizer-head">
          <div>
            <p className="theme-customizer-kicker">Theme customizer</p>
            <h3>Adjust the site look</h3>
          </div>
          <button
            type="button"
            className="theme-customizer-close"
            aria-label="Close theme customizer"
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <section className="theme-customizer-section">
          <span className="theme-customizer-label">Style</span>
          <div className="theme-customizer-option-grid styles">
            {stylePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`theme-customizer-option ${style === preset.id ? "active" : ""}`}
                aria-pressed={style === preset.id}
                onClick={() => handleStyleChange(preset.id)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.sample}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="theme-customizer-section">
          <span className="theme-customizer-label">Theme</span>
          <div className="theme-customizer-segmented">
            <button
              type="button"
              className={theme === "dark" ? "active" : ""}
              aria-pressed={theme === "dark"}
              onClick={() => setThemeMode("dark")}
            >
              <Moon size={14} />
              Dark
            </button>
            <button
              type="button"
              className={theme === "light" ? "active" : ""}
              aria-pressed={theme === "light"}
              onClick={() => setThemeMode("light")}
            >
              <Sun size={14} />
              Light
            </button>
          </div>
        </section>

        {showProjectsLayoutControls && (
          <section className="theme-customizer-section">
            <span className="theme-customizer-label">Projects layout</span>
            <div className="theme-customizer-segmented">
              <button
                type="button"
                className={projectsLayout === "standard" ? "active" : ""}
                aria-pressed={projectsLayout === "standard"}
                onClick={() => setProjectsLayout("standard")}
              >
                Standard
              </button>
              <button
                type="button"
                className={projectsLayout === "discord" ? "active" : ""}
                aria-pressed={projectsLayout === "discord"}
                onClick={() => setProjectsLayout("discord")}
              >
                Discord
              </button>
            </div>
          </section>
        )}

        <section className="theme-customizer-section">
          <span className="theme-customizer-label">Accent</span>
          <div className="theme-customizer-accent-grid">
            {accentPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`theme-customizer-accent ${accent === preset.id ? "active" : ""}`}
                aria-pressed={accent === preset.id}
                onClick={() => setAccent(preset.id)}
              >
                <span
                  className="theme-customizer-accent-swatch"
                  style={{ background: preset.preview }}
                  aria-hidden="true"
                />
                <span>{preset.label}</span>
                {accent === preset.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </section>

        <section className="theme-customizer-section">
          <span className="theme-customizer-label">Font</span>
          <div className="theme-customizer-option-grid">
            {fontPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`theme-customizer-option ${font === preset.id ? "active" : ""}`}
                aria-pressed={font === preset.id}
                onClick={() => setFont(preset.id)}
              >
                <strong style={{ fontFamily: preset.family }}>{preset.label}</strong>
                <span style={{ fontFamily: preset.family }}>{preset.sample}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="theme-customizer-section">
          <span className="theme-customizer-label">Shape</span>
          <div className="theme-customizer-option-grid compact">
            {radiusPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`theme-customizer-option ${radius === preset.id ? "active" : ""}`}
                aria-pressed={radius === preset.id}
                onClick={() => setRadius(preset.id)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.radius} / {preset.radiusLg}</span>
              </button>
            ))}
          </div>
        </section>

        <button type="button" className="theme-customizer-reset" onClick={resetCustomization}>
          <RotateCcw size={14} />
          Reset all choices
        </button>
      </div>
    </div>
  );
}
