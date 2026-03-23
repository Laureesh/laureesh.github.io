import { lazy, Suspense, useEffect } from "react";
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
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AccountSettingsPage from "./pages/account/AccountSettingsPage";
import MembershipsPage from "./pages/account/MembershipsPage";
import ProfilePage from "./pages/account/ProfilePage";
import SettingsPage from "./pages/account/SettingsPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminDashboardLayout from "./pages/admin/AdminDashboardLayout";
import AdminDashboardHome from "./pages/admin/AdminDashboardHome";
import AdminFeatureTogglesPage from "./pages/admin/AdminFeatureTogglesPage";
import AdminPagesPage from "./pages/admin/AdminPagesPage";
import AdminPrivatePagesPage from "./pages/admin/AdminPrivatePagesPage";
import AdminPrivatePageView from "./pages/admin/AdminPrivatePageView";
import AdminTasksPage from "./pages/admin/AdminTasksPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import { getSwipeTarget } from "./data/siteNavigation";
import "./App.css";

const AdminFnLeaderboardPage = lazy(() => import("./pages/admin/AdminFnLeaderboardPage"));

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isStandaloneAdminToolRoute = location.pathname === "/admin-dashboard/private-pages/fn-leaderboard";
  const isAuthRoute = (
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/switch-account"
  );
  const showAppChrome = !isStandaloneAdminToolRoute;
  const showBreadcrumbs = location.pathname !== "/" && !isAuthRoute && !isStandaloneAdminToolRoute;

  useEffect(() => {
    const disabledSwipePrefixes = [
      "/game",
      "/solo-game",
      "/movie-app",
      "/mediahub",
      "/yt-tags",
      "/password-gen",
      "/admin-dashboard/private-pages/fn-leaderboard",
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
        className={`app-main ${showBreadcrumbs ? "app-main-with-breadcrumbs" : ""} ${isStandaloneAdminToolRoute ? "app-main--standalone" : ""}`}
      >
        <PageTransition disableAnimation={isStandaloneAdminToolRoute}>
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
              path="/admin-dashboard/private-pages/fn-leaderboard"
              element={(
                <ProtectedRoute requiredRole="admin" unauthorizedRedirectTo="/profile">
                  <Suspense
                    fallback={(
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          minHeight: "100vh",
                        }}
                      >
                        <div className="auth-spinner" />
                      </div>
                    )}
                  >
                    <AdminFnLeaderboardPage />
                  </Suspense>
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin-dashboard"
              element={(
                <ProtectedRoute requiredRole="admin" unauthorizedRedirectTo="/profile">
                  <AdminDashboardLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<AdminDashboardHome />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="pages" element={<AdminPagesPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="tasks" element={<AdminTasksPage />} />
              <Route path="feature-toggles" element={<AdminFeatureTogglesPage />} />
              <Route path="private-pages" element={<AdminPrivatePagesPage />} />
              <Route
                path="private-pages/food-routine"
                element={<AdminPrivatePageView pageKey="food-routine" />}
              />
              <Route
                path="private-pages/face-routine"
                element={<AdminPrivatePageView pageKey="face-routine" />}
              />
            </Route>
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
