import { getDocs } from "firebase/firestore";
import { isFirebaseConfigured } from "../firebase";
import { Timestamp, timestampNow } from "../firebase/firestore";
import type {
  ContentStatus,
  PageContentRecord,
  PageSectionRecord,
  VisibilitySetting,
} from "../types/models";
import { pageDocument, pagesCollection } from "./collections";
import { logAdminActivity } from "./adminActivity";
import { assertCurrentUserCanAccessAdmin } from "./adminSecurity";
import { getRecord, setRecord } from "./repository";

export type EditablePageKey = "home" | "about" | "contact" | "food-routine" | "face-routine";

export interface EditablePageDefinition {
  key: EditablePageKey;
  label: string;
  route: string;
  description: string;
  visibility: VisibilitySetting;
}

export interface ResolvedPageContent {
  pageKey: EditablePageKey;
  title: string;
  route: string;
  description: string;
  status: ContentStatus;
  scheduledAt: PageContentRecord["scheduledAt"] | null;
  visibility: VisibilitySetting;
  source: "fallback" | "firestore";
  sections: PageSectionRecord[];
  updatedAt: PageContentRecord["updatedAt"] | null;
}

export interface AdminPageInput {
  title: string;
  status: ContentStatus;
  scheduledAt: string | null;
  sections: PageSectionRecord[];
}

export const editablePages: EditablePageDefinition[] = [
  {
    key: "home",
    label: "Home",
    route: "/",
    description: "Hero, quick-start, featured-project, and current-focus copy for the landing page.",
    visibility: "public",
  },
  {
    key: "about",
    label: "About",
    route: "/about",
    description: "Page heading, intro copy, and section intros for the About page.",
    visibility: "public",
  },
  {
    key: "contact",
    label: "Contact",
    route: "/contact",
    description: "Header, hiring pitch, message form, booking notice, and FAQ intros for the Contact page.",
    visibility: "public",
  },
  {
    key: "food-routine",
    label: "Food Routine",
    route: "/admin-dashboard/private-pages/food-routine",
    description: "Admin-only nutrition, meal-prep, and daily eating-flow notes.",
    visibility: "private",
  },
  {
    key: "face-routine",
    label: "Face Routine",
    route: "/admin-dashboard/private-pages/face-routine",
    description: "Admin-only skincare, product order, and weekly maintenance notes.",
    visibility: "private",
  },
];

