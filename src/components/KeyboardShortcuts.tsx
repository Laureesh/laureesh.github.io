import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { primaryNavigation } from "../data/siteNavigation";
import { useDisplayLanguage } from "../contexts/DisplayLanguageContext";
import "./KeyboardShortcuts.css";

export const OPEN_SHORTCUTS_EVENT = "open-keyboard-shortcuts";

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, translateRouteLabel } = useDisplayLanguage();

  const shortcuts = useMemo(
    () => [
      { keys: ["Ctrl", "K"], desc: t("openCommandPalette") },
      { keys: ["?"], desc: t("showKeyboardShortcuts") },
      ...primaryNavigation.map((item) => ({
        keys: [item.shortcut],
        desc: `${t("goTo")} ${translateRouteLabel(item.label)}`,
      })),
      { keys: ["Swipe", "Left/Right"], desc: t("mobileSwipe") },
      { keys: ["Esc"], desc: t("closeOverlays") },
      { keys: ["Up", "Down"], desc: t("navigateCommandPalette") },
      { keys: ["Enter"], desc: t("openSelectedResult") },
    ],
    [t, translateRouteLabel],
  );

  useEffect(() => {
    const handleShortcutOpen = () => setOpen(true);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (
        event.key === "?" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        setOpen((currentOpen) => !currentOpen);
        return;
      }

      if (
        open ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      const navigationItem = primaryNavigation.find(
        (item) => item.shortcut.toLowerCase() === event.key.toLowerCase(),
      );

      if (navigationItem && navigationItem.path !== location.pathname) {
        event.preventDefault();
        navigate(navigationItem.path);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, handleShortcutOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, handleShortcutOpen);
    };
  }, [location.pathname, navigate, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="shortcuts-overlay" onClick={() => setOpen(false)}>
      <div className="shortcuts-panel" onClick={(event) => event.stopPropagation()}>
        <div className="shortcuts-header">
          <h3>{t("keyboardShortcuts")}</h3>
          <button onClick={() => setOpen(false)} className="shortcuts-close">
            <X size={16} />
          </button>
        </div>
        <div className="shortcuts-list">
          {shortcuts.map((shortcut) => (
            <div className="shortcut-row" key={shortcut.desc}>
              <span className="shortcut-desc">{shortcut.desc}</span>
              <span className="shortcut-keys">
                {shortcut.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
