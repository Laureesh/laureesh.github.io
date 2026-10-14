import { useEffect, useLayoutEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Breadcrumbs from "./components/Breadcrumbs";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import QuickActions from "./components/QuickActions";
import PageTransition from "./components/PageTransition";
import CommandPalette from "./components/CommandPalette";
import KonamiCode from "./components/KonamiCode";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import ReadingProgressBar from "./components/ReadingProgressBar";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import Skills from "./pages/Skills";
import Projects from "./pages/Projects";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogArchive from "./pages/BlogArchive";
import BlogPost from "./pages/BlogPost";
import Community from "./pages/Community";
import PremiumBlog from "./pages/PremiumBlog";
import PremiumBlogPost from "./pages/PremiumBlogPost";
import Resume from "./pages/Resume";
import NotFound from "./pages/NotFound";
import UserPortfolio from "./pages/UserPortfolio";
import Game from "./pages/game/Game";
import SoloGame from "./pages/solo-game/SoloGame";
import MovieApp from "./pages/movie-app/MovieApp";
import MediaHubPortal from "./pages/mediahub/MediaHubPortal";
import YTTags from "./pages/yt-tags/YTTags";
import PasswordGen from "./pages/password-gen/PasswordGen";
import MediaConverter from "./pages/media-converter/MediaConverter";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AccountSettingsPage from "./pages/account/AccountSettingsPage";
import MembershipsPage from "./pages/account/MembershipsPage";
import ProfilePage from "./pages/account/ProfilePage";
import SettingsPage from "./pages/account/SettingsPage";
import { getSwipeTarget } from "./data/siteNavigation";
import "./App.css";


const PAGE_TITLES: Record<string, string> = {
  "/": "Laureesh Volmar | Developer Portfolio",
  "/about": "About Laureesh Volmar | Developer Portfolio",
  "/skills": "Technical Skills | Laureesh Volmar",
  "/projects": "Software Projects | Laureesh Volmar",
  "/contact": "Contact Laureesh Volmar",
  "/blog": "Developer Blog | Laureesh Volmar",
  "/blog/archive": "Blog Archive | Laureesh Volmar",
  "/blog/premium": "Premium Articles | Laureesh Volmar",
  "/community": "Member Community | Laureesh Volmar",
  "/resume": "Resume | Laureesh Volmar",
  "/game": "Multiplayer Game | Laureesh Volmar",
  "/solo-game": "Solo Game | Laureesh Volmar",
  "/movie-app": "Movie Explorer | Laureesh Volmar",
  "/mediahub": "Media Hub | Laureesh Volmar",
  "/yt-tags": "YouTube Tag Generator | Laureesh Volmar",
  "/password-gen": "Password Generator | Laureesh Volmar",
  "/media-converter": "Media Converter | Laureesh Volmar",
  "/profile": "Your Profile | Laureesh Volmar",
  "/account-settings": "Account Security | Laureesh Volmar",
  "/memberships": "Memberships | Laureesh Volmar",
  "/settings": "Settings | Laureesh Volmar",
  "/login": "Sign In | Laureesh Volmar",
  "/register": "Create Account | Laureesh Volmar",
  "/switch-account": "Switch Account | Laureesh Volmar",

};

function readableRouteSegment(segment: string) {
  return decodeURIComponent(segment.split("--")[0]).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pageTitleForPath(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/blog/premium/")) return `${readableRouteSegment(pathname.split("/").filter(Boolean).at(-1) ?? "Article")} | Premium Article`;
  if (pathname.startsWith("/blog/")) return `${readableRouteSegment(pathname.split("/").filter(Boolean).at(-1) ?? "Article")} | Laureesh Volmar`;
  if (pathname.startsWith("/user/")) return "Member Portfolio | Laureesh Volmar";

  return "Page Not Found | Laureesh Volmar";
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthRoute = (
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/switch-account"
  );
  const showAppChrome = true;
  const showBreadcrumbs = location.pathname !== "/" && !isAuthRoute;

  // Set the route fallback before pages apply titles from their loaded content.
  useLayoutEffect(() => {
    document.title = pageTitleForPath(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const disabledSwipePrefixes = [
      "/game",
      "/solo-game",
      "/movie-app",
      "/mediahub",
      "/yt-tags",
      "/password-gen",
      "/media-converter",
      "/login",
      "/register",
      "/switch-account",
    ];

    if (disabledSwipePrefixes.some((prefix) => location.pathname.startsWith(prefix))) {
      return undefined;
    }

    const main = document.getElementById("main-content");

    if (!main) {
      return undefined;
    }

    let startX = 0;
    let startY = 0;
    let trackingSwipe = false;

    const shouldIgnoreTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return false;
      }

      return Boolean(
        target.closest(
          "a, button, input, textarea, select, label, summary, [contenteditable='true'], [data-no-swipe='true']",
        ),
      );
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!window.matchMedia("(max-width: 768px)").matches || shouldIgnoreTarget(event.target)) {
        trackingSwipe = false;
        return;
      }

      const touch = event.changedTouches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      trackingSwipe = true;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!trackingSwipe) {
        return;
      }

      trackingSwipe = false;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (Math.abs(deltaX) < 72 || Math.abs(deltaY) > 56) {
        return;
      }

      const direction = deltaX < 0 ? "next" : "prev";
      const targetPath = getSwipeTarget(location.pathname, direction);

      if (targetPath && targetPath !== location.pathname) {
        navigate(targetPath);
      }
    };

    main.addEventListener("touchstart", handleTouchStart, { passive: true });
    main.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      main.removeEventListener("touchstart", handleTouchStart);
      main.removeEventListener("touchend", handleTouchEnd);
    };
  }, [location.pathname, navigate]);

  return (
    <>
      {showAppChrome ? (
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
      ) : null}
      {showAppChrome ? <Navbar /> : null}
      {showBreadcrumbs ? <Breadcrumbs /> : null}
      {showAppChrome ? <ReadingProgressBar /> : null}
      <main
        id="main-content"
        tabIndex={-1}
        className={`app-main ${showBreadcrumbs ? "app-main-with-breadcrumbs" : ""}`}
      >
        <PageTransition>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/archive" element={<BlogArchive />} />
            <Route path="/blog/premium" element={<PremiumBlog />} />
            <Route path="/blog/premium/:slug" element={<PremiumBlogPost />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route
              path="/community"
              element={(
                <ProtectedRoute requiredRole={["member", "admin"]}>
                  <Community />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/user/:id"
              element={(
                <ProtectedRoute requiredRole={["member", "admin"]}>
                  <UserPortfolio />
                </ProtectedRoute>
              )}
            />
            <Route path="/resume" element={<Resume />} />
            <Route path="/game" element={<Game />} />
            <Route path="/solo-game" element={<SoloGame />} />
            <Route path="/movie-app" element={<MovieApp />} />
            <Route path="/mediahub" element={<MediaHubPortal />} />
            <Route path="/yt-tags" element={<YTTags />} />
            <Route path="/password-gen" element={<PasswordGen />} />
            <Route path="/media-converter" element={<MediaConverter />} />
            <Route
              path="/profile"
              element={(
                <ProtectedRoute requiredRole={["member", "admin"]}>
                  <ProfilePage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/account-settings"
              element={(
                <ProtectedRoute requiredRole={["member", "admin"]}>
                  <AccountSettingsPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/memberships"
              element={(
                <ProtectedRoute requiredRole={["member", "admin"]}>
                  <MembershipsPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/settings"
              element={(
                <ProtectedRoute requiredRole={["member", "admin"]}>
                  <SettingsPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/login"
              element={(
                <PublicOnlyRoute redirectTo="/profile">
                  <Login />
                </PublicOnlyRoute>
              )}
            />
            <Route
              path="/register"
              element={(
                <PublicOnlyRoute redirectTo="/profile">
                  <Register />
                </PublicOnlyRoute>
              )}
            />
            <Route
              path="/switch-account"
              element={(
                <ProtectedRoute requiredRole={["member", "admin"]}>
                  <Login />
                </ProtectedRoute>
              )}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </main>
      {showAppChrome ? <Footer /> : null}
      {showAppChrome ? <QuickActions /> : null}
      {showAppChrome ? <BackToTop /> : null}
      {showAppChrome ? <CommandPalette /> : null}
      {showAppChrome ? <KonamiCode /> : null}
      {showAppChrome ? <KeyboardShortcuts /> : null}
    </>
  );
}
