import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, SlidersHorizontal } from "lucide-react";
import { Button, Checkbox } from "../../components/ui";
import type { FeatureToggleRecord } from "../../types/models";
import { saveAdminFeatureToggle, subscribeAdminFeatureToggles } from "../../services/featureToggles";

type StatusTone = "error" | "success" | null;

function getFeatureToggleErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    (error.code === "permission-denied" || error.code === "firestore/permission-denied")
  ) {
    return "Firestore blocked the feature-toggle update. Publish the latest rules and confirm this account still has active admin access.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function formatUpdatedAt(value: FeatureToggleRecord["updatedAt"] | null | undefined) {
  if (!value || typeof value.toDate !== "function") {
    return "Not saved yet";
  }

  return value.toDate().toLocaleString();
}

export default function AdminFeatureTogglesPage() {
  const [toggles, setToggles] = useState<FeatureToggleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>(null);

  useEffect(() => {
    setLoading(true);
    setStatusMessage(null);
    setStatusTone(null);

    const unsubscribe = subscribeAdminFeatureToggles(
      (nextToggles) => {
        setToggles(nextToggles);
        setLoading(false);
      },
      (error) => {
        setStatusMessage(getFeatureToggleErrorMessage(error, "Unable to load feature toggles right now."));
        setStatusTone("error");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [refreshTick]);

  const metrics = useMemo(
    () => ({
      total: toggles.length,
      enabled: toggles.filter((toggle) => toggle.enabled).length,
      public: toggles.filter((toggle) => toggle.public).length,
    }),
    [toggles],
  );

  const handleToggle = async (toggle: FeatureToggleRecord, enabled: boolean) => {
    setSavingKey(toggle.key);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      await saveAdminFeatureToggle(toggle.key, enabled);
      setStatusMessage(`${enabled ? "Enabled" : "Disabled"} ${toggle.label}.`);
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(getFeatureToggleErrorMessage(error, "Unable to save this feature toggle."));
      setStatusTone("error");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <div className="admin-panel__header">
          <p className="admin-panel__eyebrow">Operational Controls</p>
          <div className="admin-panel__title-row">
            <SlidersHorizontal size={18} />
            <h2>Feature Toggles</h2>
          </div>
          <p>
            Turn launch-critical features on and off without redeploying the frontend. Public toggles
            are readable by the site, while admin-only toggles stay internal.
          </p>
        </div>

        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Toggles</span>
            <strong>{metrics.total}</strong>
            <span>Firestore-backed rollout controls</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Enabled</span>
            <strong>{metrics.enabled}</strong>
            <span>Currently active features</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Public</span>
            <strong>{metrics.public}</strong>
            <span>Readable from public routes</span>
          </div>
        </div>

        <div className="admin-content-actions">
          <Button
            variant="secondary"
            icon={<RefreshCcw size={15} />}
            onClick={() => setRefreshTick((current) => current + 1)}
          >
            Refresh toggles
          </Button>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h2>Toggle list</h2>
          <p>{loading ? "Loading toggle state..." : `${toggles.length} toggle${toggles.length === 1 ? "" : "s"} available.`}</p>
        </div>

        {loading ? (
          <div className="admin-empty-state" aria-live="polite">
            <strong>Loading feature toggles</strong>
            <span>The dashboard is reading the latest rollout state from Firestore.</span>
          </div>
        ) : (
          <div className="admin-toggle-grid">
            {toggles.map((toggle) => (
              <article key={toggle.key} className="admin-toggle-card">
                <div className="admin-toggle-card__head">
                  <div>
                    <strong>{toggle.label}</strong>
                    <p>{toggle.description}</p>
                  </div>
                  <span className={`admin-status-pill ${toggle.enabled ? "is-active" : "is-member"}`}>
                    {toggle.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="admin-toggle-card__meta">
                  <span>{toggle.public ? "Public read" : "Admin only"}</span>
                  <span>Updated {formatUpdatedAt(toggle.updatedAt)}</span>
                </div>
                <Checkbox
                  label={toggle.enabled ? "Feature is live" : "Feature is paused"}
                  description={
                    toggle.public
                      ? "This toggle can be read by public routes with a Firestore fallback."
                      : "This toggle only affects internal admin tooling."
                  }
                  checked={toggle.enabled}
                  disabled={savingKey === toggle.key}
                  onChange={(event) => void handleToggle(toggle, event.target.checked)}
                />
              </article>
            ))}
          </div>
        )}
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
