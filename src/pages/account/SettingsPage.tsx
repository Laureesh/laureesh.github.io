import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useDisplayLanguage } from "../../contexts/DisplayLanguageContext";
import { updateUserProfile } from "../../services/userProfiles";
import { Button, Checkbox } from "../../components/ui";
import AccountPageLayout from "./AccountPageLayout";

export default function SettingsPage() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { getLanguageLabel, t } = useDisplayLanguage();
  const [notifications, setNotifications] = useState(
    userProfile?.preferences.notifications ?? {
      accountActivity: true,
      securityAlerts: true,
      productUpdates: true,
      marketingEmails: false,
    },
  );
  const [isPublic, setIsPublic] = useState(userProfile?.isPublic ?? true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    setNotifications(userProfile.preferences.notifications);
    setIsPublic(userProfile.isPublic);
  }, [userProfile]);

  if (!user || !userProfile) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    setStatusType(null);

    try {
      await updateUserProfile(user.uid, {
        isPublic,
        preferences: {
          ...userProfile.preferences,
          notifications,
        },
      });
      await refreshUserProfile();
      setStatus(t("settingsSaved"));
      setStatusType("success");
    } catch {
      setStatus(t("unableToSaveSettings"));
      setStatusType("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountPageLayout
      eyebrow={t("preferences")}
      title={t("settings")}
      description={t("settingsDescription")}
      sidebar={(
        <>
          <div className="account-panel">
            <div className="account-panel-header">
              <h3>{t("currentPreferences")}</h3>
            </div>
            <ul className="account-summary-list">
              <li className="account-summary-row"><strong>{t("language")}</strong><span>{getLanguageLabel(userProfile.preferences.language)}</span></li>
              <li className="account-summary-row"><strong>{t("visibility")}</strong><span>{isPublic ? t("public") : t("private")}</span></li>
              <li className="account-summary-row"><strong>{t("securityAlerts")}</strong><span>{notifications.securityAlerts ? t("on") : t("off")}</span></li>
              <li className="account-summary-row"><strong>{t("marketingEmails")}</strong><span>{notifications.marketingEmails ? t("on") : t("off")}</span></li>
            </ul>
          </div>

          <div className="account-panel">
            <div className="account-panel-header">
              <h3>{t("languageControl")}</h3>
              <p>{t("languageControlDescription")}</p>
            </div>
            <div className="account-chip-row">
              <span className="account-chip">{getLanguageLabel(userProfile.preferences.language)}</span>
            </div>
          </div>
        </>
      )}
    >
      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>{t("alertsAndNotifications")}</h2>
          </div>
          <p>{t("alertsAndNotificationsDescription")}</p>
        </div>

        <div className="account-toggle-grid">
          <Checkbox
            label={t("accountActivityEmails")}
            description={t("accountActivityEmailsDescription")}
            checked={notifications.accountActivity}
            onChange={(event) =>
              setNotifications((current) => ({ ...current, accountActivity: event.target.checked }))
            }
          />
          <Checkbox
            label={t("securityAlerts")}
            description={t("securityAlertsDescription")}
            checked={notifications.securityAlerts}
            onChange={(event) =>
              setNotifications((current) => ({ ...current, securityAlerts: event.target.checked }))
            }
          />
          <Checkbox
            label={t("productUpdates")}
            description={t("productUpdatesDescription")}
            checked={notifications.productUpdates}
            onChange={(event) =>
              setNotifications((current) => ({ ...current, productUpdates: event.target.checked }))
            }
          />
          <Checkbox
            label={t("marketingEmails")}
            description={t("marketingEmailsDescription")}
            checked={notifications.marketingEmails}
            onChange={(event) =>
              setNotifications((current) => ({ ...current, marketingEmails: event.target.checked }))
            }
          />
        </div>
      </div>

      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>{t("visibilityAndExperience")}</h2>
          </div>
          <p>{t("visibilityAndExperienceDescription")}</p>
        </div>

        <div className="account-toggle-grid">
          <Checkbox
            label={t("makeProfileVisible")}
            description={t("makeProfileVisibleDescription")}
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
          />
        </div>

        <div className="account-actions">
          <Button onClick={() => void handleSave()} loading={saving}>{t("saveSettings")}</Button>
          {status ? (
            <span className={`account-status-text ${statusType === "error" ? "is-error" : statusType === "success" ? "is-success" : ""}`}>
              {status}
            </span>
          ) : null}
        </div>
      </div>
    </AccountPageLayout>
  );
}
