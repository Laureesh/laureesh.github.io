import { getBlogPostBySlug } from "./blogPosts";
import { getAdminDashboardSection } from "./adminDashboard";

export interface BreadcrumbCrumb {
  label: string;
  path?: string;
}

export interface NavigationItem {
  path: string;
  label: string;
  shortcut: string;
}

interface PageMeta {
  label: string;
  breadcrumbs: BreadcrumbCrumb[];
  swipeBasePath?: string;
  trackRecent?: boolean;
}

export interface RecentPage {
  path: string;
  label: string;
  visitedAt: number;
}

export const RECENT_PAGES_STORAGE_KEY = "portfolio-recent-pages";
export const MAX_RECENT_PAGES = 5;

export const primaryNavigation: NavigationItem[] = [
  { path: "/", label: "Home", shortcut: "H" },
  { path: "/about", label: "About", shortcut: "A" },
  { path: "/skills", label: "Skills", shortcut: "S" },
  { path: "/projects", label: "Projects", shortcut: "P" },
  { path: "/blog", label: "Blog", shortcut: "B" },
  { path: "/resume", label: "Resume", shortcut: "R" },
  { path: "/contact", label: "Contact", shortcut: "C" },
];

const staticPageMeta: Record<string, PageMeta> = {
  "/": {
    label: "Home",
    breadcrumbs: [{ label: "Home" }],
  },
  "/about": {
    label: "About",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "About" },
    ],
  },
  "/skills": {
    label: "Skills",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Skills" },
    ],
  },
  "/projects": {
    label: "Projects",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Projects" },
    ],
  },
  "/community": {
    label: "Community",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Community" },
    ],
    trackRecent: true,
  },
  "/movie-app": {
    label: "Movie Streaming App",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: "Movie Streaming App" },
    ],
    swipeBasePath: "/projects",
  },
  "/mediahub": {
    label: "MediaHub",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: "MediaHub" },
    ],
    swipeBasePath: "/projects",
  },
  "/game": {
    label: "Escaping The Red Cross",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: "Escaping The Red Cross" },
    ],
    swipeBasePath: "/projects",
  },
  "/solo-game": {
    label: "Solo Text-Based Adventure",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: "Solo Text-Based Adventure" },
    ],
    swipeBasePath: "/projects",
  },
  "/yt-tags": {
    label: "YouTube Tag Generator",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: "YouTube Tag Generator" },
    ],
    swipeBasePath: "/projects",
  },
  "/password-gen": {
    label: "Password Generator",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: "Password Generator" },
    ],
    swipeBasePath: "/projects",
  },
  "/media-converter": {
    label: "Media Converter",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: "Media Converter" },
    ],
    swipeBasePath: "/projects",
  },
  "/blog": {
    label: "Blog",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Blog" },
    ],
  },
  "/blog/archive": {
    label: "Blog Archive",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Blog", path: "/blog" },
      { label: "Archive" },
    ],
    swipeBasePath: "/blog",
  },
  "/resume": {
    label: "Resume",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Resume" },
    ],
  },
  "/contact": {
    label: "Contact",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Contact" },
    ],
  },
  "/profile": {
    label: "Profile",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Profile" },
    ],
  },
  "/account-settings": {
    label: "Account Settings",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Account Settings" },
    ],
  },
  "/memberships": {
    label: "Purchases and Memberships",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Purchases and Memberships" },
    ],
  },
  "/settings": {
    label: "Settings",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Settings" },
    ],
  },
  "/admin-dashboard": {
    label: "Admin Dashboard",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Admin Dashboard" },
    ],
    trackRecent: false,
  },
  "/admin-dashboard/private-pages/food-routine": {
    label: "Food Routine",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Admin Dashboard", path: "/admin-dashboard" },
      { label: "Private Pages", path: "/admin-dashboard/private-pages" },
      { label: "Food Routine" },
    ],
    trackRecent: false,
  },
  "/admin-dashboard/private-pages/face-routine": {
    label: "Face Routine",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Admin Dashboard", path: "/admin-dashboard" },
      { label: "Private Pages", path: "/admin-dashboard/private-pages" },
      { label: "Face Routine" },
    ],
    trackRecent: false,
  },
  "/admin-dashboard/private-pages/fn-leaderboard": {
    label: "UEFN Leaderboard Manager",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Admin Dashboard", path: "/admin-dashboard" },
      { label: "Private Pages", path: "/admin-dashboard/private-pages" },
      { label: "UEFN Leaderboard Manager" },
    ],
    trackRecent: false,
  },
  "/login": {
    label: "Sign In",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Sign In" },
    ],
    trackRecent: false,
  },
  "/register": {
    label: "Create Account",
    breadcrumbs: [
      { label: "Home", path: "/" },
      { label: "Create Account" },
    ],
    trackRecent: false,
  },
};

export function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function getPageMeta(pathname: string): PageMeta | null {
  const normalizedPath = normalizePath(pathname);
  const staticMatch = staticPageMeta[normalizedPath];

  if (staticMatch) {
    return staticMatch;
  }

  if (normalizedPath.startsWith("/blog/")) {
    const slug = normalizedPath.replace("/blog/", "");
    const post = getBlogPostBySlug(slug);

    if (!post) {
      const derivedLabel = slug
        .split("-")
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");

      return {
        label: derivedLabel || "Blog Post",
        breadcrumbs: [
          { label: "Home", path: "/" },
          { label: "Blog", path: "/blog" },
          { label: derivedLabel || "Blog Post" },
        ],
        swipeBasePath: "/blog",
      };
    }

    return {
      label: post.title,
      breadcrumbs: [
        { label: "Home", path: "/" },
        { label: "Blog", path: "/blog" },
        { label: post.title },
      ],
      swipeBasePath: "/blog",
    };
  }

  if (normalizedPath.startsWith("/user/")) {
    return {
      label: "Member Portfolio",
      breadcrumbs: [
        { label: "Home", path: "/" },
        { label: "Community", path: "/community" },
        { label: "Member Portfolio" },
      ],
    };
  }

  if (normalizedPath.startsWith("/admin-dashboard/")) {
    const section = getAdminDashboardSection(normalizedPath);

    return {
      label: section.label,
      breadcrumbs: [
        { label: "Home", path: "/" },
        { label: "Admin Dashboard", path: "/admin-dashboard" },
        { label: section.label },
      ],
      trackRecent: false,
    };
  }

  return null;
}

export function getBreadcrumbsForPath(pathname: string) {
  return (
    getPageMeta(pathname)?.breadcrumbs ?? [
      { label: "Home", path: "/" },
      { label: "Not Found" },
    ]
  );
}

export function getTrackablePage(pathname: string): RecentPage | null {
  const normalizedPath = normalizePath(pathname);
  const meta = getPageMeta(normalizedPath);

  if (!meta || meta.trackRecent === false) {
    return null;
  }

  return {
    path: normalizedPath,
    label: meta.label,
    visitedAt: Date.now(),
  };
}

export function getSwipeTarget(pathname: string, direction: "next" | "prev") {
  const normalizedPath = normalizePath(pathname);
  const meta = getPageMeta(normalizedPath);
  const swipeBasePath = meta?.swipeBasePath ?? normalizedPath;
  const swipePaths = primaryNavigation.map((item) => item.path);
  const currentIndex = swipePaths.indexOf(swipeBasePath);

  if (currentIndex === -1) {
    return null;
  }

  const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

  if (nextIndex < 0 || nextIndex >= swipePaths.length) {
    return null;
  }

  return swipePaths[nextIndex];
}
