import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, RefreshCcw, RotateCcw, Save, UploadCloud } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button, Input, Select, Textarea } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  editablePages,
  getDefaultPageContent,
  getPageSectionLines,
  listAdminPageContent,
  saveAdminPageContent,
  seedFallbackPageContent,
  type AdminPageInput,
  type EditablePageKey,
  type ResolvedPageContent,
} from "../../services/pageContent";
import type { ContentStatus, PageSectionRecord } from "../../types/models";

type StatusTone = "error" | "success" | null;

interface PageSectionDraft {
  id: string;
  label: string;
  type: PageSectionRecord["type"];
  eyebrow: string;
  title: string;
  body: string;
  itemsText: string;
}

interface PageDraft {
  title: string;
  status: ContentStatus;
  scheduledAt: string;
  sections: PageSectionDraft[];
}

const PAGE_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const pageSectionLabels: Record<EditablePageKey, Record<string, string>> = {
  home: {
    hero: "Hero",
    overview: "Quick Start",
    featured: "Featured Projects",
    focus: "Current Focus",
  },
  about: {
    header: "Header",
    intro: "Intro",
    timeline: "Timeline",
    credentials: "Credentials",
    interests: "Interests",
    bookshelf: "Bookshelf",
    journey: "Journey",
  },
  contact: {
    header: "Header",
    hire: "Hiring Pitch",
    form: "Message Form",
    calendar: "Call Booking",
    faq: "FAQ",
  },
  "food-routine": {
    header: "Header",
    principles: "Principles",
    "daily-flow": "Daily Flow",
    prep: "Prep Notes",
  },
  "face-routine": {
    header: "Header",
    morning: "Morning",
    night: "Night",
    weekly: "Weekly Maintenance",
  },
};

