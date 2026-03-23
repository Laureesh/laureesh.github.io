import { getDocs, query, where } from "firebase/firestore";
import { portfoliosCollection, projectsCollection, projectDocument, portfolioDocument } from "./collections";
import { createRecord, deleteRecord, getRecord, setRecord, updateRecord } from "./repository";
import { timestampNow } from "../firebase/firestore";
import type { MediaAsset, PortfolioRecord, ProjectRecord, SkillArea, UserProfile, VisibilitySetting } from "../types/models";

export interface PortfolioProjectInput {
  title: string;
  description: string;
  techStack: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  imageUrls: string[];
}

function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback.toLowerCase();
}

function dedupeStrings(values: string[]) {
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

function buildMediaAssets(imageUrls: string[]): MediaAsset[] {
  return dedupeStrings(imageUrls).map((url) => ({
    path: url,
    url,
    alt: null,
    caption: null,
  }));
}

function buildProjectTagline(title: string, description: string) {
  const fallback = title.trim();
  const compactDescription = description.trim().replace(/\s+/g, " ");

  if (!compactDescription) {
    return fallback;
  }

  return compactDescription.length > 96 ? `${compactDescription.slice(0, 93).trimEnd()}...` : compactDescription;
}

function inferSkillAreas(skills: string[]) {
  const normalizedSkills = skills.map((skill) => skill.toLowerCase());
  const areas = new Set<SkillArea>();

  const matchesAny = (keywords: string[]) => normalizedSkills.some((skill) => keywords.some((keyword) => skill.includes(keyword)));

  if (matchesAny(["react", "vue", "angular", "html", "css", "tailwind", "frontend", "ui", "ux", "javascript", "typescript"])) {
    areas.add("frontend");
  }

  if (matchesAny(["node", "express", "backend", "api", "firebase", "sql", "mysql", "postgres", "server", "auth"])) {
    areas.add("backend");
  }

  if (matchesAny(["aws", "cloud", "gcp", "azure", "docker", "devops"])) {
    areas.add("cloud");
  }

  if (matchesAny(["python", "analytics", "data", "machine learning", "pandas"])) {
    areas.add("data");
  }

  if (matchesAny(["figma", "design", "branding", "motion"])) {
    areas.add("design");
  }

  if (areas.has("frontend") && areas.has("backend")) {
    areas.add("fullstack");
  }

  return [...areas];
}

function buildCommunityScore(profile: UserProfile, projectIds: string[]) {
  let score = projectIds.length * 18 + profile.skills.length * 6;

  if (profile.headline.trim()) score += 14;
  if (profile.bio.trim()) score += 18;
  if (profile.username?.trim()) score += 8;
  if (profile.photoURL) score += 6;

  const socialLinksCount = Object.values(profile.socialLinks).filter(Boolean).length;
  score += socialLinksCount * 4;

  return score;
}

function normalizePortfolioRecord(record: PortfolioRecord) {
  const skills = dedupeStrings(Array.isArray(record.skills) ? record.skills : []);
  const projectIds = dedupeStrings(Array.isArray(record.projectIds) ? record.projectIds : []);

  return {
    ...record,
    displayName: record.displayName || record.headline || "Member",
    username: record.username ?? null,
    photoURL: record.photoURL ?? null,
    about: record.about ?? "",
    headline: record.headline || record.displayName || "Portfolio member",
    featuredProjectId: record.featuredProjectId ?? null,
    projectIds,
    projectCount: typeof record.projectCount === "number" ? record.projectCount : projectIds.length,
    skills,
    skillAreas: Array.isArray(record.skillAreas) && record.skillAreas.length ? record.skillAreas : inferSkillAreas(skills),
    communityScore: typeof record.communityScore === "number" ? record.communityScore : projectIds.length * 18 + skills.length * 6,
    socialLinks: record.socialLinks ?? {},
    isPublic: Boolean(record.isPublic),
  } satisfies PortfolioRecord;
}

function buildProjectRecord(
  ownerId: string,
  input: PortfolioProjectInput,
  visibility: VisibilitySetting,
  existing?: ProjectRecord | null,
): ProjectRecord {
  const now = timestampNow();
  const title = input.title.trim();
  const description = input.description.trim();

  return {
    id: existing?.id,
    slug: slugify(title, existing?.id ?? ownerId),
    title,
    tagline: buildProjectTagline(title, description),
    description,
    ownerId,
    scope: "portfolio",
    type: "personal",
    status: "completed",
    visibility,
    featured: existing?.featured ?? false,
    startDate: existing?.startDate ?? null,
    endDate: existing?.endDate ?? null,
    techStack: dedupeStrings(input.techStack),
    tags: dedupeStrings(input.techStack),
    repoUrl: input.repoUrl?.trim() || null,
    liveUrl: input.liveUrl?.trim() || null,
    assets: buildMediaAssets(input.imageUrls),
    category: null,
    estimatedTime: null,
    complexity: null,
    comparisonSummary: null,
    effortLabel: null,
    effortNote: null,
    stackGroups: [],
    contributions: {
      frontend: 0,
      backend: 0,
      design: 0,
    },
    learned: [],
    sourcePreview: null,
    gallery: [],
    architecture: null,
    relatedIds: [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function sortProjects(projects: ProjectRecord[]) {
  return [...projects].sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

function buildPortfolioRecord(
  profile: UserProfile,
  projectIds: string[],
  existing?: PortfolioRecord | null,
): PortfolioRecord {
  const now = timestampNow();
  const dedupedProjectIds = dedupeStrings(projectIds);
  const nextFeaturedProjectId = dedupedProjectIds.includes(existing?.featuredProjectId ?? "")
    ? existing?.featuredProjectId ?? null
    : dedupedProjectIds[0] ?? null;

  return {
    id: profile.uid,
    userId: profile.uid,
    slug: slugify(profile.username ?? profile.displayName, profile.uid),
    displayName: profile.displayName,
    username: profile.username,
    photoURL: profile.photoURL,
    headline: profile.headline.trim() || profile.displayName,
    about: profile.bio.trim(),
    featuredProjectId: nextFeaturedProjectId,
    projectIds: dedupedProjectIds,
    projectCount: dedupedProjectIds.length,
    skills: dedupeStrings(profile.skills),
    skillAreas: inferSkillAreas(profile.skills),
    communityScore: buildCommunityScore(profile, dedupedProjectIds),
    socialLinks: profile.socialLinks,
    isPublic: profile.isPublic,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function getPortfolioRecord(uid: string) {
  const record = await getRecord(portfolioDocument(uid));
  return record ? normalizePortfolioRecord(record) : null;
}

export async function syncPortfolioRecord(profile: UserProfile, projectIds: string[]) {
  const existing = await getPortfolioRecord(profile.uid);
  const nextRecord = buildPortfolioRecord(profile, projectIds, existing);
  await setRecord(portfolioDocument(profile.uid), nextRecord);
  return nextRecord;
}

export async function listPortfolioProjects(ownerId: string) {
  const snapshot = await getDocs(
    query(
      projectsCollection(),
      where("ownerId", "==", ownerId),
      where("scope", "==", "portfolio"),
    ),
  );

  const projects = snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));

  return sortProjects(projects);
}

export async function listPublicPortfolioRecords() {
  const snapshot = await getDocs(query(portfoliosCollection(), where("isPublic", "==", true)));
  return snapshot.docs.map((documentSnapshot) => normalizePortfolioRecord({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));
}

export async function listPublicPortfolioProjects() {
  const snapshot = await getDocs(
    query(
      projectsCollection(),
      where("scope", "==", "portfolio"),
      where("visibility", "==", "public"),
    ),
  );

  const projects = snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));

  return sortProjects(projects);
}

export async function createPortfolioProject(
  ownerId: string,
  input: PortfolioProjectInput,
  visibility: VisibilitySetting,
) {
  const record = buildProjectRecord(ownerId, input, visibility);
  const { id: _id, ...createData } = record;
  const created = await createRecord(projectsCollection(), createData);
  return {
    ...createData,
    id: created.id,
  };
}

export async function updatePortfolioProject(
  projectId: string,
  ownerId: string,
  input: PortfolioProjectInput,
  visibility: VisibilitySetting,
  existing: ProjectRecord,
) {
  const record = buildProjectRecord(ownerId, input, visibility, existing);

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

  return {
    ...record,
    id: projectId,
  };
}

export async function deletePortfolioProject(projectId: string) {
  await deleteRecord(projectDocument(projectId));
}
