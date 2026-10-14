import { getDocs, Timestamp } from "firebase/firestore";
import { isFirebaseConfigured } from "../firebase";
import type {
  BlogPostRecord,
  ContentStatus,
  FeatureToggleRecord,
  LinkRecord,
  PageContentRecord,
  ProjectRecord,
  TaskRecord,
  UserProfile,
} from "../types/models";
import {
  blogsCollection,
  featureTogglesCollection,
  linksCollection,
  pagesCollection,
  projectsCollection,
  tasksCollection,
  usersCollection,
} from "./collections";
import { assertCurrentUserCanAccessAdmin } from "./adminSecurity";
import { getDefaultFeatureToggleState, getFeatureToggleDefinition, getFeatureToggleKeys } from "./featureToggles";

export interface AdminOverviewMetricGroup {
  total: number;
  published?: number;
  scheduled?: number;
  draft?: number;
  archived?: number;
  private?: number;
  public?: number;
  active?: number;
  inactive?: number;
}

export interface AdminSearchResult {
  id: string;
  type: "blog" | "project" | "link" | "page" | "task";
  title: string;
  subtitle: string;
  status: string;
  path: string;
}

export interface AdminOverviewData {
  users: AdminOverviewMetricGroup & {
    admins: number;
    members: number;
    publicProfiles: number;
  };
  blogs: AdminOverviewMetricGroup;
  projects: AdminOverviewMetricGroup & {
    featured: number;
  };
  links: AdminOverviewMetricGroup & {
    activeLinks: number;
  };
  pages: AdminOverviewMetricGroup;
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
  };
  featureToggles: {
    total: number;
    enabled: number;
    public: number;
  };
  searchIndex: AdminSearchResult[];
}

function formatScheduledAt(value: Timestamp | null | undefined) {
  if (!value) {
    return "No schedule";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(value.toDate());
  } catch {
    return "No schedule";
  }
}

function buildContentStatusCounts(records: Array<{ status: ContentStatus; visibility?: string | null }>) {
  return records.reduce(
    (counts, record) => {
      counts.total += 1;
      counts[record.status] += 1;

      if (record.visibility === "public") {
        counts.public += 1;
      } else if (record.visibility === "private") {
        counts.private += 1;
      }

      return counts;
    },
    {
      total: 0,
      published: 0,
      scheduled: 0,
      draft: 0,
      archived: 0,
      public: 0,
      private: 0,
    } satisfies Record<ContentStatus | "total" | "public" | "private", number>,
  );
}

function buildSearchIndex(input: {
  blogs: BlogPostRecord[];
  projects: ProjectRecord[];
  links: LinkRecord[];
  pages: PageContentRecord[];
  tasks: TaskRecord[];
}) {
  const results: AdminSearchResult[] = [];

  input.blogs.forEach((record) => {
    const id = record.id ?? record.slug;
    results.push({
      id: `blog-${id}`,
      type: "blog",
      title: record.title,
      subtitle: record.slug,
      status:
        record.status === "scheduled"
          ? `Scheduled for ${formatScheduledAt(record.scheduledAt)}`
          : `${record.status} / ${record.visibility}`,
      path: `/admin-dashboard/content?section=blogs&item=${encodeURIComponent(id)}`,
    });
  });

  input.projects.forEach((record) => {
    const id = record.id ?? record.slug;
    results.push({
      id: `project-${id}`,
      type: "project",
      title: record.title,
      subtitle: record.slug,
      status: `${record.status} / ${record.visibility}`,
      path: `/admin-dashboard/content?section=projects&item=${encodeURIComponent(id)}`,
    });
  });

  input.links.forEach((record) => {
    const id = record.id ?? record.label;
    results.push({
      id: `link-${id}`,
      type: "link",
      title: record.label,
      subtitle: record.url,
      status: `${record.category} / ${record.isActive ? "active" : "inactive"}`,
      path: `/admin-dashboard/content?section=links&item=${encodeURIComponent(id)}`,
    });
  });

  input.pages.forEach((record) => {
    results.push({
      id: `page-${record.pageKey}`,
      type: "page",
      title: record.title,
      subtitle: record.pageKey,
      status:
        record.status === "scheduled"
          ? `Scheduled for ${formatScheduledAt(record.scheduledAt)}`
          : `${record.status} / ${record.visibility}`,
      path: `/admin-dashboard/pages?page=${encodeURIComponent(record.pageKey)}`,
    });
  });

  input.tasks.forEach((record) => {
    results.push({
      id: `task-${record.id ?? record.title}`,
      type: "task",
      title: record.title,
      subtitle: record.description || "Task board card",
      status: `${record.column.replace("_", " ")} / ${record.priority}`,
      path: "/admin-dashboard/tasks",
    });
  });

  return results.sort((left, right) => left.title.localeCompare(right.title));
}

function serializeFirestoreValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeFirestoreValue(nestedValue)]),
    );
  }

  return value;
}

function serializeFirestoreMap(value: Record<string, unknown>) {
  return serializeFirestoreValue(value) as Record<string, unknown>;
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  await assertCurrentUserCanAccessAdmin();

  if (!isFirebaseConfigured) {
    return {
      users: { total: 0, admins: 0, members: 0, publicProfiles: 0, active: 0, inactive: 0 },
      blogs: { total: 0, published: 0, scheduled: 0, draft: 0, archived: 0, public: 0, private: 0 },
      projects: {
        total: 0,
        published: 0,
        scheduled: 0,
        draft: 0,
        archived: 0,
        public: 0,
        private: 0,
        featured: 0,
      },
      links: { total: 0, activeLinks: 0, active: 0, inactive: 0 },
      pages: { total: 0, published: 0, scheduled: 0, draft: 0, archived: 0, public: 0, private: 0 },
      tasks: { total: 0, todo: 0, inProgress: 0, completed: 0 },
      featureToggles: { total: getFeatureToggleKeys().length, enabled: 0, public: 0 },
      searchIndex: [],
    };
  }

  const [usersSnapshot, blogsSnapshot, projectsSnapshot, linksSnapshot, pagesSnapshot, tasksSnapshot, togglesSnapshot] =
    await Promise.all([
      getDocs(usersCollection()),
      getDocs(blogsCollection()),
      getDocs(projectsCollection()),
      getDocs(linksCollection()),
      getDocs(pagesCollection()),
      getDocs(tasksCollection()),
      getDocs(featureTogglesCollection()),
    ]);

  const users = usersSnapshot.docs.map((documentSnapshot) => documentSnapshot.data()) as UserProfile[];
  const blogs = blogsSnapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  })) as BlogPostRecord[];
  const projects = projectsSnapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  })) as ProjectRecord[];
  const links = linksSnapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  })) as LinkRecord[];
  const pages = pagesSnapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  })) as PageContentRecord[];
  const tasks = tasksSnapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  })) as TaskRecord[];
  const toggles = togglesSnapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  })) as FeatureToggleRecord[];

  const userMetrics = {
    total: users.length,
    admins: users.filter((record) => record.role === "admin").length,
    members: users.filter((record) => record.role === "member").length,
    publicProfiles: users.filter((record) => record.isPublic).length,
    active: users.filter((record) => record.status === "active").length,
    inactive: users.filter((record) => record.status !== "active").length,
  };

  const blogMetrics = buildContentStatusCounts(blogs);
  const pageMetrics = buildContentStatusCounts(pages);
  const projectVisibilityCounts = projects.reduce(
    (counts, record) => {
      counts.total += 1;

      if (record.visibility === "public") {
        counts.public += 1;
      } else {
        counts.private += 1;
      }

      if (record.featured) {
        counts.featured += 1;
      }

      if (record.status === "completed") {
        counts.published += 1;
      } else if (record.status === "planned") {
        counts.draft += 1;
      } else {
        counts.scheduled += 1;
      }

      return counts;
    },
    {
      total: 0,
      published: 0,
      scheduled: 0,
      draft: 0,
      archived: 0,
      public: 0,
      private: 0,
      featured: 0,
    },
  );

  const linkMetrics = {
    total: links.length,
    activeLinks: links.filter((record) => record.isActive).length,
    active: links.filter((record) => record.isActive).length,
    inactive: links.filter((record) => !record.isActive).length,
  };

  const taskMetrics = tasks.reduce(
    (counts, record) => {
      counts.total += 1;

      if (record.column === "todo") {
        counts.todo += 1;
      } else if (record.column === "in_progress") {
        counts.inProgress += 1;
      } else {
        counts.completed += 1;
      }

      return counts;
    },
    { total: 0, todo: 0, inProgress: 0, completed: 0 },
  );

  const mergedToggleStates = getFeatureToggleKeys().map((key) => {
    const existing = toggles.find((toggle) => toggle.key === key || toggle.id === key);

    return existing ?? {
      key,
      enabled: getDefaultFeatureToggleState(key),
      public: getFeatureToggleDefinition(key).public,
    };
  });

  const searchIndex = buildSearchIndex({
    blogs,
    projects,
    links,
    pages,
    tasks,
  });

  return {
    users: userMetrics,
    blogs: blogMetrics,
    projects: projectVisibilityCounts,
    links: linkMetrics,
    pages: pageMetrics,
    tasks: taskMetrics,
    featureToggles: {
      total: mergedToggleStates.length,
      enabled: mergedToggleStates.filter((toggle) => toggle.enabled).length,
      public: mergedToggleStates.filter((toggle) => toggle.public).length,
    },
    searchIndex,
  };
}