function parseLineList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPageAdminErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    if (error.code === "permission-denied" || error.code === "firestore/permission-denied") {
      return "Firestore blocked this page editor action. Publish the latest Firestore rules, then confirm your users/{uid} document has role set to admin and status set to active.";
    }
  }

  if (error instanceof Error && /missing or insufficient permissions/i.test(error.message)) {
    return "Firestore blocked this page editor action. Publish the latest Firestore rules, then confirm your users/{uid} document has role set to admin and status set to active.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getSectionLabel(pageKey: EditablePageKey, section: PageSectionRecord) {
  return pageSectionLabels[pageKey][section.id] ?? section.title ?? section.id;
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

function pageContentToDraft(content: ResolvedPageContent): PageDraft {
  return {
    title: content.title,
    status: content.status,
    scheduledAt: formatTimestampForDateTimeInput(content.scheduledAt),
    sections: content.sections.map((section) => ({
      id: section.id,
      label: getSectionLabel(content.pageKey, section),
      type: section.type,
      eyebrow: section.eyebrow ?? "",
      title: section.title ?? "",
      body: section.body ?? "",
      itemsText: getPageSectionLines(section).join("\n"),
    })),
  };
}

function pageDraftToInput(draft: PageDraft): AdminPageInput {
  return {
    title: draft.title,
    status: draft.status,
    scheduledAt: draft.scheduledAt || null,
    sections: draft.sections.map((section) => {
      const lines = parseLineList(section.itemsText);

      return {
        id: section.id,
        type: section.type,
        eyebrow: section.eyebrow.trim() || null,
        title: section.title.trim() || null,
        body: section.body.trim() || null,
        items: lines.length ? lines.map((text) => ({ text })) : undefined,
      };
    }),
  };
}

function formatUpdatedAt(content: ResolvedPageContent | null) {
  if (!content?.updatedAt || typeof content.updatedAt.toDate !== "function") {
    return "Not saved to Firestore yet.";
  }

  return content.updatedAt.toDate().toLocaleString();
}

export default function AdminPagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pages, setPages] = useState<ResolvedPageContent[]>([]);
  const requestedPage = searchParams.get("page");
  const [selectedPageKey, setSelectedPageKey] = useState<EditablePageKey>(
    requestedPage && editablePages.some((page) => page.key === requestedPage)
      ? (requestedPage as EditablePageKey)
      : "home",
  );
  const [pageDraft, setPageDraft] = useState<PageDraft>(() => pageContentToDraft(getDefaultPageContent("home")));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>(null);

  const selectedPage = useMemo(
    () => pages.find((page) => page.pageKey === selectedPageKey) ?? getDefaultPageContent(selectedPageKey),
    [pages, selectedPageKey],
  );

  const selectedDefinition = editablePages.find((page) => page.key === selectedPageKey) ?? editablePages[0];

  const loadPages = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setStatusMessage(null);
    setStatusTone(null);

    try {
      const nextPages = await listAdminPageContent();
      setPages(nextPages);
    } catch (error) {
      setStatusMessage(getPageAdminErrorMessage(error, "Unable to load editable pages right now."));
      setStatusTone("error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadPages();
  }, []);

  useEffect(() => {
    if (requestedPage && editablePages.some((page) => page.key === requestedPage)) {
      setSelectedPageKey(requestedPage as EditablePageKey);
    }
  }, [requestedPage]);

  useEffect(() => {
    setPageDraft(pageContentToDraft(selectedPage));
  }, [selectedPage]);

  const handleSave = async () => {
    if (!user?.uid) {
      setStatusMessage("You need to be signed in as an admin before saving editable page content.");
      setStatusTone("error");
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const saved = await saveAdminPageContent(selectedPageKey, pageDraftToInput(pageDraft), user.uid);
      setPages((current) =>
        current.map((page) => (page.pageKey === selectedPageKey ? saved : page)),
      );
      setPageDraft(pageContentToDraft(saved));
      setStatusMessage(
        saved.status === "scheduled"
          ? `${selectedDefinition.label} content scheduled. Live pages will switch to this Firestore copy when the scheduled time is reached.`
          : `${selectedDefinition.label} content saved. Live pages now read this Firestore copy when the status is published.`,
      );
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(getPageAdminErrorMessage(error, "Unable to save this page right now."));
      setStatusTone("error");
    } finally {
      setSaving(false);
    }
  };

  const handleImportFallbackPages = async () => {
    setImporting(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const imported = await seedFallbackPageContent();
      await loadPages(true);
      setStatusMessage(
        imported > 0
          ? `Seeded ${imported} editable page record${imported === 1 ? "" : "s"} from the current site copy.`
          : "All editable page records already exist in Firestore.",
      );
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(getPageAdminErrorMessage(error, "Unable to seed fallback page content."));
      setStatusTone("error");
    } finally {
      setImporting(false);
    }
  };

  const handleResetDraft = () => {
    setPageDraft(pageContentToDraft(getDefaultPageContent(selectedPageKey)));
    setStatusMessage(`Reset the ${selectedDefinition.label} draft to the built-in default copy. Save when you want to publish it.`);
    setStatusTone("success");
  };

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <p className="admin-panel__eyebrow">Structured Page Editor</p>
        <div className="admin-panel__title-row">
          <h2>Editable Pages</h2>
        </div>
        <p>
          Edit the major copy blocks for Home, About, Contact, and the private Food Routine / Face Routine pages using structured sections instead of raw HTML. Published content renders on the live site or admin-only route, while drafts and scheduled pages stay inside the editor until their release state is reached.
        </p>
        <div className="admin-content-actions">
          <Button icon={<RefreshCcw size={15} />} variant="secondary" onClick={() => void loadPages(true)} loading={refreshing}>
            Refresh pages
          </Button>
          <Button icon={<UploadCloud size={15} />} variant="secondary" onClick={() => void handleImportFallbackPages()} loading={importing}>
            Seed fallback pages
          </Button>
          <a href={selectedDefinition.route} className="admin-module-card__link admin-module-card__link--inline">
            <ExternalLink size={14} />
            Open live page
          </a>
        </div>
      </section>

      <section className="admin-users__workspace admin-pages__workspace">
        <div className="admin-panel">
          <div className="admin-panel__header">
            <h2>Pages</h2>
            <p>{loading ? "Loading editable pages..." : `${pages.length} page${pages.length === 1 ? "" : "s"} available.`}</p>
          </div>
          <div className="admin-content-list">
            {loading ? (
              <div className="admin-empty-state" aria-live="polite">
                <strong>Loading editable pages</strong>
                <span>The dashboard is reading page records and fallback state.</span>
              </div>
            ) : (
              editablePages.map((page) => {
                const resolved = pages.find((item) => item.pageKey === page.key) ?? getDefaultPageContent(page.key);

                return (
                  <button
                    key={page.key}
                    type="button"
                    className={`admin-content-item ${selectedPageKey === page.key ? "is-selected" : ""}`}
                    aria-pressed={selectedPageKey === page.key}
                    onClick={() => {
                      setSelectedPageKey(page.key);
                      setSearchParams({ page: page.key });
                    }}
                  >
                    <strong>{page.label}</strong>
                    <span>{page.route}</span>
                    <small>
                      {resolved.visibility} / {resolved.status} / {resolved.source === "firestore" ? "Firestore" : "Fallback"}
                    </small>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="admin-panel-stack">
          <section className="admin-panel">
            <div className="admin-panel__header">
              <h2>{selectedDefinition.label}</h2>
              <p>{selectedDefinition.description}</p>
            </div>

            <div className="admin-content-form">
              <div className="admin-content-form-grid">
                <Input
                  label="Document Title"
                  value={pageDraft.title}
                  onChange={(event) =>
                    setPageDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  hint="Used in the Firestore pages record for this page."
                />
                <Select
                  label="Status"
                  value={pageDraft.status}
                  onChange={(event) =>
                    setPageDraft((current) => ({
                      ...current,
                      status: event.target.value as ContentStatus,
                    }))
                  }
                  options={PAGE_STATUS_OPTIONS}
                  hint="Only published pages, or scheduled pages after their release time, render on the live site."
                />
              </div>

              {pageDraft.status === "scheduled" ? (
                <Input
                  label="Scheduled Publish Time"
                  type="datetime-local"
                  value={pageDraft.scheduledAt}
                  onChange={(event) =>
                    setPageDraft((current) => ({
                      ...current,
                      scheduledAt: event.target.value,
                    }))
                  }
                  hint="When the schedule is reached, public pages will render this Firestore record automatically."
                />
              ) : null}

              <div className="admin-note-box">
                Last updated: {formatUpdatedAt(selectedPage)} {selectedPage.source === "fallback" ? " (currently falling back to built-in site copy)" : ""}
              </div>

              <div className="admin-page-section-grid">
                {pageDraft.sections.map((section, index) => (
                  <article key={section.id} className="admin-page-section-card">
                    <div className="admin-page-section-card__head">
                      <div>
                        <span>{section.label}</span>
                        <strong>{section.id}</strong>
                      </div>
                      <small>{section.type}</small>
                    </div>
                    <Input
                      label="Eyebrow"
                      value={section.eyebrow}
                      onChange={(event) =>
                        setPageDraft((current) => ({
                          ...current,
                          sections: current.sections.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, eyebrow: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <Input
                      label="Title"
                      value={section.title}
                      onChange={(event) =>
                        setPageDraft((current) => ({
                          ...current,
                          sections: current.sections.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, title: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <Textarea
                      label="Body"
                      value={section.body}
                      rows={4}
                      onChange={(event) =>
                        setPageDraft((current) => ({
                          ...current,
                          sections: current.sections.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, body: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <Textarea
                      label="Extra Lines"
                      value={section.itemsText}
                      rows={4}
                      hint="One line per additional paragraph or supporting line."
                      onChange={(event) =>
                        setPageDraft((current) => ({
                          ...current,
                          sections: current.sections.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, itemsText: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </article>
                ))}
              </div>
            </div>

            <div className="admin-users__actions admin-content-form-actions">
              <Button icon={<Save size={15} />} onClick={() => void handleSave()} loading={saving}>
                Save page
              </Button>
              <Button icon={<RotateCcw size={15} />} variant="secondary" onClick={handleResetDraft}>
                Reset to defaults
              </Button>
            </div>
          </section>

          <section className="admin-panel admin-page-preview">
            <div className="admin-panel__header">
              <div className="admin-panel__title-row">
                <Eye size={18} />
                <h2>Preview</h2>
              </div>
              <p>
                This is a structured preview of what the current draft will send to the live page once you save it.
              </p>
            </div>

            <div className="admin-page-preview-grid">
              {pageDraft.sections.map((section) => {
                const lines = parseLineList(section.itemsText);

                return (
                  <article key={section.id} className="admin-page-preview-card">
                    {section.eyebrow ? <p className="admin-panel__eyebrow">{section.eyebrow}</p> : null}
                    {section.title ? <h3>{section.title}</h3> : null}
                    {section.body ? <p>{section.body}</p> : null}
                    {lines.length ? (
                      <ul className="admin-page-preview-lines">
                        {lines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </section>

      {statusMessage ? (
        <section className="admin-panel">
          <div
            className={`admin-inline-status ${
              statusTone === "error"
                ? "is-error"
                : statusTone === "success"
                  ? "is-success"
              : ""
            }`}
            aria-live="polite"
          >
            {statusMessage}
          </div>
        </section>
      ) : null}
    </div>
  );
}
