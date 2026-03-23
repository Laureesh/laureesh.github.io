import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  User,
  Wrench,
  FolderOpen,
  Mail,
  BookOpen,
  FileText,
  Search,
  Sun,
  Moon,
  Command,
  X,
  LogIn,
  LogOut,
  UserPlus,
  Users,
  LayoutDashboard,
  ListTodo,
  LockKeyhole,
  FilePenLine,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "./themeContext";
import { useAuth } from "../contexts/AuthContext";
import { useDisplayLanguage } from "../contexts/DisplayLanguageContext";
import "./CommandPalette.css";

const OPEN_COMMAND_PALETTE_EVENT = "open-command-palette";

interface PalettePage {
  label: string;
  path: string;
  icon: LucideIcon;
  keywords: string;
}

interface LocalizedPalettePage extends PalettePage {
  name: string;
}

interface PaletteAction {
  name: string;
  icon: LucideIcon;
  action: () => void;
  keywords: string;
}

const basePages: PalettePage[] = [
  { label: "Home", path: "/", icon: Home, keywords: "landing hero" },
  { label: "About", path: "/about", icon: User, keywords: "bio education" },
  { label: "Skills", path: "/skills", icon: Wrench, keywords: "tech stack" },
  { label: "Projects", path: "/projects", icon: FolderOpen, keywords: "portfolio work" },
  { label: "Blog", path: "/blog", icon: BookOpen, keywords: "posts articles" },
  { label: "Resume", path: "/resume", icon: FileText, keywords: "cv experience" },
  { label: "Contact", path: "/contact", icon: Mail, keywords: "email message" },
];