export async function buildAdminBackupSnapshot() {
  await assertCurrentUserCanAccessAdmin();

  if (!isFirebaseConfigured) {
    return {
      exportedAt: new Date().toISOString(),
      counts: {
        blogs: 0,
        projects: 0,
        links: 0,
        pages: 0,
        tasks: 0,
        featureToggles: 0,
      },
      data: {
        blogs: [],
        projects: [],
        links: [],
        pages: [],
        tasks: [],
        featureToggles: [],
      },
    };
  }

  const [blogsSnapshot, projectsSnapshot, linksSnapshot, pagesSnapshot, tasksSnapshot, togglesSnapshot] =
    await Promise.all([
      getDocs(blogsCollection()),
      getDocs(projectsCollection()),
      getDocs(linksCollection()),
      getDocs(pagesCollection()),
      getDocs(tasksCollection()),
      getDocs(featureTogglesCollection()),
    ]);

  const data = {
    blogs: blogsSnapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...serializeFirestoreMap(documentSnapshot.data() as unknown as Record<string, unknown>),
    })),
    projects: projectsSnapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...serializeFirestoreMap(documentSnapshot.data() as unknown as Record<string, unknown>),
    })),
    links: linksSnapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...serializeFirestoreMap(documentSnapshot.data() as unknown as Record<string, unknown>),
    })),
    pages: pagesSnapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...serializeFirestoreMap(documentSnapshot.data() as unknown as Record<string, unknown>),
    })),
    tasks: tasksSnapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...serializeFirestoreMap(documentSnapshot.data() as unknown as Record<string, unknown>),
    })),
    featureToggles: togglesSnapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...serializeFirestoreMap(documentSnapshot.data() as unknown as Record<string, unknown>),
    })),
  };

  return {
    exportedAt: new Date().toISOString(),
    counts: {
      blogs: data.blogs.length,
      projects: data.projects.length,
      links: data.links.length,
      pages: data.pages.length,
      tasks: data.tasks.length,
      featureToggles: data.featureToggles.length,
    },
    data,
  };
}
