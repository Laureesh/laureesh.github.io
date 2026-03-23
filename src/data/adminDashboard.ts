import {
  FileText,
  FilePenLine,
  LayoutDashboard,
  LockKeyhole,
  ListTodo,
  SlidersHorizontal,
  Users2,
  type LucideIcon,
} from "lucide-react";

export type AdminDashboardSectionKey =
  | "overview"
  | "content"
  | "pages"
  | "users"
  | "tasks"
  | "feature-toggles"
  | "private-pages";

export interface AdminDashboardSection {
  key: AdminDashboardSectionKey;
  path: string;
  label: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
}

export const adminDashboardSections: AdminDashboardSection[] = [
  {
    key: "overview",
    path: "/admin-dashboard",
    label: "Overview",
    eyebrow: "Admin Shell",
    description: "Landing space for the protected admin area, with quick links into the next CMS and operations modules.",
    icon: LayoutDashboard,
    highlights: [
      "Admin-only route protection",
      "Scalable sidebar shell",
      "Foundation for future CMS and moderation tools",
    ],
  },
  {
    key: "content",
    path: "/admin-dashboard/content",
    label: "Content",
    eyebrow: "CMS Module",
    description: "Live Firestore-backed CMS workspace for blog posts, site projects, and shared public links.",
    icon: FileText,
    highlights: [
      "Blog, project, and link CRUD",
      "Public pages read this source safely",
      "Import current local content into Firestore",
    ],
  },
  {
    key: "pages",
    path: "/admin-dashboard/pages",
    label: "Pages",
    eyebrow: "Page Editor",
    description: "Structured editor for major page copy that persists in Firestore and renders on the live site.",
    icon: FilePenLine,
    highlights: [
      "Public and private page copy editing",
      "Structured sections instead of raw HTML",
      "Inline preview before saving",
    ],
  },
  {
    key: "users",
    path: "/admin-dashboard/users",
    label: "Users",
    eyebrow: "User Management",
    description: "Live admin user management for search, filtering, role assignment, and access-control updates.",
    icon: Users2,
    highlights: [
      "User search and filtering",
      "Role assignment and moderation",
      "Access restriction and removal controls",
    ],
  },
  {
    key: "tasks",
    path: "/admin-dashboard/tasks",
    label: "Tasks",
    eyebrow: "Operations",
    description: "Live Firestore-backed Kanban board for internal admin planning, task movement, and workflow tracking.",
    icon: ListTodo,
    highlights: [
      "Drag tasks between workflow columns",
      "Add, edit, and delete internal admin work",
      "Persist board state in Firestore",
    ],
  },
  {
    key: "feature-toggles",
    path: "/admin-dashboard/feature-toggles",
    label: "Feature Toggles",
    eyebrow: "Controls",
    description: "Operational switches for staged launches, premium content visibility, and export tooling.",
    icon: SlidersHorizontal,
    highlights: [
      "Public and admin-only toggle separation",
      "Firestore-backed rollout control",
      "Launch features without redeploying code",
    ],
  },
  {
    key: "private-pages",
    path: "/admin-dashboard/private-pages",
    label: "Private Pages",
    eyebrow: "Protected Content",
    description: "Admin-only private pages for internal routines and notes that stay hidden from members and public visitors.",
    icon: LockKeyhole,
    highlights: [
      "Food Routine page",
      "Face Routine page",
      "Standalone UEFN leaderboard tool",
    ],
  },
];

export const adminDashboardModules = adminDashboardSections.filter(
  (section) => section.key !== "overview",
);

export function normalizeAdminPath(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function getAdminDashboardSection(pathname: string) {
  const normalizedPath = normalizeAdminPath(pathname);
  const exactMatch = adminDashboardSections.find((section) => section.path === normalizedPath);

  if (exactMatch) {
    return exactMatch;
  }

  const nestedMatch = [...adminDashboardSections]
    .sort((left, right) => right.path.length - left.path.length)
    .find((section) => normalizedPath.startsWith(`${section.path}/`));

  return nestedMatch ?? adminDashboardSections[0];
}
