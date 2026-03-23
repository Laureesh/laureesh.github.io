import { getDocs, query, where, Timestamp } from "firebase/firestore";
import {
  blogDocument,
  blogsCollection,
  linkDocument,
  linksCollection,
  projectDocument,
  projectsCollection,
} from "./collections";
import { logAdminActivity } from "./adminActivity";
import { assertCurrentUserCanAccessAdmin } from "./adminSecurity";
import { deleteRecord, getRecord, setRecord, updateRecord } from "./repository";
import { isFirebaseConfigured } from "../firebase";
import { timestampNow } from "../firebase/firestore";
import {
  blogPosts as fallbackBlogPosts,
  blogSeries,
  BLOG_BASE_URL,
  type BlogPost as StaticBlogPost,
  type BlogReactionSeeds,
  type BlogSection,
} from "../data/blogPosts";
import {
  projectShowcase as fallbackProjectShowcase,
  type ProjectCategory as StaticProjectCategory,
  type ProjectGallerySlide,
  type ProjectShowcaseItem,
  type ProjectStatus as StaticProjectStatus,
  type ProjectType as StaticProjectType,
} from "../data/projectShowcase";
import type {
  BlogPostRecord,
  BlogSectionRecord,
  BlogSeriesReference,
  ContentStatus,
  LinkRecord,
  MediaAsset,
  ProjectArchitectureLaneRecord,
  ProjectContributionMix,
  ProjectLifecycleStatus,
  ProjectRecord,
  ProjectScope,
  ProjectSourcePreviewRecord,
  ProjectStackGroupRecord,
  ProjectType,
  VisibilitySetting,
} from "../types/models";

export interface ResolvedBlogSeries {
  slug: string;
  order: number;
  title: string;
  description: string;
}

export interface ResolvedBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  readTimeMinutes: number;
  tags: string[];
  popularity: number;
  reactionSeeds: BlogReactionSeeds;
  externalUrl?: string;
  intro?: string[];
  sections?: BlogSection[];
  closing?: string;
  series?: ResolvedBlogSeries | null;
  status: ContentStatus;
  visibility: VisibilitySetting;
  source: "fallback" | "firestore";
}

export interface ResolvedBlogArchiveMonthGroup {
  key: string;
  label: string;
  posts: ResolvedBlogPost[];
}

export interface ResolvedBlogArchiveYearGroup {
  year: string;
  months: ResolvedBlogArchiveMonthGroup[];
}

export interface ResolvedBlogSeriesGroup {
  series: {
    slug: string;
    title: string;
    description: string;
  };
  posts: ResolvedBlogPost[];
}

export interface AdminBlogInput {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  scheduledAt: string | null;
  readTimeMinutes: number;
  tags: string[];
  status: ContentStatus;
  visibility: VisibilitySetting;
  externalUrl: string | null;
  popularity: number;
  reactionSeeds: BlogReactionSeeds;
  intro: string[];
  sections: BlogSection[];
  closing: string | null;
  series: BlogSeriesReference | null;
  seriesTitle: string | null;
  seriesDescription: string | null;
}

export interface AdminSiteProjectInput {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: StaticProjectCategory;
  type: StaticProjectType;
  status: StaticProjectStatus;
  visibility: VisibilitySetting;
  featured: boolean;
  startDate: string | null;
  endDate: string | null;
  estimatedTime: string | null;
  complexity: number;
  comparisonSummary: string;
  effortLabel: string | null;
  effortNote: string | null;
  tags: string[];
  techStack: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  assets: MediaAsset[];
  stackGroups: ProjectStackGroupRecord[];
  contributions: ProjectContributionMix;
  learned: string[];
  sourcePreview: ProjectSourcePreviewRecord;
  gallery: ProjectGallerySlide[];
  architecture: {
    summary: string;
    lanes: ProjectArchitectureLaneRecord[];
  };
  relatedIds: string[];
}

export interface PublicSiteLink {
  id: string;
  label: string;
  url: string;
  category: string;
  description: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  source: "fallback" | "firestore";
}

export interface AdminLinkInput {
  label: string;
  url: string;
  category: string;
  description: string;
  icon: string | null;
  isActive: boolean;
  order: number;
}

const defaultReactionSeeds: BlogReactionSeeds = {
  heart: 8,
  insightful: 5,
  useful: 12,
};

const defaultSiteLinks: PublicSiteLink[] = [
  {
    id: "social-github",
    label: "GitHub",
    url: "https://github.com/laureesh",
    category: "social",
    description: "Primary GitHub profile link used across the site shell.",
    icon: "github",
    order: 10,
    isActive: true,
    source: "fallback",
  },
  {
    id: "social-linkedin",
    label: "LinkedIn",
    url: "https://linkedin.com/in/laureesh",
    category: "social",
    description: "Primary LinkedIn profile link used across the site shell.",
    icon: "linkedin",
    order: 20,
    isActive: true,
    source: "fallback",
  },
  {
    id: "social-email",
    label: "Email",
    url: "mailto:laureesh1@gmail.com",
    category: "social",
    description: "Primary email link used across the site shell.",
    icon: "mail",
    order: 30,
    isActive: true,
    source: "fallback",
  },
];