function localizePages(
  pages: PalettePage[],
  translateRouteLabel: (label: string) => string,
): LocalizedPalettePage[] {
  return pages.map((page) => ({
    ...page,
    name: translateRouteLabel(page.label),
  }));
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, userProfile, logout, loading } = useAuth();
  const { t, translateRouteLabel } = useDisplayLanguage();
  const pages = localizePages(basePages, translateRouteLabel);
  const authenticatedPages = localizePages(
    [
      {
        label: "Community",
        path: "/community",
        icon: Users,
        keywords: "community explore members portfolio hub",
      },
    ],
    translateRouteLabel,
  );
  const adminPages = userProfile?.role === "admin"
    ? localizePages(
        [
          { label: "Admin Dashboard", path: "/admin-dashboard", icon: LayoutDashboard, keywords: "admin dashboard overview shell" },
          { label: "Admin Content", path: "/admin-dashboard/content", icon: FileText, keywords: "admin cms content blogs projects links pages" },
          { label: "Admin Pages", path: "/admin-dashboard/pages", icon: FilePenLine, keywords: "admin pages editor structured copy home about contact" },
          { label: "Admin Users", path: "/admin-dashboard/users", icon: Users, keywords: "admin users roles moderation members" },
          { label: "Admin Tasks", path: "/admin-dashboard/tasks", icon: ListTodo, keywords: "admin tasks kanban workflow" },
          { label: "Feature Toggles", path: "/admin-dashboard/feature-toggles", icon: SlidersHorizontal, keywords: "admin feature toggles rollout flags premium stripe" },
          { label: "Private Pages", path: "/admin-dashboard/private-pages", icon: LockKeyhole, keywords: "admin private pages internal protected" },
          { label: "UEFN Leaderboard Manager", path: "/admin-dashboard/private-pages/fn-leaderboard", icon: LockKeyhole, keywords: "uefn fortnite leaderboard manager admin private" },
        ],
        translateRouteLabel,
      )
    : [];
  const availablePages = user
    ? [...pages, ...authenticatedPages, ...adminPages]
    : pages;

  const openPalette = useCallback(() => {
    setQuery("");
    setSelected(0);
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  const togglePalette = useCallback(() => {
    if (open) {
      closePalette();
      return;
    }

    openPalette();
  }, [closePalette, openPalette, open]);

  const themeAction: PaletteAction = {
    name: theme === "dark" ? t("switchToLightMode") : t("switchToDarkMode"),
    icon: theme === "dark" ? Sun : Moon,
    action: () => {
      toggleTheme();
      closePalette();
    },
    keywords: "theme dark light toggle",
  };

  const filtered = availablePages.filter((page) => {
    const normalizedQuery = query.toLowerCase();

    return (
      page.name.toLowerCase().includes(normalizedQuery) ||
      page.label.toLowerCase().includes(normalizedQuery) ||
      page.keywords.includes(normalizedQuery)
    );
  });

  const authActions: PaletteAction[] = [];

  if (loading) {
    // Avoid flashing guest actions while Firebase restores a persisted session.
  } else if (user) {
    authActions.push({
      name: t("signOut"),
      icon: LogOut,
      action: () => {
        void logout();
        closePalette();
      },
      keywords: "logout sign out",
    });
  } else {
    authActions.push({
      name: t("signIn"),
      icon: LogIn,
      action: () => {
        navigate("/login");
        closePalette();
      },
      keywords: "login sign in authenticate",
    });
    authActions.push({
      name: t("createAccount"),
      icon: UserPlus,
      action: () => {
        navigate("/register");
        closePalette();
      },
      keywords: "register sign up create account",
    });
  }

  const normalizedQuery = query.toLowerCase();
  const showTheme =
    !query ||
    themeAction.name.toLowerCase().includes(normalizedQuery) ||
    themeAction.keywords.includes(normalizedQuery);
  const filteredAuth = authActions.filter((actionItem) => {
    if (!query) {
      return true;
    }

    return (
      actionItem.name.toLowerCase().includes(normalizedQuery) ||
      actionItem.keywords.includes(normalizedQuery)
    );
  });
  const allItems: Array<LocalizedPalettePage | PaletteAction> = [
    ...filtered,
    ...(showTheme ? [themeAction] : []),
    ...filteredAuth,
  ];

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        togglePalette();
      }

      if (event.key === "Escape") {
        closePalette();
      }
    };

    window.addEventListener("keydown", handler);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);

    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);
    };
  }, [closePalette, openPalette, togglePalette]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 50);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  const runItem = (item: LocalizedPalettePage | PaletteAction) => {
    if ("action" in item) {
      item.action();
      return;
    }

    navigate(item.path);
    closePalette();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!allItems.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((current) => (current + 1) % allItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((current) => (current - 1 + allItems.length) % allItems.length);
    } else if (event.key === "Enter" && allItems[selected]) {
      runItem(allItems[selected]);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="cmd-overlay" onClick={closePalette}>
      <div className="cmd-palette" onClick={(event) => event.stopPropagation()}>
        <div className="cmd-input-row">
          <Search size={16} />
          <input
            ref={inputRef}
            type="text"
            placeholder={t("searchPagesActions")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              type="button"
              className="cmd-clear"
              aria-label={t("clearCommandPaletteSearch")}
              onClick={() => {
                setQuery("");
                setSelected(0);
                inputRef.current?.focus();
              }}
            >
              <X size={14} />
            </button>
          )}
          <kbd>ESC</kbd>
        </div>
        <div className="cmd-results">
          {allItems.length === 0 ? (
            <div className="cmd-empty">{t("noResultsFound")}</div>
          ) : null}
          {allItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <button
                key={`${item.name}-${index}`}
                className={`cmd-item ${index === selected ? "selected" : ""}`}
                onClick={() => runItem(item)}
                onMouseEnter={() => setSelected(index)}
              >
                <Icon size={16} />
                <span>{item.name}</span>
                {"path" in item ? <span className="cmd-path">{item.path}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="cmd-footer">
          <span><kbd>Up</kbd><kbd>Down</kbd> {t("navigate")}</span>
          <span><kbd>Enter</kbd> {t("open")}</span>
          <span><kbd>Esc</kbd> {t("close")}</span>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteTrigger() {
  const { t } = useDisplayLanguage();

  return (
    <button
      type="button"
      className="cmd-hint"
      data-tour="command-trigger"
      title={`${t("openCommandPalette")} (Ctrl+K)`}
      aria-label={t("openCommandPalette")}
      onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
    >
      <Command size={18} />
    </button>
  );
}
