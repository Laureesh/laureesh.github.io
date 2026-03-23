import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ExternalLink,
  FileText,
  FolderKanban,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button, Checkbox, Input, Select, Textarea } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  createAdminBlogPost,
  createAdminLink,
  createAdminSiteProject,
  deleteAdminBlogPost,
  deleteAdminLink,
  deleteAdminSiteProject,
  listAdminBlogRecords,
  listAdminLinks,
  listAdminSiteProjects,
  seedFallbackCmsContent,
  updateAdminBlogPost,
  updateAdminLink,
  updateAdminSiteProject,
  type AdminBlogInput,
  type AdminLinkInput,
  type AdminSiteProjectInput,
} from "../../services/cmsContent";
import type { BlogPostRecord, LinkRecord, MediaAsset, ProjectRecord } from "../../types/models";

type ContentSection = "blogs" | "projects" | "links";
type StatusTone = "error" | "success" | null;

interface BlogEditorState {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  scheduledAt: string;
  readTimeMinutes: string;
  popularity: string;
  tagsText: string;
  status: "draft" | "scheduled" | "published" | "archived";
  visibility: "public" | "private";
  externalUrl: string;
  introText: string;
  sectionsJson: string;
  closing: string;
  seriesSlug: string;
  seriesOrder: string;
  seriesTitle: string;
  seriesDescription: string;
  reactionHeart: string;
  reactionInsightful: string;
  reactionUseful: string;
}

interface ProjectEditorState {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: "React" | "Java" | "JavaScript";
  type: "Personal" | "Academic";
  status: "Completed" | "In Progress" | "Planned";
  visibility: "public" | "private";
  featured: boolean;
  startDate: string;
  endDate: string;
  estimatedTime: string;
  complexity: string;
  comparisonSummary: string;
  effortLabel: string;
  effortNote: string;
  tagsText: string;
  techStackText: string;
  repoUrl: string;
  liveUrl: string;
  assetUrlsText: string;
  learnedText: string;
  sourcePreviewTitle: string;
  sourcePreviewLanguage: string;
  sourcePreviewSnippet: string;
  stackGroupsJson: string;
  galleryJson: string;
  architectureSummary: string;
  architectureLanesJson: string;
  relatedIdsText: string;
  contributionFrontend: string;
  contributionBackend: string;
  contributionDesign: string;
}

interface LinkEditorState {
  label: string;
  url: string;
  category: string;
  description: string;
  icon: string;
  isActive: boolean;
  order: string;
}

const CONTENT_SECTION_OPTIONS: Array<{ value: ContentSection; label: string }> = [
  { value: "blogs", label: "Blogs" },
  { value: "projects", label: "Projects" },
  { value: "links", label: "Links" },
];

const BLOG_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

const PROJECT_CATEGORY_OPTIONS = [
  { value: "React", label: "React" },
  { value: "Java", label: "Java" },
  { value: "JavaScript", label: "JavaScript" },
];

const PROJECT_TYPE_OPTIONS = [
  { value: "Personal", label: "Personal" },
  { value: "Academic", label: "Academic" },
];

const PROJECT_STATUS_OPTIONS = [
  { value: "Completed", label: "Completed" },
  { value: "In Progress", label: "In Progress" },
  { value: "Planned", label: "Planned" },
];

const LINK_ICON_OPTIONS = [
  { value: "", label: "No icon" },
  { value: "github", label: "GitHub" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "mail", label: "Mail" },
  { value: "globe", label: "Globe" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X" },
  { value: "link", label: "Generic link" },
];

function getContentAdminErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    if (error.code === "permission-denied" || error.code === "firestore/permission-denied") {
      return "Firestore blocked this CMS action. Publish the latest Firestore rules, then confirm your users/{uid} document has role set to admin and status set to active.";
    }
  }

  if (
    error instanceof Error &&
    /missing or insufficient permissions/i.test(error.message)
  ) {
    return "Firestore blocked this CMS action. Publish the latest Firestore rules, then confirm your users/{uid} document has role set to admin and status set to active.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLineList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonInput<T>(value: string, fallback: T, errorMessage: string) {
  if (!value.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(errorMessage);
  }
}