function slugify(value: string, fallback = "content-item") {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function normalizeStringList(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();

    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function timestampFromDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Timestamp.fromDate(parsed);
}

function timestampFromDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Timestamp.fromDate(parsed);
}

function getDateStringFromTimestamp(value?: Timestamp | null) {
  if (!value) {
    return null;
  }

  try {
    return value.toDate().toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function isScheduledContentVisible(status: ContentStatus, scheduledAt?: Timestamp | null) {
  if (status === "published") {
    return true;
  }

  if (status !== "scheduled" || !scheduledAt) {
    return false;
  }

  try {
    return scheduledAt.toMillis() <= Date.now();
  } catch {
    return false;
  }
}

function formatReadTime(readTimeMinutes: number) {
  return `${Math.max(1, Math.round(readTimeMinutes || 1))} min read`;
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}-01T12:00:00`));
}

export function formatResolvedBlogDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function getResolvedBlogPostPath(slug: string) {
  return `/blog/${slug}`;
}

export function getResolvedBlogPostUrl(post: ResolvedBlogPost) {
  if (post.externalUrl) {
    return post.externalUrl;
  }

  return `${BLOG_BASE_URL}${getResolvedBlogPostPath(post.slug)}`;
}

function sortResolvedBlogPostsByDate(posts: ResolvedBlogPost[]) {
  return [...posts].sort((a, b) => Number(new Date(`${b.date}T12:00:00`)) - Number(new Date(`${a.date}T12:00:00`)));
}

function buildResolvedSeries(
  series: BlogSeriesReference | null,
  seriesTitle?: string | null,
  seriesDescription?: string | null,
) {
  if (!series) {
    return null;
  }

  const fallbackSeries = blogSeries.find((item) => item.slug === series.slug);

  return {
    slug: series.slug,
    order: series.order,
    title: seriesTitle || fallbackSeries?.title || series.slug,
    description: seriesDescription || fallbackSeries?.description || "",
  } satisfies ResolvedBlogSeries;
}

function mapFallbackBlogPost(post: StaticBlogPost): ResolvedBlogPost {
  const fallbackSeries = post.series ? blogSeries.find((item) => item.slug === post.series?.slug) : null;

  return {
    id: post.slug,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    readTime: post.readTime,
    readTimeMinutes: Number.parseInt(post.readTime, 10) || 1,
    tags: post.tags,
    popularity: post.popularity,
    reactionSeeds: post.reactionSeeds,
    externalUrl: post.externalUrl,
    intro: post.intro,
    sections: post.sections,
    closing: post.closing,
    series: post.series
      ? {
          slug: post.series.slug,
          order: post.series.order,
          title: fallbackSeries?.title || post.series.slug,
          description: fallbackSeries?.description || "",
        }
      : null,
    status: "published",
    visibility: "public",
    source: "fallback",
  };
}

function mapBlogRecord(record: BlogPostRecord, documentId: string): ResolvedBlogPost {
  const resolvedDate =
    record.date ||
    getDateStringFromTimestamp(record.publishedAt) ||
    getDateStringFromTimestamp(record.scheduledAt) ||
    getDateStringFromTimestamp(record.createdAt) ||
    new Date().toISOString().slice(0, 10);

  return {
    id: documentId,
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    date: resolvedDate,
    readTime: formatReadTime(record.readTimeMinutes),
    readTimeMinutes: record.readTimeMinutes,
    tags: normalizeStringList(record.tags ?? []),
    popularity: record.popularity ?? 0,
    reactionSeeds: record.reactionSeeds ?? defaultReactionSeeds,
    externalUrl: record.externalUrl ?? undefined,
    intro: record.intro?.length ? record.intro : undefined,
    sections: record.sections?.length ? record.sections : undefined,
    closing: record.closing || undefined,
    series: buildResolvedSeries(record.series, record.seriesTitle, record.seriesDescription),
    status: record.status,
    visibility: record.visibility,
    source: "firestore",
  };
}

function mergeBySlug(firestorePosts: ResolvedBlogPost[]) {
  const merged = new Map<string, ResolvedBlogPost>();

  for (const post of fallbackBlogPosts.map(mapFallbackBlogPost)) {
    merged.set(post.slug, post);
  }

  for (const post of firestorePosts) {
    merged.set(post.slug, post);
  }

  return sortResolvedBlogPostsByDate([...merged.values()]);
}

export function getResolvedSeriesGroups(posts: ResolvedBlogPost[]) {
  const grouped = new Map<string, ResolvedBlogSeriesGroup>();

  for (const post of posts) {
    if (!post.series) {
      continue;
    }

    const existing = grouped.get(post.series.slug);

    if (!existing) {
      grouped.set(post.series.slug, {
        series: {
          slug: post.series.slug,
          title: post.series.title,
          description: post.series.description,
        },
        posts: [post],
      });
      continue;
    }

    existing.posts.push(post);
  }

  return [...grouped.values()].map((group) => ({
    ...group,
    posts: [...group.posts].sort((a, b) => (a.series?.order ?? 0) - (b.series?.order ?? 0)),
  }));
}

export function getResolvedPopularBlogPosts(posts: ResolvedBlogPost[], limit = 3) {
  return [...posts].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

export function getResolvedArchiveGroups(posts: ResolvedBlogPost[]) {
  const grouped = new Map<string, Map<string, ResolvedBlogPost[]>>();

  for (const post of sortResolvedBlogPostsByDate(posts)) {
    const date = new Date(`${post.date}T12:00:00`);
    const year = String(date.getFullYear());
    const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);

    if (!grouped.has(year)) {
      grouped.set(year, new Map<string, ResolvedBlogPost[]>());
    }

    const yearGroup = grouped.get(year);

    if (!yearGroup) {
      continue;
    }

    if (!yearGroup.has(`${monthKey}|${monthLabel}`)) {
      yearGroup.set(`${monthKey}|${monthLabel}`, []);
    }

    yearGroup.get(`${monthKey}|${monthLabel}`)?.push(post);
  }

  return [...grouped.entries()]
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
    .map(([year, months]): ResolvedBlogArchiveYearGroup => ({
      year,
      months: [...months.entries()].map(([compositeKey, monthPosts]) => {
        const [key, label] = compositeKey.split("|");

        return {
          key,
          label,
          posts: monthPosts,
        };
      }),
    }));
}

export function getResolvedRelatedBlogPosts(post: ResolvedBlogPost, posts: ResolvedBlogPost[], limit = 3) {
  return posts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => post.tags.includes(tag)).length;
      const sameSeries =
        post.series && candidate.series && post.series.slug === candidate.series.slug ? 3 : 0;
      const localityBoost = candidate.externalUrl ? 0 : 1;

      return {
        candidate,
        score: sharedTags * 2 + sameSeries + localityBoost,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.candidate.popularity - a.candidate.popularity;
    })
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

function buildBlogRecord(input: AdminBlogInput, authorId: string, existing?: BlogPostRecord | null): BlogPostRecord {
  const now = timestampNow();
  const normalizedSlug = slugify(input.slug || input.title, "post");
  const normalizedSections = input.sections.map((section) => ({
    heading: section.heading.trim(),
    paragraphs: normalizeStringList(section.paragraphs),
    ...(section.bullets?.length ? { bullets: normalizeStringList(section.bullets) } : {}),
    ...(section.codeBlocks?.length
      ? {
          codeBlocks: section.codeBlocks
            .map((block) => ({
              label: block.label.trim(),
              language: block.language.trim(),
              snippet: block.snippet,
            }))
            .filter((block) => block.label && block.language && block.snippet.trim()),
        }
      : {}),
  }));

  return {
    id: existing?.id ?? normalizedSlug,
    slug: normalizedSlug,
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    authorId,
    status: input.status,
    visibility: input.visibility,
    tags: normalizeStringList(input.tags),
    series: input.series,
    readTimeMinutes: Math.max(1, Math.round(input.readTimeMinutes || 1)),
    publishedAt:
      input.status === "published"
        ? timestampFromDate(input.date)
          ?? timestampFromDateTime(input.scheduledAt)
          ?? existing?.publishedAt
          ?? now
        : null,
    scheduledAt:
      input.status === "scheduled"
        ? timestampFromDateTime(input.scheduledAt) ?? timestampFromDate(input.date)
        : null,
    externalUrl: input.externalUrl?.trim() || null,
    contentBlocks: existing?.contentBlocks ?? [],
    date: input.date || null,
    popularity: Math.max(0, Math.round(input.popularity || 0)),
    reactionSeeds: {
      heart: Math.max(0, Math.round(input.reactionSeeds.heart || 0)),
      insightful: Math.max(0, Math.round(input.reactionSeeds.insightful || 0)),
      useful: Math.max(0, Math.round(input.reactionSeeds.useful || 0)),
    },
    intro: normalizeStringList(input.intro),
    sections: normalizedSections,
    closing: input.closing?.trim() || null,
    seriesTitle: input.seriesTitle?.trim() || null,
    seriesDescription: input.seriesDescription?.trim() || null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function mapStaticBlogToRecord(post: StaticBlogPost): BlogPostRecord {
  const fallbackSeries = post.series ? blogSeries.find((item) => item.slug === post.series?.slug) : null;
  const dateTimestamp = timestampFromDate(post.date) ?? timestampNow();

  return {
    id: post.slug,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    authorId: "system",
    status: "published",
    visibility: "public",
    tags: post.tags,
    series: post.series ?? null,
    readTimeMinutes: Number.parseInt(post.readTime, 10) || 1,
    publishedAt: dateTimestamp,
    scheduledAt: null,
    externalUrl: post.externalUrl ?? null,
    contentBlocks: [],
    date: post.date,
    popularity: post.popularity,
    reactionSeeds: post.reactionSeeds,
    intro: post.intro ?? [],
    sections: (post.sections ?? []) as BlogSectionRecord[],
    closing: post.closing ?? null,
    seriesTitle: fallbackSeries?.title ?? null,
    seriesDescription: fallbackSeries?.description ?? null,
    createdAt: dateTimestamp,
    updatedAt: dateTimestamp,
  };
}

export async function listPublicBlogPosts() {
  if (!isFirebaseConfigured) {
    return sortResolvedBlogPostsByDate(fallbackBlogPosts.map(mapFallbackBlogPost));
  }

  try {
    const snapshot = await getDocs(blogsCollection());
    const firestorePosts = snapshot.docs
      .map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      }))
      .filter((record) => record.visibility === "public" && isScheduledContentVisible(record.status, record.scheduledAt))
      .map((record) => mapBlogRecord(record, record.id ?? record.slug));

    return mergeBySlug(firestorePosts);
  } catch {
    return sortResolvedBlogPostsByDate(fallbackBlogPosts.map(mapFallbackBlogPost));
  }
}

export async function getPublicBlogPostBySlug(slug: string) {
  const posts = await listPublicBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function listAdminBlogRecords() {
  await assertCurrentUserCanAccessAdmin();

  if (!isFirebaseConfigured) {
    return [] as BlogPostRecord[];
  }

  const snapshot = await getDocs(blogsCollection());
  return snapshot.docs
    .map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    }))
    .sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function createAdminBlogPost(input: AdminBlogInput, authorId: string) {
  await assertCurrentUserCanAccessAdmin();
  const documentId = slugify(input.slug || input.title, "post");
  const existing = await getRecord(blogDocument(documentId));

  if (existing) {
    throw new Error("A blog post with that slug already exists.");
  }

  const record = buildBlogRecord(input, authorId);
  await setRecord(blogDocument(documentId), record);
  await logAdminActivity({
    actorId: authorId,
    action: "create",
    entityType: "blog",
    entityId: documentId,
    entityLabel: record.title,
    summary:
      record.status === "scheduled"
        ? `Created scheduled blog post "${record.title}".`
        : `Created blog post "${record.title}".`,
  });
  return {
    ...record,
    id: documentId,
  };
}

export async function updateAdminBlogPost(blogId: string, input: AdminBlogInput, authorId: string) {
  await assertCurrentUserCanAccessAdmin();
  const existing = await getRecord(blogDocument(blogId));

  if (!existing) {
    throw new Error("This blog post no longer exists.");
  }

  const record = buildBlogRecord(input, authorId, existing);

  await updateRecord(blogDocument(blogId), {
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    authorId: record.authorId,
    status: record.status,
    visibility: record.visibility,
    tags: record.tags,
    series: record.series,
    readTimeMinutes: record.readTimeMinutes,
    publishedAt: record.publishedAt,
    scheduledAt: record.scheduledAt,
    externalUrl: record.externalUrl,
    contentBlocks: record.contentBlocks,
    date: record.date,
    popularity: record.popularity,
    reactionSeeds: record.reactionSeeds,
    intro: record.intro,
    sections: record.sections,
    closing: record.closing,
    seriesTitle: record.seriesTitle,
    seriesDescription: record.seriesDescription,
    updatedAt: record.updatedAt,
  });
  await logAdminActivity({
    actorId: authorId,
    action: "update",
    entityType: "blog",
    entityId: blogId,
    entityLabel: record.title,
    summary:
      record.status === "scheduled"
        ? `Updated scheduled blog post "${record.title}".`
        : `Updated blog post "${record.title}".`,
  });

  return {
    ...record,
    id: blogId,
  };
}

export async function deleteAdminBlogPost(blogId: string) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const existing = await getRecord(blogDocument(blogId));
  await deleteRecord(blogDocument(blogId));
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "delete",
    entityType: "blog",
    entityId: blogId,
    entityLabel: existing?.title ?? blogId,
    summary: `Deleted blog post "${existing?.title ?? blogId}".`,
  });
}

function normalizeProjectType(value: StaticProjectType): ProjectType {
  return value.toLowerCase() as ProjectType;
}

function denormalizeProjectType(value: ProjectType): StaticProjectType {
  if (value === "academic") {
    return "Academic";
  }

  if (value === "community") {
    return "Personal";
  }

  return "Personal";
}

function normalizeProjectStatus(value: StaticProjectStatus): ProjectLifecycleStatus {
  if (value === "Completed") {
    return "completed";
  }

  if (value === "Planned") {
    return "planned";
  }

  return "in_progress";
}

function denormalizeProjectStatus(value: ProjectLifecycleStatus): StaticProjectStatus {
  if (value === "completed") {
    return "Completed";
  }

  if (value === "planned") {
    return "Planned";
  }

  return "In Progress";
}

function inferProjectCategory(techStack: string[]): StaticProjectCategory {
  const normalized = techStack.map((item) => item.toLowerCase());

  if (normalized.some((item) => item.includes("java"))) {
    return "Java";
  }

  if (normalized.some((item) => item.includes("react") || item.includes("typescript") || item.includes("vite"))) {
    return "React";
  }

  return "JavaScript";
}

function buildProjectDateLabel(startDate: string | null, endDate: string | null, status: ProjectLifecycleStatus) {
  if (!startDate && !endDate) {
    return "Date not set";
  }

  if (startDate && endDate && startDate === endDate) {
    return formatMonth(startDate);
  }

  if (startDate && (!endDate || status === "in_progress")) {
    return `${formatMonth(startDate)} - Ongoing`;
  }

  if (!startDate && endDate) {
    return formatMonth(endDate);
  }

  return `${formatMonth(startDate ?? endDate ?? "")} - ${formatMonth(endDate ?? startDate ?? "")}`;
}

function resolveSiteProjectLiveUrl(record: ProjectRecord, documentId: string) {
  if (record.liveUrl?.trim() === "/mediahub") {
    return "/mediahub";
  }

  const isMediaHubProject = documentId === "mediahub" || record.slug === "mediahub";
  const pointsToLocalMediaHub =
    typeof record.liveUrl === "string" &&
    /localhost\/itec4450\/mediahub\/index\.php/i.test(record.liveUrl);

  if (isMediaHubProject && (pointsToLocalMediaHub || !record.liveUrl)) {
    return "/mediahub";
  }

  return record.liveUrl ?? undefined;
}

function resolveSiteProjectRepoUrl(record: ProjectRecord, documentId: string) {
  const normalizedRepoUrl = record.repoUrl?.trim();
  const isMediaHubProject = documentId === "mediahub" || record.slug === "mediahub";

  if (normalizedRepoUrl) {
    return normalizedRepoUrl;
  }

  if (isMediaHubProject) {
    return "https://github.com/Laureesh/MediaHub";
  }

  return undefined;
}

function buildSortDate(startDate: string | null, fallbackTimestamp: Timestamp) {
  const raw = startDate || getDateStringFromTimestamp(fallbackTimestamp)?.slice(0, 7) || new Date().toISOString().slice(0, 7);
  const [year, month] = raw.split("-").map(Number);
  return year * 100 + month;
}

function buildDefaultProjectStackGroups(techStack: string[]) {
  const normalized = normalizeStringList(techStack);
  const interfaceItems = normalized.filter((item) =>
    ["react", "typescript", "javascript", "html", "css", "vite", "tailwind", "php"].some((keyword) =>
      item.toLowerCase().includes(keyword),
    ),
  );
  const dataItems = normalized.filter((item) =>
    ["firebase", "mysql", "sql", "api", "database", "auth", "tmdb"].some((keyword) =>
      item.toLowerCase().includes(keyword),
    ),
  );
  const opsItems = normalized.filter((item) => !interfaceItems.includes(item) && !dataItems.includes(item));

  return [
    { label: "Interface", items: interfaceItems.length ? interfaceItems : normalized.slice(0, 3) },
    { label: "Data and services", items: dataItems.length ? dataItems : normalized.slice(0, 3) },
    { label: "Operations", items: opsItems.length ? opsItems : normalized.slice(0, 3) },
  ].filter((group) => group.items.length);
}

function buildDefaultProjectGallery(title: string, description: string, assets: MediaAsset[]): ProjectGallerySlide[] {
  if (assets.length) {
    return assets.slice(0, 3).map((asset, index) => ({
      title: asset.caption || `${title} preview ${index + 1}`,
      caption: asset.caption || description,
      bullets: [description || "Project preview", asset.alt || "Linked asset", asset.url || asset.path],
      image: asset.url || asset.path,
      theme: (["violet", "cyan", "rose"] as const)[index % 3],
    }));
  }

  return [
    {
      title: `${title} overview`,
      caption: description || "Project overview.",
      bullets: ["Project summary", "Core experience", "Live iteration"],
      theme: "violet",
    },
  ];
}

function buildDefaultProjectArchitecture(title: string, techStack: string[]) {
  const stack = normalizeStringList(techStack);
  const interfaceNodes = stack.filter((item) =>
    ["react", "typescript", "javascript", "html", "css", "vite", "php"].some((keyword) =>
      item.toLowerCase().includes(keyword),
    ),
  );
  const dataNodes = stack.filter((item) =>
    ["firebase", "mysql", "sql", "api", "database", "auth", "tmdb"].some((keyword) =>
      item.toLowerCase().includes(keyword),
    ),
  );

  return {
    summary: `${title} is structured as a layered web build with a presentation layer, app logic, and data/services tier.`,
    lanes: [
      { label: "Presentation", nodes: interfaceNodes.length ? interfaceNodes : ["UI", "Routes", "Views"] },
      { label: "Logic", nodes: ["Feature flows", "State rules", "Actions"] },
      { label: "Data", nodes: dataNodes.length ? dataNodes : ["Content data", "External services", "Persistence"] },
    ],
  };
}

function mergeProjects(firestoreProjects: ProjectShowcaseItem[]) {
  const merged = new Map<string, ProjectShowcaseItem>();

  for (const project of fallbackProjectShowcase) {
    merged.set(project.id, project);
  }

  for (const project of firestoreProjects) {
    merged.set(project.id, project);
  }

  return [...merged.values()].sort((a, b) => b.sortDate - a.sortDate);
}

function mapProjectRecord(record: ProjectRecord, documentId: string): ProjectShowcaseItem {
  const category = (record.category as StaticProjectCategory | null) ?? inferProjectCategory(record.techStack);
  const gallery = record.gallery?.length
    ? record.gallery
    : buildDefaultProjectGallery(record.title, record.description, record.assets ?? []);
  const architecture = record.architecture ?? buildDefaultProjectArchitecture(record.title, record.techStack);
  const sourcePreview = record.sourcePreview ?? {
    title: `${record.title} source preview`,
    language: "text",
    snippet: record.description,
  };

  return {
    id: documentId,
    title: record.title,
    tagline: record.tagline || record.description,
    desc: record.description,
    status: denormalizeProjectStatus(record.status),
    featured: record.featured,
    liveUrl: resolveSiteProjectLiveUrl(record, documentId),
    repoUrl: resolveSiteProjectRepoUrl(record, documentId),
    category,
    type: denormalizeProjectType(record.type),
    date: buildProjectDateLabel(record.startDate, record.endDate, record.status),
    sortDate: buildSortDate(record.startDate, record.updatedAt),
    startMonth: record.startDate ?? getDateStringFromTimestamp(record.createdAt)?.slice(0, 7) ?? new Date().toISOString().slice(0, 7),
    endMonth: record.endDate ?? record.startDate ?? new Date().toISOString().slice(0, 7),
    estimatedTime: record.estimatedTime || "Ongoing build",
    complexity: Math.min(5, Math.max(1, Math.round(record.complexity ?? 3))),
    comparisonSummary: record.comparisonSummary || "This project is part of the site CMS and can be edited from the admin dashboard.",
    effortLabel: record.effortLabel ?? undefined,
    effortNote: record.effortNote ?? undefined,
    tags: normalizeStringList(record.tags?.length ? record.tags : record.techStack),
    stackGroups: record.stackGroups?.length ? record.stackGroups : buildDefaultProjectStackGroups(record.techStack),
    contributions: record.contributions ?? { frontend: 60, backend: 25, design: 15 },
    learned: record.learned?.length
      ? record.learned
      : [
          "Kept the public project page compatible with CMS-driven data.",
          "Focused on a clean project summary and reusable metadata.",
          "Left room for richer screenshots and architecture notes later.",
        ],
    sourcePreview,
    gallery,
    architecture,
    relatedIds: record.relatedIds ?? [],
  };
}

function buildProjectRecord(
  input: AdminSiteProjectInput,
  existing?: ProjectRecord | null,
): ProjectRecord {
  const now = timestampNow();

  return {
    id: existing?.id ?? slugify(input.slug || input.title, "project"),
    slug: slugify(input.slug || input.title, "project"),
    title: input.title.trim(),
    tagline: input.tagline.trim() || input.description.trim(),
    description: input.description.trim(),
    ownerId: null,
    scope: "site" as ProjectScope,
    type: normalizeProjectType(input.type),
    status: normalizeProjectStatus(input.status),
    visibility: input.visibility,
    featured: input.featured,
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    techStack: normalizeStringList(input.techStack),
    tags: normalizeStringList(input.tags.length ? input.tags : input.techStack),
    repoUrl: input.repoUrl?.trim() || null,
    liveUrl: input.liveUrl?.trim() || null,
    assets: input.assets.filter((asset) => (asset.url || asset.path || "").trim()),
    category: input.category,
    estimatedTime: input.estimatedTime?.trim() || null,
    complexity: Math.min(5, Math.max(1, Math.round(input.complexity || 3))),
    comparisonSummary: input.comparisonSummary.trim() || null,
    effortLabel: input.effortLabel?.trim() || null,
    effortNote: input.effortNote?.trim() || null,
    stackGroups: input.stackGroups.length ? input.stackGroups : buildDefaultProjectStackGroups(input.techStack),
    contributions: input.contributions,
    learned: normalizeStringList(input.learned),
    sourcePreview: input.sourcePreview,
    gallery: input.gallery.length
      ? input.gallery
      : buildDefaultProjectGallery(input.title, input.description, input.assets),
    architecture: input.architecture?.lanes.length
      ? input.architecture
      : buildDefaultProjectArchitecture(input.title, input.techStack),
    relatedIds: normalizeStringList(input.relatedIds),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function mapStaticProjectToRecord(project: ProjectShowcaseItem): ProjectRecord {
  const startDate = project.startMonth ?? null;
  const endDate =
    project.status === "In Progress" && project.date.toLowerCase().includes("ongoing")
      ? null
      : project.endMonth ?? null;
  const timestamp = timestampFromDate(startDate || endDate || `${String(Math.floor(project.sortDate / 100))}-${String(project.sortDate % 100).padStart(2, "0")}`) ?? timestampNow();

  return {
    id: project.id,
    slug: slugify(project.id, "project"),
    title: project.title,
    tagline: project.tagline,
    description: project.desc,
    ownerId: null,
    scope: "site",
    type: normalizeProjectType(project.type),
    status: normalizeProjectStatus(project.status),
    visibility: "public",
    featured: Boolean(project.featured),
    startDate,
    endDate,
    techStack: normalizeStringList(project.stackGroups.flatMap((group) => group.items)),
    tags: project.tags,
    repoUrl: project.repoUrl ?? null,
    liveUrl: project.liveUrl ?? null,
    assets: project.gallery
      .map((slide) => slide.image)
      .filter((image): image is string => Boolean(image))
      .map((image) => ({
        path: image,
        url: image,
        alt: null,
        caption: null,
      })),
    category: project.category,
    estimatedTime: project.estimatedTime,
    complexity: project.complexity,
    comparisonSummary: project.comparisonSummary,
    effortLabel: project.effortLabel ?? null,
    effortNote: project.effortNote ?? null,
    stackGroups: project.stackGroups,
    contributions: project.contributions,
    learned: project.learned,
    sourcePreview: project.sourcePreview,
    gallery: project.gallery,
    architecture: project.architecture,
    relatedIds: project.relatedIds,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function listPublicSiteProjects() {
  if (!isFirebaseConfigured) {
    return fallbackProjectShowcase;
  }

  try {
    const snapshot = await getDocs(query(projectsCollection(), where("scope", "==", "site")));
    const firestoreProjects = snapshot.docs
      .map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      }))
      .filter((record) => record.visibility === "public")
      .map((record) => mapProjectRecord(record, record.id ?? record.slug));

    return mergeProjects(firestoreProjects);
  } catch {
    return fallbackProjectShowcase;
  }
}

export async function listAdminSiteProjects() {
  await assertCurrentUserCanAccessAdmin();

  if (!isFirebaseConfigured) {
    return [] as ProjectRecord[];
  }

  const snapshot = await getDocs(query(projectsCollection(), where("scope", "==", "site")));
  return snapshot.docs
    .map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    }))
    .sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function createAdminSiteProject(input: AdminSiteProjectInput) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const documentId = slugify(input.slug || input.title, "project");
  const existing = await getRecord(projectDocument(documentId));

  if (existing) {
    throw new Error("A project with that slug already exists.");
  }

  const record = buildProjectRecord(input);
  await setRecord(projectDocument(documentId), record);
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "create",
    entityType: "project",
    entityId: documentId,
    entityLabel: record.title,
    summary: `Created project "${record.title}".`,
  });
  return {
    ...record,
    id: documentId,
  };
}

export async function updateAdminSiteProject(projectId: string, input: AdminSiteProjectInput) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const existing = await getRecord(projectDocument(projectId));

  if (!existing) {
    throw new Error("This project no longer exists.");
  }

  const record = buildProjectRecord(input, existing);
  await updateRecord(projectDocument(projectId), {
    slug: record.slug,
    title: record.title,
    tagline: record.tagline,
    description: record.description,
    ownerId: record.ownerId,
    scope: record.scope,
    type: record.type,
    status: record.status,
    visibility: record.visibility,
    featured: record.featured,
    startDate: record.startDate,
    endDate: record.endDate,
    techStack: record.techStack,
    tags: record.tags,
    repoUrl: record.repoUrl,
    liveUrl: record.liveUrl,
    assets: record.assets,
    category: record.category,
    estimatedTime: record.estimatedTime,
    complexity: record.complexity,
    comparisonSummary: record.comparisonSummary,
    effortLabel: record.effortLabel,
    effortNote: record.effortNote,
    stackGroups: record.stackGroups,
    contributions: record.contributions,
    learned: record.learned,
    sourcePreview: record.sourcePreview,
    gallery: record.gallery,
    architecture: record.architecture,
    relatedIds: record.relatedIds,
    updatedAt: record.updatedAt,
  });
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "update",
    entityType: "project",
    entityId: projectId,
    entityLabel: record.title,
    summary: `Updated project "${record.title}".`,
  });

  return {
    ...record,
    id: projectId,
  };
}

export async function deleteAdminSiteProject(projectId: string) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const existing = await getRecord(projectDocument(projectId));
  await deleteRecord(projectDocument(projectId));
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "delete",
    entityType: "project",
    entityId: projectId,
    entityLabel: existing?.title ?? projectId,
    summary: `Deleted project "${existing?.title ?? projectId}".`,
  });
}

function mapLinkRecord(record: LinkRecord, documentId: string): PublicSiteLink {
  return {
    id: documentId,
    label: record.label,
    url: record.url,
    category: record.category,
    description: record.description,
    icon: record.icon,
    order: record.order,
    isActive: record.isActive,
    source: "firestore",
  };
}

function mergeLinks(firestoreLinks: PublicSiteLink[]) {
  const merged = new Map<string, PublicSiteLink>();

  for (const link of defaultSiteLinks) {
    merged.set(link.id, link);
  }

  for (const link of firestoreLinks) {
    merged.set(link.id, link);
  }

  return [...merged.values()]
    .filter((link) => link.isActive)
    .sort((a, b) => a.order - b.order);
}

function buildLinkRecord(input: AdminLinkInput, existing?: LinkRecord | null): LinkRecord {
  const now = timestampNow();

  return {
    id: existing?.id ?? slugify(`${input.category}-${input.label}`, "link"),
    label: input.label.trim(),
    url: input.url.trim(),
    category: input.category.trim() || "social",
    description: input.description.trim(),
    icon: input.icon?.trim() || null,
    ownerId: null,
    isActive: input.isActive,
    order: Math.round(input.order || 0),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function listPublicSiteLinks(category?: string) {
  if (!isFirebaseConfigured) {
    return defaultSiteLinks.filter((link) => !category || link.category === category);
  }

  try {
    const snapshot = await getDocs(linksCollection());
    const firestoreLinks = snapshot.docs.map((documentSnapshot) =>
      mapLinkRecord(documentSnapshot.data(), documentSnapshot.id),
    );
    const merged = mergeLinks(firestoreLinks);
    return category ? merged.filter((link) => link.category === category) : merged;
  } catch {
    return defaultSiteLinks.filter((link) => !category || link.category === category);
  }
}

export async function listAdminLinks() {
  await assertCurrentUserCanAccessAdmin();

  if (!isFirebaseConfigured) {
    return [] as LinkRecord[];
  }

  const snapshot = await getDocs(linksCollection());
  return snapshot.docs
    .map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    }))
    .sort((a, b) => a.order - b.order);
}

export async function createAdminLink(input: AdminLinkInput) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const documentId = slugify(`${input.category}-${input.label}`, "link");
  const existing = await getRecord(linkDocument(documentId));

  if (existing) {
    throw new Error("A link with that category and label already exists.");
  }

  const record = buildLinkRecord(input);
  await setRecord(linkDocument(documentId), record);
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "create",
    entityType: "link",
    entityId: documentId,
    entityLabel: record.label,
    summary: `Created shared link "${record.label}".`,
  });
  return {
    ...record,
    id: documentId,
  };
}

export async function updateAdminLink(linkId: string, input: AdminLinkInput) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const existing = await getRecord(linkDocument(linkId));

  if (!existing) {
    throw new Error("This link no longer exists.");
  }

  const record = buildLinkRecord(input, existing);
  await updateRecord(linkDocument(linkId), {
    label: record.label,
    url: record.url,
    category: record.category,
    description: record.description,
    icon: record.icon,
    ownerId: record.ownerId,
    isActive: record.isActive,
    order: record.order,
    updatedAt: record.updatedAt,
  });
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "update",
    entityType: "link",
    entityId: linkId,
    entityLabel: record.label,
    summary: `Updated shared link "${record.label}".`,
  });

  return {
    ...record,
    id: linkId,
  };
}

export async function deleteAdminLink(linkId: string) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const existing = await getRecord(linkDocument(linkId));
  await deleteRecord(linkDocument(linkId));
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "delete",
    entityType: "link",
    entityId: linkId,
    entityLabel: existing?.label ?? linkId,
    summary: `Deleted shared link "${existing?.label ?? linkId}".`,
  });
}

export async function seedFallbackBlogs() {
  await assertCurrentUserCanAccessAdmin();
  let imported = 0;

  for (const post of fallbackBlogPosts) {
    const existing = await getRecord(blogDocument(post.slug));

    if (existing) {
      continue;
    }

    await setRecord(blogDocument(post.slug), mapStaticBlogToRecord(post));
    imported += 1;
  }

  return imported;
}

export async function seedFallbackSiteProjects() {
  await assertCurrentUserCanAccessAdmin();
  let imported = 0;

  for (const project of fallbackProjectShowcase) {
    const existing = await getRecord(projectDocument(project.id));

    if (existing) {
      continue;
    }

    await setRecord(projectDocument(project.id), mapStaticProjectToRecord(project));
    imported += 1;
  }

  return imported;
}

export async function seedFallbackLinks() {
  await assertCurrentUserCanAccessAdmin();
  let imported = 0;

  for (const link of defaultSiteLinks) {
    const existing = await getRecord(linkDocument(link.id));

    if (existing) {
      continue;
    }

    await setRecord(linkDocument(link.id), {
      label: link.label,
      url: link.url,
      category: link.category,
      description: link.description,
      icon: link.icon,
      ownerId: null,
      isActive: link.isActive,
      order: link.order,
      createdAt: timestampNow(),
      updatedAt: timestampNow(),
    });
    imported += 1;
  }

  return imported;
}

export async function seedFallbackCmsContent() {
  await assertCurrentUserCanAccessAdmin();
  const [blogs, projects, links] = await Promise.all([
    seedFallbackBlogs(),
    seedFallbackSiteProjects(),
    seedFallbackLinks(),
  ]);

  return { blogs, projects, links };
}