const fallbackPageContent: Record<EditablePageKey, { title: string; sections: PageSectionRecord[] }> = {
  home: {
    title: "Home Page",
    sections: [
      {
        id: "hero",
        type: "hero",
        eyebrow: "Available for opportunities",
        title: "Laureesh Volmar",
        body:
          "Dual-degree IT student at Georgia Gwinnett College pursuing Software Development and Cybersecurity. Passionate about back-end development, cloud computing, and building data-driven applications.",
      },
      {
        id: "overview",
        type: "rich_text",
        eyebrow: "Quick Start",
        title: "Start with the pages that matter most",
        body:
          "Projects is the fastest way to see what I've built. About adds background. Skills shows the tools behind the work. Use the cards below based on what you want to learn first.",
      },
      {
        id: "featured",
        type: "rich_text",
        eyebrow: "Featured Projects",
        title: "Start with these",
        body:
          "Open the strongest demos first to see how I approach product polish, interaction quality, and technical implementation.",
      },
      {
        id: "focus",
        type: "rich_text",
        eyebrow: "Current Focus",
        title: "What I'm building toward",
        body:
          "I'm working on stronger backend foundations, more cloud confidence, and projects that are clear enough to explain and solid enough to demo.",
      },
    ],
  },
  about: {
    title: "About Page",
    sections: [
      {
        id: "header",
        type: "hero",
        eyebrow: "Get To Know Me",
        title: "About Me",
        body: "Background, education, tools, and the path that brought me into software development.",
      },
      {
        id: "intro",
        type: "rich_text",
        title: "Intro",
        body:
          "I'm a software development student at Georgia Gwinnett College focused on building full-stack projects that feel intentional in both structure and user experience. My background is not a straight line into tech, and that is part of what shapes how I work.",
        items: [
          {
            text:
              "Coming from healthcare and operations pushed precision, responsibility, and clarity to the front of my thinking. In software, that now shows up as an interest in backend logic, navigation quality, clean UI systems, and products that feel reliable instead of rushed.",
          },
        ],
      },
      {
        id: "timeline",
        type: "rich_text",
        title: "Education + Experience Timeline",
        body:
          "The short version of how healthcare, coursework, certifications, and shipped projects started turning into a clearer software path.",
      },
      {
        id: "credentials",
        type: "rich_text",
        title: "Credentials + Favorite Tools",
        body:
          "Formal checkpoints, the tools I reach for most often, and the coursework shaping the way I think.",
      },
      {
        id: "interests",
        type: "rich_text",
        title: "Interests + Fun Facts",
        body:
          "A few of the things that shape how I recharge, what I notice, and the kind of work I naturally gravitate toward.",
      },
      {
        id: "bookshelf",
        type: "rich_text",
        title: "Reading List / Bookshelf",
        body:
          "Books and references that keep shaping how I think about systems, product quality, and the craft behind software.",
      },
      {
        id: "journey",
        type: "rich_text",
        title: "My Development Journey",
        body:
          "A higher-level map of how the transition into software keeps moving from foundation to product-minded execution.",
      },
    ],
  },
  contact: {
    title: "Contact Page",
    sections: [
      {
        id: "header",
        type: "hero",
        eyebrow: "Get In Touch",
        title: "Contact Me",
        body:
          "If you are hiring, collaborating, or just want to talk through a build, this page is set up to make the fastest next step obvious.",
      },
      {
        id: "hire",
        type: "rich_text",
        eyebrow: "Hire me",
        title: "Front-end focused developer with working demos, clear communication, and real build context.",
        body:
          "Best fit for teams that want someone who can ship UI, explain tradeoffs, and keep improving quickly across the stack.",
      },
      {
        id: "form",
        type: "rich_text",
        eyebrow: "Send a message",
        title: "Use the form if email is your preferred route.",
        body: "This form is for direct outreach when you want to send details without opening your mail client first.",
      },
      {
        id: "calendar",
        type: "rich_text",
        eyebrow: "Book a call",
        title: "Coming soon",
        body:
          "Direct call scheduling is not live yet. If you want to talk, email me and I can set up a time manually.",
      },
      {
        id: "faq",
        type: "faq",
        eyebrow: "Hiring FAQ",
        title: "Questions that usually come up before a conversation.",
        body: "A quick set of answers for the things recruiters and collaborators usually ask first.",
      },
    ],
  },
  "food-routine": {
    title: "Food Routine",
    sections: [
      {
        id: "header",
        type: "hero",
        eyebrow: "Admin Routine",
        title: "Food Routine",
        body: "Private admin content is intentionally stored in Firestore only. Seed or publish this page from the admin editor before using it as a reference.",
      },
      {
        id: "placeholder",
        type: "rich_text",
        eyebrow: "Security Note",
        title: "No bundled fallback content",
        body: "This page no longer ships with embedded private notes in the frontend bundle. Firestore is now the source of truth for admin-only routines.",
        items: [
          { text: "Open Admin Pages to seed the placeholder record into Firestore." },
          { text: "Write and publish the actual routine there instead of relying on local fallbacks." },
        ],
      },
    ],
  },
  "face-routine": {
    title: "Face Routine",
    sections: [
      {
        id: "header",
        type: "hero",
        eyebrow: "Admin Routine",
        title: "Face Routine",
        body: "Private admin content is intentionally stored in Firestore only. Seed or publish this page from the admin editor before using it as a reference.",
      },
      {
        id: "placeholder",
        type: "rich_text",
        eyebrow: "Security Note",
        title: "No bundled fallback content",
        body: "This page no longer ships with embedded private notes in the frontend bundle. Firestore is now the source of truth for admin-only routines.",
        items: [
          { text: "Open Admin Pages to seed the placeholder record into Firestore." },
          { text: "Write and publish the actual routine there instead of relying on local fallbacks." },
        ],
      },
    ],
  },
};

function cloneSections(sections: PageSectionRecord[]) {
  return sections.map((section) => ({
    ...section,
    items: section.items?.map((item) => ({ ...item })),
  }));
}

