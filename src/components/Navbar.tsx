import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  Globe2,
  HelpCircle,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Settings2,
  Users,
  UserRound,
  X,
  LayoutDashboard,
} from "lucide-react";
import { CommandPaletteTrigger } from "./CommandPalette";
import ThemeCustomizer from "./ThemeCustomizer";
import { OPEN_SHORTCUTS_EVENT } from "./KeyboardShortcuts";
import { useAuth } from "../contexts/AuthContext";
import { useDisplayLanguage } from "../contexts/DisplayLanguageContext";
import { LANGUAGE_OPTIONS } from "../data/accountOptions";
import {
  getTrackablePage,
  normalizePath,
  primaryNavigation,
} from "../data/siteNavigation";
import {
  getRecentPagesSnapshot,
  subscribeRecentPages,
  trackRecentPage,
} from "../utils/recentPagesStore";
import { getAuthPhotoURL } from "../utils/authUserProfile";
import {
  buildSavedAccount,
  mergeSavedAccounts,
  readSavedAccounts,
  type SavedAccount,
} from "../utils/savedAccounts";
import { updateUserProfile } from "../services/userProfiles";
import "./Navbar.css";

function isActivePath(currentPath: string, itemPath: string) {
  if (itemPath === "/") {
    return currentPath === "/";
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export default function Navbar() {
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [historyOpenPath, setHistoryOpenPath] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [switchingAccountKey, setSwitchingAccountKey] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [savingLanguage, setSavingLanguage] = useState<string | null>(null);
  const recentPages = useSyncExternalStore(
    subscribeRecentPages,
    getRecentPagesSnapshot,
    getRecentPagesSnapshot,
  );
  const historyRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, savedAccounts, loginWithGoogle, logout, loading, refreshUserProfile } = useAuth();
  const { currentLanguage, getLanguageLabel, getLanguageOptionLabel, t, translateRouteLabel } = useDisplayLanguage();
  const normalizedPath = normalizePath(location.pathname);
  const mobileOpen = menuOpenPath === normalizedPath;
  const historyOpen = historyOpenPath === normalizedPath;
  const avatarSrc = userProfile?.photoURL || getAuthPhotoURL(user) || null;
  const mergedSavedAccounts = mergeSavedAccounts([...savedAccounts, ...readSavedAccounts()]);
  const displayedAccounts = user
    ? [
        buildSavedAccount(user),
        ...mergedSavedAccounts.filter(
          (account) => account.uid !== user.uid && account.email !== (user.email ?? null),
        ),
      ]
    : mergedSavedAccounts;
  const canSwitchAccounts = displayedAccounts.length > 1;
  const resetSwitchAccountState = () => {
    setAccountSwitcherOpen(false);
    setLanguageMenuOpen(false);
    setSwitchError(null);
    setLanguageError(null);
    setSwitchingAccountKey(null);
    setSavingLanguage(null);
  };

  const closeUserMenu = () => {
    setUserMenuOpen(false);
    resetSwitchAccountState();
  };

  const handleSignOut = async () => {
    closeUserMenu();
    await logout();
  };

  const handleGoogleAccountSwitch = async (loginHint?: string | null) => {
    setSwitchError(null);
    setSwitchingAccountKey(loginHint ?? "google");

    try {
      await loginWithGoogle({
        loginHint,
        forceAccountSelection: !loginHint,
      });
      closeUserMenu();
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : "Unable to switch accounts.");
    } finally {
      setSwitchingAccountKey(null);
    }
  };

  const beginAccountSwitch = (account: SavedAccount) => {
    setSwitchError(null);

    if (account.providerIds.includes("google.com")) {
      void handleGoogleAccountSwitch(account.email);
      return;
    }

    if (account.providerIds.includes("password")) {
      closeUserMenu();
      navigate("/switch-account", {
        state: {
          from: normalizedPath,
          prefillEmail: account.email ?? "",
          switchAccount: true,
        },
      });
      return;
    }

    setSwitchError("This account provider is not supported for quick switching yet.");
  };

  const handleLanguageChange = async (language: (typeof LANGUAGE_OPTIONS)[number]["value"]) => {
    if (!user || !userProfile) {
      return;
    }

    if (language === currentLanguage) {
      setLanguageMenuOpen(false);
      return;
    }

    setLanguageError(null);
    setSavingLanguage(language);

    try {
      await updateUserProfile(user.uid, {
        preferences: {
          ...userProfile.preferences,
          language,
        },
      });
      await refreshUserProfile();
      setLanguageMenuOpen(false);
    } catch {
      setLanguageError(t("unableToSaveLanguagePreference"));
    } finally {
      setSavingLanguage(null);
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const page = getTrackablePage(normalizedPath);

    if (!page) {
      trackRecentPage(null);
      return;
    }

    trackRecentPage(page);
  }, [normalizedPath]);

  useEffect(() => {
    setMenuOpenPath(null);
    setHistoryOpenPath(null);
    closeUserMenu();
  }, [normalizedPath]);

  useEffect(() => {
    if (!canSwitchAccounts && accountSwitcherOpen) {
      setAccountSwitcherOpen(false);
      setSwitchError(null);
      setSwitchingAccountKey(null);
    }
  }, [accountSwitcherOpen, canSwitchAccounts]);

  useEffect(() => {
    if (!historyOpen && !userMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (historyOpen && historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setHistoryOpenPath(null);
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        closeUserMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [historyOpen, userMenuOpen]);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          LV<span className="logo-dot">.</span>
        </Link>
        <ul className={`nav-links ${mobileOpen ? "open" : ""}`} data-tour="primary-nav">
          {primaryNavigation.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={isActivePath(normalizedPath, link.path) ? "active" : ""}
                onClick={() => setMenuOpenPath(null)}
              >
                <span>{translateRouteLabel(link.label)}</span>
                <kbd>{link.shortcut}</kbd>
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          <CommandPaletteTrigger />
          <div className="nav-history" ref={historyRef}>
            <button
              type="button"
              className={`theme-toggle history-btn ${historyOpen ? "active" : ""}`}
              data-tour="recent-pages-trigger"
              aria-label={t("recentlyVisited")}
              aria-expanded={historyOpen}
              onClick={() =>
                setHistoryOpenPath((currentPath) =>
                  currentPath === normalizedPath ? null : normalizedPath,
                )
              }
              title={t("recentlyVisited")}
            >
              <Clock3 size={18} />
            </button>
            <div className={`nav-history-menu ${historyOpen ? "open" : ""}`}>
              <p className="nav-history-title">{t("recentlyVisited")}</p>
              {recentPages.length === 0 ? (
                <p className="nav-history-empty">{t("historyEmpty")}</p>
              ) : (
                <div className="nav-history-list">
                  {recentPages.map((page) => (
                    <Link
                      key={page.path}
                      to={page.path}
                      className="nav-history-item"
                      onClick={() => setHistoryOpenPath(null)}
                    >
                      <span className="nav-history-label">{translateRouteLabel(page.label)}</span>
                      <span className="nav-history-meta">
                        {page.path === normalizedPath ? t("currentPage") : page.path}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            className="theme-toggle shortcuts-btn"
            onClick={() => window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT))}
            aria-label={t("showKeyboardShortcuts")}
            title={`${t("showKeyboardShortcuts")} (?)`}
            data-tour="shortcuts-trigger"
          >
            <HelpCircle size={18} />
          </button>
          <ThemeCustomizer />
          {loading ? (
            <span className="auth-avatar-placeholder" aria-hidden="true" />
          ) : user ? (
            <div className="auth-user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="auth-avatar-btn"
                aria-label={t("userMenu")}
                aria-expanded={userMenuOpen}
                onClick={() => {
                  if (userMenuOpen) {
                    closeUserMenu();
                    return;
                  }

                  setUserMenuOpen(true);
                }}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="auth-avatar-img" referrerPolicy="no-referrer" />
                ) : (
                  <span className="auth-avatar-initial">
                    {(userProfile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              <div className={`auth-dropdown ${userMenuOpen ? "open" : ""}`}>
                <div className="auth-dropdown-section auth-dropdown-section--top">
                  <div className="auth-dropdown-profile-head">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" className="auth-dropdown-avatar" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="auth-dropdown-avatar auth-dropdown-avatar--initial">
                        {(userProfile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  <div className="auth-dropdown-identity">
                      <p className="auth-dropdown-name">
                        {userProfile?.displayName || user.displayName || user.email || "Signed in"}
                      </p>
                      <div className="auth-dropdown-badges">
                        <span className="auth-role-badge">
                          {userProfile?.role === "admin" ? t("admin") : t("member")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    className="auth-dropdown-link auth-dropdown-link--profile"
                    onClick={closeUserMenu}
                  >
                    <UserRound size={15} />
                    <span>{t("profile")}</span>
                  </Link>
                  <Link
                    to="/community"
                    className="auth-dropdown-link auth-dropdown-link--profile"
                    onClick={closeUserMenu}
                  >
                    <Users size={15} />
                    <span>{t("community")}</span>
                  </Link>
                </div>

                <div className="auth-dropdown-divider" />

                <div className="auth-dropdown-section">
                  <Link
                    to="/account-settings"
                    className="auth-dropdown-link"
                    onClick={closeUserMenu}
                  >
                    <Settings2 size={15} />
                    <span>{t("accountSettings")}</span>
                  </Link>
                  {canSwitchAccounts ? (
                    <>
                      <button
                        type="button"
                        className="auth-dropdown-item"
                        aria-expanded={accountSwitcherOpen}
                        onClick={() => {
                          setAccountSwitcherOpen((current) => !current);
                          setLanguageMenuOpen(false);
                          setSwitchError(null);
                        }}
                      >
                        <ArrowRightLeft size={15} />
                        <span>{t("switchAccount")}</span>
                        <ChevronDown
                          size={15}
                          className={`auth-dropdown-chevron ${accountSwitcherOpen ? "open" : ""}`}
                        />
                      </button>
                    </>
                  ) : null}
                  {canSwitchAccounts && accountSwitcherOpen ? (
                    <div className="auth-account-switcher">
                      <div className="auth-account-switcher-list">
                        {displayedAccounts.map((account) => {
                          const accountPhoto = account.photoURL;
                          const isCurrentAccount = account.uid === user?.uid;

                          return (
                            <div className="auth-saved-account" key={account.uid}>
                              <button
                                type="button"
                                className={`auth-saved-account-btn ${isCurrentAccount ? "is-current" : ""}`}
                                onClick={() => {
                                  if (!isCurrentAccount) {
                                    beginAccountSwitch(account);
                                  }
                                }}
                                disabled={!isCurrentAccount && switchingAccountKey === account.uid}
                              >
                                {accountPhoto ? (
                                  <img src={accountPhoto} alt="" className="auth-saved-account-avatar" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="auth-saved-account-avatar auth-saved-account-avatar--initial">
                                    {(account.displayName || account.email || "U").charAt(0).toUpperCase()}
                                  </span>
                                )}
                                <span className="auth-saved-account-copy">
                                  <span className="auth-saved-account-name">{account.displayName}</span>
                                </span>
                                {isCurrentAccount ? (
                                  <span className="auth-saved-account-check" aria-label={t("currentAccount")}>
                                    <Check size={14} />
                                  </span>
                                ) : null}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {switchError ? <p className="auth-account-switcher-error">{switchError}</p> : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="auth-dropdown-item"
                    onClick={() => {
                      void handleSignOut();
                    }}
                  >
                    <LogOut size={15} />
                    <span>{t("signOut")}</span>
                  </button>
                </div>

                <div className="auth-dropdown-divider" />

                <div className="auth-dropdown-section">
                  {userProfile?.role === "admin" ? (
                    <Link
                      to="/admin-dashboard"
                      className="auth-dropdown-link"
                      onClick={closeUserMenu}
                    >
                      <LayoutDashboard size={15} />
                      <span>{t("adminDashboard")}</span>
                    </Link>
                  ) : null}
                  <Link
                    to="/memberships"
                    className="auth-dropdown-link"
                    onClick={closeUserMenu}
                  >
                    <CreditCard size={15} />
                    <span>{t("memberships")}</span>
                  </Link>
                </div>

                <div className="auth-dropdown-divider" />

                <div className="auth-dropdown-section">
                  <button
                    type="button"
                    className="auth-dropdown-item"
                    aria-expanded={languageMenuOpen}
                    onClick={() => {
                      setLanguageMenuOpen((current) => !current);
                      setAccountSwitcherOpen(false);
                      setLanguageError(null);
                    }}
                  >
                    <Globe2 size={15} />
                    <span>{t("displayLanguage")}</span>
                    <span className="auth-dropdown-meta">{getLanguageLabel(currentLanguage)}</span>
                    <ChevronDown
                      size={15}
                      className={`auth-dropdown-chevron ${languageMenuOpen ? "open" : ""}`}
                    />
                  </button>
                  {languageMenuOpen ? (
                    <div className="auth-language-picker">
                      {LANGUAGE_OPTIONS.map((option) => {
                        const isCurrentLanguage = option.value === currentLanguage;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`auth-language-option ${isCurrentLanguage ? "is-current" : ""}`}
                            onClick={() => {
                              void handleLanguageChange(option.value);
                            }}
                            disabled={savingLanguage === option.value}
                          >
                            <span>{getLanguageOptionLabel(option.value)}</span>
                            {isCurrentLanguage ? <Check size={14} /> : null}
                          </button>
                        );
                      })}
                      {languageError ? <p className="auth-account-switcher-error">{languageError}</p> : null}
                    </div>
                  ) : null}
                  <Link
                    to="/settings"
                    className="auth-dropdown-link"
                    onClick={closeUserMenu}
                  >
                    <Settings2 size={15} />
                    <span>{t("settings")}</span>
                  </Link>
                </div>

                <div className="auth-dropdown-divider" />

                <div className="auth-dropdown-section">
                  <Link
                    to="/contact"
                    className="auth-dropdown-link"
                    onClick={closeUserMenu}
                  >
                    <Mail size={15} />
                    <span>{t("contactPage")}</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <Link to="/login" className="auth-signin-link" title={t("signIn")}>
              <LogIn size={18} />
              <span className="auth-signin-text">{t("signIn")}</span>
            </Link>
          )}
          <button
            className={`nav-toggle ${mobileOpen ? "open" : ""}`}
            onClick={() =>
              setMenuOpenPath((currentPath) =>
                currentPath === normalizedPath ? null : normalizedPath,
              )
            }
            aria-label={t("toggleMenu")}
            data-tour="nav-menu-toggle"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