function formatTimestampForDateTimeInput(value: { toDate?: () => Date } | null | undefined) {
  if (!value || typeof value.toDate !== "function") {
    return "";
  }

  const date = value.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function createEmptyBlogDraft(): BlogEditorState {
  return {
    slug: "",
    title: "",
    excerpt: "",
    date: new Date().toISOString().slice(0, 10),
    scheduledAt: "",
    readTimeMinutes: "5",
    popularity: "50",
    tagsText: "",
    status: "draft",
    visibility: "public",
    externalUrl: "",
    introText: "",
    sectionsJson: "[]",
    closing: "",
    seriesSlug: "",
    seriesOrder: "1",
    seriesTitle: "",
    seriesDescription: "",
    reactionHeart: "8",
    reactionInsightful: "5",
    reactionUseful: "12",
  };
}

function createEmptyProjectDraft(): ProjectEditorState {
  return {
    slug: "",
    title: "",
    tagline: "",
    description: "",
    category: "JavaScript",
    type: "Personal",
    status: "In Progress",
    visibility: "public",
    featured: false,
    startDate: "",
    endDate: "",
    estimatedTime: "",
    complexity: "3",
    comparisonSummary: "",
    effortLabel: "",
    effortNote: "",
    tagsText: "",
    techStackText: "",
    repoUrl: "",
    liveUrl: "",
    assetUrlsText: "",
    learnedText: "",
    sourcePreviewTitle: "",
    sourcePreviewLanguage: "ts",
    sourcePreviewSnippet: "",
    stackGroupsJson: "[]",
    galleryJson: "[]",
    architectureSummary: "",
    architectureLanesJson: "[]",
    relatedIdsText: "",
    contributionFrontend: "60",
    contributionBackend: "25",
    contributionDesign: "15",
  };
}

function createEmptyLinkDraft(): LinkEditorState {
  return {
    label: "",
    url: "",
    category: "social",
    description: "",
    icon: "",
    isActive: true,
    order: "10",
  };
}

function blogRecordToDraft(record: BlogPostRecord): BlogEditorState {
  return {
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    date: record.date ?? "",
    scheduledAt: formatTimestampForDateTimeInput(record.scheduledAt),
    readTimeMinutes: String(record.readTimeMinutes ?? 5),
    popularity: String(record.popularity ?? 0),
    tagsText: (record.tags ?? []).join(", "),
    status: record.status,
    visibility: record.visibility,
    externalUrl: record.externalUrl ?? "",
    introText: (record.intro ?? []).join("\n"),
    sectionsJson: JSON.stringify(record.sections ?? [], null, 2),
    closing: record.closing ?? "",
    seriesSlug: record.series?.slug ?? "",
    seriesOrder: String(record.series?.order ?? 1),
    seriesTitle: record.seriesTitle ?? "",
    seriesDescription: record.seriesDescription ?? "",
    reactionHeart: String(record.reactionSeeds?.heart ?? 8),
    reactionInsightful: String(record.reactionSeeds?.insightful ?? 5),
    reactionUseful: String(record.reactionSeeds?.useful ?? 12),
  };
}

function projectRecordToDraft(record: ProjectRecord): ProjectEditorState {
  return {
    slug: record.slug,
    title: record.title,
    tagline: record.tagline,
    description: record.description,
    category: (record.category as ProjectEditorState["category"]) ?? "JavaScript",
    type: record.type === "academic" ? "Academic" : "Personal",
    status:
      record.status === "completed"
        ? "Completed"
        : record.status === "planned"
          ? "Planned"
          : "In Progress",
    visibility: record.visibility,
    featured: record.featured,
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
    estimatedTime: record.estimatedTime ?? "",
    complexity: String(record.complexity ?? 3),
    comparisonSummary: record.comparisonSummary ?? "",
    effortLabel: record.effortLabel ?? "",
    effortNote: record.effortNote ?? "",
    tagsText: (record.tags ?? []).join(", "),
    techStackText: (record.techStack ?? []).join(", "),
    repoUrl: record.repoUrl ?? "",
    liveUrl: record.liveUrl ?? "",
    assetUrlsText: (record.assets ?? []).map((asset) => asset.url || asset.path).filter(Boolean).join("\n"),
    learnedText: (record.learned ?? []).join("\n"),
    sourcePreviewTitle: record.sourcePreview?.title ?? "",
    sourcePreviewLanguage: record.sourcePreview?.language ?? "ts",
    sourcePreviewSnippet: record.sourcePreview?.snippet ?? "",
    stackGroupsJson: JSON.stringify(record.stackGroups ?? [], null, 2),
    galleryJson: JSON.stringify(record.gallery ?? [], null, 2),
    architectureSummary: record.architecture?.summary ?? "",
    architectureLanesJson: JSON.stringify(record.architecture?.lanes ?? [], null, 2),
    relatedIdsText: (record.relatedIds ?? []).join(", "),
    contributionFrontend: String(record.contributions?.frontend ?? 60),
    contributionBackend: String(record.contributions?.backend ?? 25),
    contributionDesign: String(record.contributions?.design ?? 15),
  };
}

function linkRecordToDraft(record: LinkRecord): LinkEditorState {
  return {
    label: record.label,
    url: record.url,
    category: record.category,
    description: record.description,
    icon: record.icon ?? "",
    isActive: record.isActive,
    order: String(record.order ?? 0),
  };
}

function blogDraftToInput(draft: BlogEditorState): AdminBlogInput {
  return {
    slug: draft.slug,
    title: draft.title,
    excerpt: draft.excerpt,
    date: draft.date,
    scheduledAt: draft.scheduledAt || null,
    readTimeMinutes: Number.parseInt(draft.readTimeMinutes, 10) || 5,
    tags: parseCommaList(draft.tagsText),
    status: draft.status,
    visibility: draft.visibility,
    externalUrl: draft.externalUrl.trim() || null,
    popularity: Number.parseInt(draft.popularity, 10) || 0,
    reactionSeeds: {
      heart: Number.parseInt(draft.reactionHeart, 10) || 0,
      insightful: Number.parseInt(draft.reactionInsightful, 10) || 0,
      useful: Number.parseInt(draft.reactionUseful, 10) || 0,
    },
    intro: parseLineList(draft.introText),
    sections: parseJsonInput(draft.sectionsJson, [], "Sections JSON is invalid."),
    closing: draft.closing.trim() || null,
    series: draft.seriesSlug.trim()
      ? {
          slug: draft.seriesSlug.trim(),
          order: Number.parseInt(draft.seriesOrder, 10) || 1,
        }
      : null,
    seriesTitle: draft.seriesTitle.trim() || null,
    seriesDescription: draft.seriesDescription.trim() || null,
  };
}

function projectDraftToInput(draft: ProjectEditorState): AdminSiteProjectInput {
  const assetUrls = parseLineList(draft.assetUrlsText);
  const assets: MediaAsset[] = assetUrls.map((url) => ({
    path: url,
    url,
    alt: null,
    caption: null,
  }));

  return {
    slug: draft.slug,
    title: draft.title,
    tagline: draft.tagline,
    description: draft.description,
    category: draft.category,
    type: draft.type,
    status: draft.status,
    visibility: draft.visibility,
    featured: draft.featured,
    startDate: draft.startDate || null,
    endDate: draft.endDate || null,
    estimatedTime: draft.estimatedTime || null,
    complexity: Number.parseInt(draft.complexity, 10) || 3,
    comparisonSummary: draft.comparisonSummary,
    effortLabel: draft.effortLabel || null,
    effortNote: draft.effortNote || null,
    tags: parseCommaList(draft.tagsText),
    techStack: parseCommaList(draft.techStackText),
    repoUrl: draft.repoUrl.trim() || null,
    liveUrl: draft.liveUrl.trim() || null,
    assets,
    stackGroups: parseJsonInput(draft.stackGroupsJson, [], "Stack groups JSON is invalid."),
    contributions: {
      frontend: Number.parseInt(draft.contributionFrontend, 10) || 0,
      backend: Number.parseInt(draft.contributionBackend, 10) || 0,
      design: Number.parseInt(draft.contributionDesign, 10) || 0,
    },
    learned: parseLineList(draft.learnedText),
    sourcePreview: {
      title: draft.sourcePreviewTitle,
      language: draft.sourcePreviewLanguage,
      snippet: draft.sourcePreviewSnippet,
    },
    gallery: parseJsonInput(draft.galleryJson, [], "Gallery JSON is invalid."),
    architecture: {
      summary: draft.architectureSummary,
      lanes: parseJsonInput(draft.architectureLanesJson, [], "Architecture lanes JSON is invalid."),
    },
    relatedIds: parseCommaList(draft.relatedIdsText),
  };
}

function linkDraftToInput(draft: LinkEditorState): AdminLinkInput {
  return {
    label: draft.label,
    url: draft.url,
    category: draft.category,
    description: draft.description,
    icon: draft.icon || null,
    isActive: draft.isActive,
    order: Number.parseInt(draft.order, 10) || 0,
  };
}

export default function AdminContentPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const requestedMode = searchParams.get("mode");
  const requestedItem = searchParams.get("item");
  const [activeSection, setActiveSection] = useState<ContentSection>(
    requestedSection === "projects" || requestedSection === "links" ? requestedSection : "blogs",
  );
  const [blogs, setBlogs] = useState<BlogPostRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [blogDraft, setBlogDraft] = useState<BlogEditorState>(createEmptyBlogDraft());
  const [projectDraft, setProjectDraft] = useState<ProjectEditorState>(createEmptyProjectDraft());
  const [linkDraft, setLinkDraft] = useState<LinkEditorState>(createEmptyLinkDraft());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [contentQuery, setContentQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>(null);

  const selectedBlog = blogs.find((item) => item.id === selectedBlogId) ?? null;
  const selectedProject = projects.find((item) => item.id === selectedProjectId) ?? null;
  const selectedLink = links.find((item) => item.id === selectedLinkId) ?? null;
  const isCreating =
    (activeSection === "blogs" && !selectedBlogId) ||
    (activeSection === "projects" && !selectedProjectId) ||
    (activeSection === "links" && !selectedLinkId);

  const loadContent = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setStatusMessage(null);
    setStatusTone(null);

    try {
      const [nextBlogs, nextProjects, nextLinks] = await Promise.all([
        listAdminBlogRecords(),
        listAdminSiteProjects(),
        listAdminLinks(),
      ]);

      setBlogs(nextBlogs);
      setProjects(nextProjects);
      setLinks(nextLinks);
    } catch (error) {
      setStatusMessage(getContentAdminErrorMessage(error, "Unable to load CMS content right now."));
      setStatusTone("error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadContent();
  }, []);

  useEffect(() => {
    if (requestedSection === "projects" || requestedSection === "links" || requestedSection === "blogs") {
      setActiveSection(requestedSection);
    }
  }, [requestedSection]);

  useEffect(() => {
    if (!requestedItem || requestedMode === "create") {
      return;
    }

    if (requestedSection === "projects" && projects.some((item) => item.id === requestedItem)) {
      setSelectedProjectId(requestedItem);
      return;
    }

    if (requestedSection === "links" && links.some((item) => item.id === requestedItem)) {
      setSelectedLinkId(requestedItem);
      return;
    }

    if (blogs.some((item) => item.id === requestedItem)) {
      setSelectedBlogId(requestedItem);
    }
  }, [blogs, links, projects, requestedItem, requestedMode, requestedSection]);

  useEffect(() => {
    if (requestedMode !== "create") {
      return;
    }

    if (activeSection === "blogs") {
      setSelectedBlogId(null);
      setBlogDraft(createEmptyBlogDraft());
    } else if (activeSection === "projects") {
      setSelectedProjectId(null);
      setProjectDraft(createEmptyProjectDraft());
    } else {
      setSelectedLinkId(null);
      setLinkDraft(createEmptyLinkDraft());
    }
  }, [activeSection, requestedMode]);

  useEffect(() => {
    if (!selectedBlog) {
      return;
    }

    setBlogDraft(blogRecordToDraft(selectedBlog));
  }, [selectedBlog]);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    setProjectDraft(projectRecordToDraft(selectedProject));
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedLink) {
      return;
    }

    setLinkDraft(linkRecordToDraft(selectedLink));
  }, [selectedLink]);

  useEffect(() => {
    if (requestedMode === "create") {
      return;
    }

    if (activeSection === "blogs" && blogs.length && !selectedBlogId) {
      setSelectedBlogId(blogs[0].id ?? null);
    }

    if (activeSection === "projects" && projects.length && !selectedProjectId) {
      setSelectedProjectId(projects[0].id ?? null);
    }

    if (activeSection === "links" && links.length && !selectedLinkId) {
      setSelectedLinkId(links[0].id ?? null);
    }
  }, [
    activeSection,
    blogs,
    links,
    projects,
    requestedMode,
    selectedBlogId,
    selectedLinkId,
    selectedProjectId,
  ]);

  const sectionCounts = useMemo(
    () => ({
      blogs: blogs.length,
      projects: projects.length,
      links: links.length,
    }),
    [blogs.length, links.length, projects.length],
  );

  const filteredBlogs = useMemo(() => {
    const normalizedQuery = contentQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return blogs;
    }

    return blogs.filter((item) =>
      `${item.title} ${item.slug} ${item.status} ${item.visibility}`.toLowerCase().includes(normalizedQuery),
    );
  }, [blogs, contentQuery]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = contentQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return projects;
    }

    return projects.filter((item) =>
      `${item.title} ${item.slug} ${item.status} ${item.visibility}`.toLowerCase().includes(normalizedQuery),
    );
  }, [contentQuery, projects]);

  const filteredLinks = useMemo(() => {
    const normalizedQuery = contentQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return links;
    }

    return links.filter((item) =>
      `${item.label} ${item.url} ${item.category} ${item.isActive ? "active" : "inactive"}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [contentQuery, links]);

  const openCreateMode = (section: ContentSection) => {
    setActiveSection(section);
    setSearchParams({ section, mode: "create" });

    if (section === "blogs") {
      setSelectedBlogId(null);
      setBlogDraft(createEmptyBlogDraft());
    } else if (section === "projects") {
      setSelectedProjectId(null);
      setProjectDraft(createEmptyProjectDraft());
    } else {
      setSelectedLinkId(null);
      setLinkDraft(createEmptyLinkDraft());
    }
  };

  const selectExisting = (section: ContentSection, id: string) => {
    setActiveSection(section);
    setSearchParams({ section, item: id });

    if (section === "blogs") {
      setSelectedBlogId(id);
    } else if (section === "projects") {
      setSelectedProjectId(id);
    } else {
      setSelectedLinkId(id);
    }
  };

  const handleImportFallbackContent = async () => {
    setImporting(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const results = await seedFallbackCmsContent();
      await loadContent(true);
      setStatusMessage(
        `Imported ${results.blogs} blog posts, ${results.projects} site projects, and ${results.links} links from the current local site data.`,
      );
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(
        getContentAdminErrorMessage(error, "Unable to import the current site content."),
      );
      setStatusTone("error");
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      if (activeSection === "blogs") {
        const input = blogDraftToInput(blogDraft);

        if (selectedBlogId) {
          const updated = await updateAdminBlogPost(selectedBlogId, input, user.uid);
          setBlogs((current) => current.map((item) => (item.id === selectedBlogId ? updated : item)));
          setBlogDraft(blogRecordToDraft(updated));
          setSearchParams({ section: "blogs", item: selectedBlogId });
        } else {
          const created = await createAdminBlogPost(input, user.uid);
          setBlogs((current) => [created, ...current]);
          setSelectedBlogId(created.id ?? null);
          setSearchParams(created.id ? { section: "blogs", item: created.id } : { section: "blogs" });
        }
      } else if (activeSection === "projects") {
        const input = projectDraftToInput(projectDraft);

        if (selectedProjectId) {
          const updated = await updateAdminSiteProject(selectedProjectId, input);
          setProjects((current) => current.map((item) => (item.id === selectedProjectId ? updated : item)));
          setProjectDraft(projectRecordToDraft(updated));
          setSearchParams({ section: "projects", item: selectedProjectId });
        } else {
          const created = await createAdminSiteProject(input);
          setProjects((current) => [created, ...current]);
          setSelectedProjectId(created.id ?? null);
          setSearchParams(created.id ? { section: "projects", item: created.id } : { section: "projects" });
        }
      } else {
        const input = linkDraftToInput(linkDraft);

        if (selectedLinkId) {
          const updated = await updateAdminLink(selectedLinkId, input);
          setLinks((current) => current.map((item) => (item.id === selectedLinkId ? updated : item)));
          setLinkDraft(linkRecordToDraft(updated));
          setSearchParams({ section: "links", item: selectedLinkId });
        } else {
          const created = await createAdminLink(input);
          setLinks((current) => [...current, created].sort((left, right) => left.order - right.order));
          setSelectedLinkId(created.id ?? null);
          setSearchParams(created.id ? { section: "links", item: created.id } : { section: "links" });
        }
      }

      setStatusMessage(
        activeSection === "blogs" && blogDraft.status === "scheduled"
          ? "Blog post scheduled. It will appear in public reads after its release time."
          : `${activeSection === "blogs" ? "Blog post" : activeSection === "projects" ? "Project" : "Link"} saved.`,
      );
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(getContentAdminErrorMessage(error, "Unable to save this content item."));
      setStatusTone("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const idToDelete =
      activeSection === "blogs"
        ? selectedBlogId
        : activeSection === "projects"
          ? selectedProjectId
          : selectedLinkId;

    if (!idToDelete) {
      return;
    }

    const confirmed = window.confirm("Delete this content item permanently from Firestore?");

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      if (activeSection === "blogs") {
        await deleteAdminBlogPost(idToDelete);
        setBlogs((current) => current.filter((item) => item.id !== idToDelete));
        setSelectedBlogId(null);
        setBlogDraft(createEmptyBlogDraft());
      } else if (activeSection === "projects") {
        await deleteAdminSiteProject(idToDelete);
        setProjects((current) => current.filter((item) => item.id !== idToDelete));
        setSelectedProjectId(null);
        setProjectDraft(createEmptyProjectDraft());
      } else {
        await deleteAdminLink(idToDelete);
        setLinks((current) => current.filter((item) => item.id !== idToDelete));
        setSelectedLinkId(null);
        setLinkDraft(createEmptyLinkDraft());
      }

      setSearchParams({ section: activeSection, mode: "create" });
      setStatusMessage("Content item deleted.");
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(getContentAdminErrorMessage(error, "Unable to delete this content item."));
      setStatusTone("error");
    } finally {
      setDeleting(false);
    }
  };

  const activeItems =
    activeSection === "blogs"
      ? filteredBlogs
      : activeSection === "projects"
        ? filteredProjects
        : filteredLinks;

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <div className="admin-panel__header">
          <p className="admin-panel__eyebrow">CMS Module</p>
          <div className="admin-panel__title-row">
            <FileText size={18} />
            <h2>Blogs, projects, and links</h2>
          </div>
          <p>
            This is the live Firestore-backed content workspace. Public pages can safely read from it with a local fallback, and admins can seed the current site data here before editing it.
          </p>
        </div>

        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Blog posts</span>
            <strong>{sectionCounts.blogs}</strong>
            <span>CMS blog records currently available</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Site projects</span>
            <strong>{sectionCounts.projects}</strong>
            <span>Public projects stored in the shared projects collection</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Links</span>
            <strong>{sectionCounts.links}</strong>
            <span>Reusable site links for shell and footer surfaces</span>
          </div>
        </div>

        <div className="admin-content-actions">
          <Button
            variant="secondary"
            icon={<RefreshCcw size={15} />}
            onClick={() => void loadContent(true)}
            loading={refreshing}
          >
            Refresh content
          </Button>
          <Button
            icon={<UploadCloud size={15} />}
            onClick={() => void handleImportFallbackContent()}
            loading={importing}
          >
            Import current site content
          </Button>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h2>Content sections</h2>
          <p>Pick the collection you want to manage, then create a new item or edit an existing one.</p>
        </div>

        <div className="admin-content-tabs">
          {CONTENT_SECTION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`admin-content-tab ${activeSection === option.value ? "is-active" : ""}`}
              onClick={() => {
                setActiveSection(option.value);
                setSearchParams({ section: option.value });
              }}
            >
              <span>{option.label}</span>
              <strong>{sectionCounts[option.value]}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="admin-users__workspace admin-content__workspace">
        <div className="admin-panel">
          <div className="admin-panel__header">
            <h2>{activeSection === "blogs" ? "Blog posts" : activeSection === "projects" ? "Site projects" : "Links"}</h2>
            <p>
              {loading
                ? "Loading content..."
                : contentQuery
                  ? `${activeItems.length} matching item${activeItems.length === 1 ? "" : "s"}.`
                  : `${activeItems.length} item${activeItems.length === 1 ? "" : "s"} loaded.`}
            </p>
          </div>

        <div className="admin-content-list-actions">
          <Button
            icon={<Plus size={15} />}
            onClick={() => openCreateMode(activeSection)}
          >
            {activeSection === "blogs" ? "New post" : activeSection === "projects" ? "New project" : "New link"}
          </Button>
          <Input
            label="Search"
            aria-label="Search current content section"
            value={contentQuery}
            onChange={(event) => setContentQuery(event.target.value)}
            placeholder="Search title, slug, URL, or status..."
          />
        </div>

        <div className="admin-content-list">
            {loading ? (
              <div className="admin-empty-state" aria-live="polite">
                <strong>Loading content</strong>
                <span>The dashboard is reading the current Firestore content records.</span>
              </div>
            ) : activeItems.length === 0 ? (
              <div className="admin-empty-state" aria-live="polite">
                <strong>{contentQuery ? "No matching content items" : "No content items yet"}</strong>
                <span>
                  {contentQuery
                    ? "Try a different search query or clear the filter."
                    : "Create the first item in this section or import the current site content."}
                </span>
              </div>
            ) : activeSection === "blogs"
              ? filteredBlogs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-content-item ${selectedBlogId === item.id ? "is-selected" : ""}`}
                    aria-pressed={selectedBlogId === item.id}
                    onClick={() => item.id && selectExisting("blogs", item.id)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.slug}</span>
                    <small>{item.status} / {item.visibility}</small>
                  </button>
                ))
              : activeSection === "projects"
                ? filteredProjects.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-content-item ${selectedProjectId === item.id ? "is-selected" : ""}`}
                      aria-pressed={selectedProjectId === item.id}
                      onClick={() => item.id && selectExisting("projects", item.id)}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.slug}</span>
                      <small>{item.status} / {item.visibility}</small>
                    </button>
                  ))
                : filteredLinks.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-content-item ${selectedLinkId === item.id ? "is-selected" : ""}`}
                      aria-pressed={selectedLinkId === item.id}
                      onClick={() => item.id && selectExisting("links", item.id)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.url}</span>
                      <small>{item.category} / {item.isActive ? "active" : "inactive"}</small>
                    </button>
                  ))}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel__header">
            <h2>{isCreating ? "Create content" : "Edit content"}</h2>
            <p>
              {activeSection === "blogs"
                ? "Manage Firestore blog records. The public blog pages merge these with the current local fallback."
                : activeSection === "projects"
                  ? "Manage site-scope projects that feed the public Projects page."
                  : "Manage reusable site links that power shared public surfaces like the hero and footer."}
            </p>
          </div>

          {activeSection === "blogs" ? (
            <div className="admin-content-form">
              <div className="admin-content-form-grid">
                <Input label="Title" value={blogDraft.title} onChange={(event) => setBlogDraft((current) => ({ ...current, title: event.target.value }))} />
                <Input label="Slug" value={blogDraft.slug} onChange={(event) => setBlogDraft((current) => ({ ...current, slug: event.target.value }))} hint="Used for /blog/slug routes and Firestore document IDs." />
              </div>
              <Textarea label="Excerpt" value={blogDraft.excerpt} onChange={(event) => setBlogDraft((current) => ({ ...current, excerpt: event.target.value }))} rows={3} />
              <div className="admin-content-form-grid admin-content-form-grid--three">
                <Input label="Date" type="date" value={blogDraft.date} onChange={(event) => setBlogDraft((current) => ({ ...current, date: event.target.value }))} />
                <Input label="Read Time (minutes)" type="number" min="1" value={blogDraft.readTimeMinutes} onChange={(event) => setBlogDraft((current) => ({ ...current, readTimeMinutes: event.target.value }))} />
                <Input label="Popularity" type="number" min="0" value={blogDraft.popularity} onChange={(event) => setBlogDraft((current) => ({ ...current, popularity: event.target.value }))} />
              </div>
              <div className="admin-content-form-grid admin-content-form-grid--three">
                <Select label="Status" value={blogDraft.status} onChange={(event) => setBlogDraft((current) => ({ ...current, status: event.target.value as BlogEditorState["status"] }))} options={BLOG_STATUS_OPTIONS} />
                <Select label="Visibility" value={blogDraft.visibility} onChange={(event) => setBlogDraft((current) => ({ ...current, visibility: event.target.value as BlogEditorState["visibility"] }))} options={VISIBILITY_OPTIONS} />
                <Input label="External URL" value={blogDraft.externalUrl} onChange={(event) => setBlogDraft((current) => ({ ...current, externalUrl: event.target.value }))} placeholder="https://example.com/post" />
              </div>
              {blogDraft.status === "scheduled" ? (
                <Input
                  label="Scheduled Publish Time"
                  type="datetime-local"
                  value={blogDraft.scheduledAt}
                  onChange={(event) => setBlogDraft((current) => ({ ...current, scheduledAt: event.target.value }))}
                  hint="Once this time passes, public blog reads will include the post automatically."
                />
              ) : null}
              <Input label="Tags" value={blogDraft.tagsText} onChange={(event) => setBlogDraft((current) => ({ ...current, tagsText: event.target.value }))} placeholder="React, TypeScript, Firebase" hint="Comma-separated." />
              <div className="admin-content-form-grid admin-content-form-grid--three">
                <Input label="Series Slug" value={blogDraft.seriesSlug} onChange={(event) => setBlogDraft((current) => ({ ...current, seriesSlug: event.target.value }))} />
                <Input label="Series Order" type="number" min="1" value={blogDraft.seriesOrder} onChange={(event) => setBlogDraft((current) => ({ ...current, seriesOrder: event.target.value }))} />
                <Input label="Series Title" value={blogDraft.seriesTitle} onChange={(event) => setBlogDraft((current) => ({ ...current, seriesTitle: event.target.value }))} />
              </div>
              <Textarea label="Series Description" value={blogDraft.seriesDescription} onChange={(event) => setBlogDraft((current) => ({ ...current, seriesDescription: event.target.value }))} rows={2} />
              <Textarea label="Intro Paragraphs" value={blogDraft.introText} onChange={(event) => setBlogDraft((current) => ({ ...current, introText: event.target.value }))} rows={4} hint="One paragraph per line." />
              <Textarea label="Sections JSON" value={blogDraft.sectionsJson} onChange={(event) => setBlogDraft((current) => ({ ...current, sectionsJson: event.target.value }))} rows={10} hint='JSON array of sections like [{"heading":"Title","paragraphs":["One"],"bullets":["Two"]}]' />
              <Textarea label="Closing" value={blogDraft.closing} onChange={(event) => setBlogDraft((current) => ({ ...current, closing: event.target.value }))} rows={3} />
              <div className="admin-content-form-grid admin-content-form-grid--three">
                <Input label="Heart Seeds" type="number" min="0" value={blogDraft.reactionHeart} onChange={(event) => setBlogDraft((current) => ({ ...current, reactionHeart: event.target.value }))} />
                <Input label="Insightful Seeds" type="number" min="0" value={blogDraft.reactionInsightful} onChange={(event) => setBlogDraft((current) => ({ ...current, reactionInsightful: event.target.value }))} />
                <Input label="Useful Seeds" type="number" min="0" value={blogDraft.reactionUseful} onChange={(event) => setBlogDraft((current) => ({ ...current, reactionUseful: event.target.value }))} />
              </div>
            </div>
          ) : activeSection === "projects" ? (
            <div className="admin-content-form">
              <div className="admin-content-form-grid">
                <Input label="Title" value={projectDraft.title} onChange={(event) => setProjectDraft((current) => ({ ...current, title: event.target.value }))} />
                <Input label="Slug" value={projectDraft.slug} onChange={(event) => setProjectDraft((current) => ({ ...current, slug: event.target.value }))} hint="Used for the Firestore document ID." />
              </div>
              <Input label="Tagline" value={projectDraft.tagline} onChange={(event) => setProjectDraft((current) => ({ ...current, tagline: event.target.value }))} />
              <Textarea label="Description" value={projectDraft.description} onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))} rows={4} />
              <div className="admin-content-form-grid admin-content-form-grid--three">
                <Select label="Category" value={projectDraft.category} onChange={(event) => setProjectDraft((current) => ({ ...current, category: event.target.value as ProjectEditorState["category"] }))} options={PROJECT_CATEGORY_OPTIONS} />
                <Select label="Type" value={projectDraft.type} onChange={(event) => setProjectDraft((current) => ({ ...current, type: event.target.value as ProjectEditorState["type"] }))} options={PROJECT_TYPE_OPTIONS} />
                <Select label="Status" value={projectDraft.status} onChange={(event) => setProjectDraft((current) => ({ ...current, status: event.target.value as ProjectEditorState["status"] }))} options={PROJECT_STATUS_OPTIONS} />
              </div>
              <div className="admin-content-form-grid admin-content-form-grid--three">
                <Select label="Visibility" value={projectDraft.visibility} onChange={(event) => setProjectDraft((current) => ({ ...current, visibility: event.target.value as ProjectEditorState["visibility"] }))} options={VISIBILITY_OPTIONS} />
                <Input label="Start Month" type="month" value={projectDraft.startDate} onChange={(event) => setProjectDraft((current) => ({ ...current, startDate: event.target.value }))} />
                <Input label="End Month" type="month" value={projectDraft.endDate} onChange={(event) => setProjectDraft((current) => ({ ...current, endDate: event.target.value }))} />
              </div>
              <Checkbox label="Featured project" checked={projectDraft.featured} onChange={(event) => setProjectDraft((current) => ({ ...current, featured: event.target.checked }))} description="Highlighted in the public Projects page spotlight when it sorts to the top." />
              <div className="admin-content-form-grid admin-content-form-grid--three">
                <Input label="Estimated Time" value={projectDraft.estimatedTime} onChange={(event) => setProjectDraft((current) => ({ ...current, estimatedTime: event.target.value }))} placeholder="Ongoing build" />
                <Input label="Complexity (1-5)" type="number" min="1" max="5" value={projectDraft.complexity} onChange={(event) => setProjectDraft((current) => ({ ...current, complexity: event.target.value }))} />
                <Input label="Tags" value={projectDraft.tagsText} onChange={(event) => setProjectDraft((current) => ({ ...current, tagsText: event.target.value }))} placeholder="PHP, JavaScript, MySQL" />
              </div>
              <Input label="Tech Stack" value={projectDraft.techStackText} onChange={(event) => setProjectDraft((current) => ({ ...current, techStackText: event.target.value }))} placeholder="React, TypeScript, Firebase" hint="Comma-separated." />
              <div className="admin-content-form-grid">
                <Input label="Repository URL" value={projectDraft.repoUrl} onChange={(event) => setProjectDraft((current) => ({ ...current, repoUrl: event.target.value }))} placeholder="https://github.com/username/repo" />
                <Input label="Live URL" value={projectDraft.liveUrl} onChange={(event) => setProjectDraft((current) => ({ ...current, liveUrl: event.target.value }))} placeholder="https://example.com" />
              </div>
              <Textarea label="Comparison Summary" value={projectDraft.comparisonSummary} onChange={(event) => setProjectDraft((current) => ({ ...current, comparisonSummary: event.target.value }))} rows={3} />
              <div className="admin-content-form-grid">
                <Input label="Effort Label" value={projectDraft.effortLabel} onChange={(event) => setProjectDraft((current) => ({ ...current, effortLabel: event.target.value }))} placeholder="Solo build" />
                <Input label="Effort Note" value={projectDraft.effortNote} onChange={(event) => setProjectDraft((current) => ({ ...current, effortNote: event.target.value }))} placeholder="100% built by me" />
              </div>
              <Textarea label="Learned Points" value={projectDraft.learnedText} onChange={(event) => setProjectDraft((current) => ({ ...current, learnedText: event.target.value }))} rows={4} hint="One point per line." />
              <Textarea label="Asset URLs" value={projectDraft.assetUrlsText} onChange={(event) => setProjectDraft((current) => ({ ...current, assetUrlsText: event.target.value }))} rows={4} hint="One URL per line." />
              <div className="admin-content-form-grid admin-content-form-grid--three">
                <Input label="Frontend %" type="number" min="0" max="100" value={projectDraft.contributionFrontend} onChange={(event) => setProjectDraft((current) => ({ ...current, contributionFrontend: event.target.value }))} />
                <Input label="Backend %" type="number" min="0" max="100" value={projectDraft.contributionBackend} onChange={(event) => setProjectDraft((current) => ({ ...current, contributionBackend: event.target.value }))} />
                <Input label="Design %" type="number" min="0" max="100" value={projectDraft.contributionDesign} onChange={(event) => setProjectDraft((current) => ({ ...current, contributionDesign: event.target.value }))} />
              </div>
              <div className="admin-content-form-grid">
                <Input label="Source Preview Title" value={projectDraft.sourcePreviewTitle} onChange={(event) => setProjectDraft((current) => ({ ...current, sourcePreviewTitle: event.target.value }))} />
                <Input label="Source Preview Language" value={projectDraft.sourcePreviewLanguage} onChange={(event) => setProjectDraft((current) => ({ ...current, sourcePreviewLanguage: event.target.value }))} />
              </div>
              <Textarea label="Source Preview Snippet" value={projectDraft.sourcePreviewSnippet} onChange={(event) => setProjectDraft((current) => ({ ...current, sourcePreviewSnippet: event.target.value }))} rows={6} />
              <Textarea label="Stack Groups JSON" value={projectDraft.stackGroupsJson} onChange={(event) => setProjectDraft((current) => ({ ...current, stackGroupsJson: event.target.value }))} rows={8} hint='JSON array like [{"label":"Interface","items":["React","TypeScript"]}]' />
              <Textarea label="Gallery JSON" value={projectDraft.galleryJson} onChange={(event) => setProjectDraft((current) => ({ ...current, galleryJson: event.target.value }))} rows={8} hint='JSON array like [{"title":"Overview","caption":"...","bullets":["One"],"theme":"violet"}]' />
              <Textarea label="Architecture Summary" value={projectDraft.architectureSummary} onChange={(event) => setProjectDraft((current) => ({ ...current, architectureSummary: event.target.value }))} rows={3} />
              <Textarea label="Architecture Lanes JSON" value={projectDraft.architectureLanesJson} onChange={(event) => setProjectDraft((current) => ({ ...current, architectureLanesJson: event.target.value }))} rows={8} hint='JSON array like [{"label":"Data","nodes":["Firebase","API"]}]' />
              <Input label="Related IDs" value={projectDraft.relatedIdsText} onChange={(event) => setProjectDraft((current) => ({ ...current, relatedIdsText: event.target.value }))} placeholder="portfolio-website, mediahub" hint="Comma-separated project IDs." />
            </div>
          ) : (
            <div className="admin-content-form">
              <div className="admin-content-form-grid">
                <Input label="Label" value={linkDraft.label} onChange={(event) => setLinkDraft((current) => ({ ...current, label: event.target.value }))} />
                <Input label="URL" value={linkDraft.url} onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com or mailto:hello@example.com" />
              </div>
              <div className="admin-content-form-grid admin-content-form-grid--three">
                <Input label="Category" value={linkDraft.category} onChange={(event) => setLinkDraft((current) => ({ ...current, category: event.target.value }))} placeholder="social" />
                <Select label="Icon" value={linkDraft.icon} onChange={(event) => setLinkDraft((current) => ({ ...current, icon: event.target.value }))} options={LINK_ICON_OPTIONS} />
                <Input label="Order" type="number" value={linkDraft.order} onChange={(event) => setLinkDraft((current) => ({ ...current, order: event.target.value }))} />
              </div>
              <Checkbox label="Active link" checked={linkDraft.isActive} onChange={(event) => setLinkDraft((current) => ({ ...current, isActive: event.target.checked }))} description="Inactive links stay in Firestore but drop out of the public site surfaces." />
              <Textarea label="Description" value={linkDraft.description} onChange={(event) => setLinkDraft((current) => ({ ...current, description: event.target.value }))} rows={3} />
            </div>
          )}

          <div className="admin-users__actions admin-content-form-actions">
            <Button icon={<Save size={15} />} onClick={() => void handleSave()} loading={saving}>
              {isCreating ? "Create item" : "Save changes"}
            </Button>
            {!isCreating ? (
              <Button
                variant="danger"
                icon={<Trash2 size={15} />}
                onClick={() => void handleDelete()}
                loading={deleting}
              >
                Delete
              </Button>
            ) : null}
            {activeSection === "blogs" ? (
              <a href="/blog" className="admin-module-card__link admin-module-card__link--inline">
                <ExternalLink size={14} />
                Open public blog
              </a>
            ) : activeSection === "projects" ? (
              <a href="/projects" className="admin-module-card__link admin-module-card__link--inline">
                <FolderKanban size={14} />
                Open public projects
              </a>
            ) : (
              <span className="admin-users__lock-note">
                Home and footer social links read from this collection with a safe local fallback.
              </span>
            )}
          </div>
        </div>
      </section>

      {statusMessage ? (
        <section className="admin-panel">
          <div className={`admin-inline-status ${statusTone === "error" ? "is-error" : statusTone === "success" ? "is-success" : ""}`} aria-live="polite">
            {statusMessage}
          </div>
        </section>
      ) : null}
    </div>
  );
}