function getPageDefinition(pageKey: EditablePageKey) {
  return editablePages.find((page) => page.key === pageKey) ?? editablePages[0];
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

function buildFallbackRecord(pageKey: EditablePageKey): PageContentRecord {
  const now = timestampNow();
  const page = getPageDefinition(pageKey);
  return {
    id: pageKey,
    pageKey,
    title: fallbackPageContent[pageKey].title,
    status: "published",
    scheduledAt: null,
    visibility: page.visibility,
    updatedBy: "system",
    sections: cloneSections(fallbackPageContent[pageKey].sections),
    createdAt: now,
    updatedAt: now,
  };
}

function mergeSections(pageKey: EditablePageKey, sections: PageSectionRecord[]) {
  const fallbackSections = fallbackPageContent[pageKey].sections;
  const sectionMap = new Map(sections.map((section) => [section.id, section]));

  const merged = fallbackSections.map((fallbackSection) => {
    const override = sectionMap.get(fallbackSection.id);

    if (!override) {
      return { ...fallbackSection, items: fallbackSection.items?.map((item) => ({ ...item })) };
    }

    return {
      ...fallbackSection,
      ...override,
      eyebrow: override.eyebrow ?? fallbackSection.eyebrow ?? null,
      title: override.title ?? fallbackSection.title ?? null,
      body: override.body ?? fallbackSection.body ?? null,
      items: override.items?.length
        ? override.items.map((item) => ({ ...item }))
        : fallbackSection.items?.map((item) => ({ ...item })),
    };
  });

  const extraSections = sections.filter(
    (section) => !fallbackSections.some((fallbackSection) => fallbackSection.id === section.id),
  );

  return [
    ...merged,
    ...extraSections.map((section) => ({
      ...section,
      items: section.items?.map((item) => ({ ...item })),
    })),
  ];
}

function mapPageRecord(
  pageKey: EditablePageKey,
  record: PageContentRecord,
  source: "fallback" | "firestore",
): ResolvedPageContent {
  const page = getPageDefinition(pageKey);
  return {
    pageKey,
    title: record.title,
    route: page.route,
    description: page.description,
    status: record.status,
    scheduledAt: record.scheduledAt ?? null,
    visibility: record.visibility ?? page.visibility,
    source,
    sections: mergeSections(pageKey, record.sections ?? []),
    updatedAt: record.updatedAt ?? null,
  };
}

export function getDefaultPageContent(pageKey: EditablePageKey): ResolvedPageContent {
  return mapPageRecord(pageKey, buildFallbackRecord(pageKey), "fallback");
}

export async function getResolvedPageContent(pageKey: EditablePageKey) {
  const fallback = getDefaultPageContent(pageKey);

  if (!isFirebaseConfigured) {
    return fallback;
  }

  try {
    const record = await getRecord(pageDocument(pageKey));

    if (!record || !isScheduledContentVisible(record.status, record.scheduledAt)) {
      return fallback;
    }

    return mapPageRecord(pageKey, record, "firestore");
  } catch {
    return fallback;
  }
}

export async function listAdminPageContent() {
  await assertCurrentUserCanAccessAdmin();

  if (!isFirebaseConfigured) {
    return editablePages.map((page) => getDefaultPageContent(page.key));
  }

  try {
    const snapshot = await getDocs(pagesCollection());
    const pageMap = new Map<string, PageContentRecord>();

    for (const documentSnapshot of snapshot.docs) {
      pageMap.set(documentSnapshot.id, documentSnapshot.data());
    }

    return editablePages.map((page) => {
      const record = pageMap.get(page.key);

      if (!record) {
        return getDefaultPageContent(page.key);
      }

      return mapPageRecord(page.key, record, "firestore");
    });
  } catch {
    return editablePages.map((page) => getDefaultPageContent(page.key));
  }
}

export async function saveAdminPageContent(
  pageKey: EditablePageKey,
  input: AdminPageInput,
  updatedBy: string,
) {
  await assertCurrentUserCanAccessAdmin();
  const existing = await getRecord(pageDocument(pageKey));
  const now = timestampNow();
  const fallback = buildFallbackRecord(pageKey);

  const record: PageContentRecord = {
    id: pageKey,
    pageKey,
    title: input.title.trim() || fallback.title,
    status: input.status,
    scheduledAt: input.status === "scheduled" ? timestampFromDateTime(input.scheduledAt) : null,
    visibility: fallback.visibility,
    updatedBy,
    sections: mergeSections(pageKey, input.sections),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await setRecord(pageDocument(pageKey), record);
  await logAdminActivity({
    actorId: updatedBy,
    action: "update",
    entityType: "page",
    entityId: pageKey,
    entityLabel: record.title,
    summary:
      record.status === "scheduled"
        ? `Scheduled page "${record.title}" for later publishing.`
        : `Saved page "${record.title}".`,
  });
  return mapPageRecord(pageKey, record, "firestore");
}

export async function seedFallbackPageContent() {
  await assertCurrentUserCanAccessAdmin();
  let imported = 0;

  for (const page of editablePages) {
    const existing = await getRecord(pageDocument(page.key));

    if (existing) {
      continue;
    }

    await setRecord(pageDocument(page.key), buildFallbackRecord(page.key));
    imported += 1;
  }

  return imported;
}

export function getPageSection(content: ResolvedPageContent, sectionId: string) {
  return content.sections.find((section) => section.id === sectionId) ?? null;
}

export function getPageSectionLines(section: PageSectionRecord | null) {
  return (section?.items ?? [])
    .map((item) => (typeof item.text === "string" ? item.text : null))
    .filter((item): item is string => Boolean(item));
}
