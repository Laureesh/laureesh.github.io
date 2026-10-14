import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  Download,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import type { AdminActivityRecord } from "../../types/models";
import {
  buildAdminBackupSnapshot,
  getAdminOverviewData,
  logAdminActivity,
  type AdminOverviewData,
} from "../../services";
import { listRecentAdminActivity } from "../../services/adminActivity";
import { subscribeAdminFeatureToggles } from "../../services/featureToggles";

type StatusTone = "error" | "success" | null;

function getOverviewErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    (error.code === "permission-denied" || error.code === "firestore/permission-denied")
  ) {
    return "Firestore blocked the admin overview. Publish the latest rules and confirm this account still has active admin access.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function formatActivityTimestamp(value: AdminActivityRecord["createdAt"] | null | undefined) {
  if (!value || typeof value.toDate !== "function") {
    return "Just now";
  }

  return value.toDate().toLocaleString();
}

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboardHome() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [activity, setActivity] = useState<AdminActivityRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>(null);
  const [contentExportsEnabled, setContentExportsEnabled] = useState(true);

  const loadOverview = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setStatusMessage(null);
    setStatusTone(null);

    try {
      const [nextOverview, nextActivity] = await Promise.all([
        getAdminOverviewData(),
        listRecentAdminActivity(10),
      ]);

      setOverview(nextOverview);
      setActivity(nextActivity);
    } catch (error) {
      setStatusMessage(getOverviewErrorMessage(error, "Unable to load the admin overview right now."));
      setStatusTone("error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAdminFeatureToggles(
      (toggles) => {
        const exportToggle = toggles.find((toggle) => toggle.key === "content_exports");
        setContentExportsEnabled(exportToggle?.enabled ?? true);
      },
      () => {
        setContentExportsEnabled(true);
      },
    );

    return unsubscribe;
  }, []);

  const filteredResults = useMemo(() => {
    if (!overview) {
      return [];
    }

    const normalizedQuery = search.trim().toLowerCase();

    if (!normalizedQuery) {
      return overview.searchIndex.slice(0, 8);
    }

    return overview.searchIndex
      .filter((item) => {
        const haystack = `${item.title} ${item.subtitle} ${item.status} ${item.type}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 10);
  }, [overview, search]);

  const handleExport = async () => {
    if (!user?.uid) {
      return;
    }

    setExporting(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const snapshot = await buildAdminBackupSnapshot();
      downloadJsonFile(`admin-backup-${new Date().toISOString().slice(0, 10)}.json`, snapshot);
      await logAdminActivity({
        actorId: user.uid,
        action: "export",
        entityType: "export",
        entityId: "content-backup",
        entityLabel: "Content backup",
        summary: "Exported a JSON backup snapshot from the admin overview.",
      });
      setStatusMessage("Downloaded a JSON backup snapshot for content, pages, tasks, and feature toggles.");
      setStatusTone("success");
      await loadOverview(true);
    } catch (error) {
      setStatusMessage(getOverviewErrorMessage(error, "Unable to export a backup snapshot right now."));
      setStatusTone("error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <div className="admin-panel__header">
          <div className="admin-panel__title-row">
            <ShieldCheck size={18} />
            <h2>Operations Overview</h2>
          </div>
          <p>
            This is the live admin summary for content, user access, tasks, feature flags, and recent
            admin changes. It is meant to answer what changed, what is pending, and what is safe to
            ship next.
          </p>
        </div>

        <div className="admin-content-actions">
          <Button
            variant="secondary"
            icon={<RefreshCcw size={15} />}
            onClick={() => void loadOverview(true)}
            loading={refreshing}
          >
            Refresh overview
          </Button>
          <Button
            icon={<Download size={15} />}
            onClick={() => void handleExport()}
            loading={exporting}
            disabled={!contentExportsEnabled}
          >
            Export backup
          </Button>
        </div>

        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Users</span>
            <strong>{overview?.users.total ?? 0}</strong>
            <span>{overview ? `${overview.users.admins} admins / ${overview.users.members} members` : "Loading user mix..."}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Blog Pipeline</span>
            <strong>{overview?.blogs.total ?? 0}</strong>
            <span>{overview ? `${overview.blogs.draft ?? 0} drafts / ${overview.blogs.scheduled ?? 0} scheduled` : "Loading content state..."}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Pages</span>
            <strong>{overview?.pages.total ?? 0}</strong>
            <span>{overview ? `${overview.pages.published ?? 0} live / ${overview.pages.private ?? 0} private` : "Loading page state..."}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Tasks</span>
            <strong>{overview?.tasks.total ?? 0}</strong>
            <span>{overview ? `${overview.tasks.todo} to do / ${overview.tasks.inProgress} in progress` : "Loading task board..."}</span>
          </div>
        </div>
      </section>

      <section className="admin-overview-grid">
        <section className="admin-panel">
          <div className="admin-panel__header">
            <div className="admin-panel__title-row">
              <Search size={18} />
              <h2>Search content</h2>
            </div>
            <p>Search across blogs, pages, links, projects, and tasks, then jump into the right admin screen.</p>
          </div>

          <Input
            label="Search query"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles, slugs, routes, or status..."
          />

          <div className="admin-overview-search-results" aria-live="polite">
            {loading ? (
              <div className="admin-empty-state">
                <strong>Loading the search index</strong>
                <span>The overview is building a cross-content search set from Firestore.</span>
              </div>
            ) : filteredResults.length ? (
              filteredResults.map((item) => (
                <Link key={item.id} to={item.path} className="admin-overview-search-result">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                    <small>{item.type} · {item.status}</small>
                  </div>
                  <ArrowRight size={14} />
                </Link>
              ))
            ) : (
              <div className="admin-empty-state">
                <strong>No matching admin records</strong>
                <span>Try a title, slug, route key, or status label instead.</span>
              </div>
            )}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <div className="admin-panel__title-row">
              <Activity size={18} />
              <h2>Recent admin activity</h2>
            </div>
            <p>High-value changes are logged here so the admin area has an operational audit trail.</p>
          </div>

          {loading ? (
            <div className="admin-empty-state">
              <strong>Loading activity log</strong>
              <span>The dashboard is reading recent admin writes from Firestore.</span>
            </div>
          ) : activity.length ? (
            <div className="admin-activity-list">
              {activity.map((entry) => (
                <article key={entry.id ?? `${entry.entityType}-${entry.createdAt?.toMillis?.() ?? entry.summary}`} className="admin-activity-item">
                  <div className="admin-activity-item__header">
                    <strong>{entry.summary}</strong>
                    <span>{formatActivityTimestamp(entry.createdAt)}</span>
                  </div>
                  <small>{entry.entityType} · {entry.action}{entry.entityLabel ? ` · ${entry.entityLabel}` : ""}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>No admin activity yet</strong>
              <span>Once admins save content, move tasks, or flip toggles, the log will show up here.</span>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <div className="admin-panel__title-row">
              <CalendarClock size={18} />
              <h2>Publishing pipeline</h2>
            </div>
            <p>Drafts and scheduled work should be obvious before anything unexpectedly goes live.</p>
          </div>

          <div className="admin-overview-list">
            <div className="admin-overview-list__row">
              <strong>Blog drafts</strong>
              <span>{overview?.blogs.draft ?? 0}</span>
            </div>
            <div className="admin-overview-list__row">
              <strong>Blog scheduled</strong>
              <span>{overview?.blogs.scheduled ?? 0}</span>
            </div>
            <div className="admin-overview-list__row">
              <strong>Page drafts</strong>
              <span>{overview?.pages.draft ?? 0}</span>
            </div>
            <div className="admin-overview-list__row">
              <strong>Page scheduled</strong>
              <span>{overview?.pages.scheduled ?? 0}</span>
            </div>
            <div className="admin-overview-list__row">
              <strong>Private pages</strong>
              <span>{overview?.pages.private ?? 0}</span>
            </div>
          </div>

          <div className="admin-overview-quick-links">
            <Link to="/admin-dashboard/content?section=blogs" className="admin-module-card__link admin-module-card__link--inline">
              Open content editor
            </Link>
            <Link to="/admin-dashboard/pages" className="admin-module-card__link admin-module-card__link--inline">
              Open page editor
            </Link>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <div className="admin-panel__title-row">
              <SlidersHorizontal size={18} />
              <h2>Launch controls</h2>
            </div>
            <p>Feature toggles are separated into public and admin-only controls so staged rollouts stay intentional.</p>
          </div>

          <div className="admin-overview-list">
            <div className="admin-overview-list__row">
              <strong>Toggle count</strong>
              <span>{overview?.featureToggles.total ?? 0}</span>
            </div>
            <div className="admin-overview-list__row">
              <strong>Enabled</strong>
              <span>{overview?.featureToggles.enabled ?? 0}</span>
            </div>
            <div className="admin-overview-list__row">
              <strong>Publicly readable</strong>
              <span>{overview?.featureToggles.public ?? 0}</span>
            </div>
            <div className="admin-overview-list__row">
              <strong>Exports</strong>
              <span>{contentExportsEnabled ? "On" : "Off"}</span>
            </div>
          </div>

          <Link to="/admin-dashboard/feature-toggles" className="admin-module-card__link admin-module-card__link--inline">
            Manage feature toggles
            <ArrowRight size={14} />
          </Link>
        </section>
      </section>

      {statusMessage ? (
        <section className="admin-panel">
          <div
            className={`admin-inline-status ${
              statusTone === "error" ? "is-error" : statusTone === "success" ? "is-success" : ""
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
