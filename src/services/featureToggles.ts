import { getDocs, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { isFirebaseConfigured } from "../firebase";
import { timestampNow } from "../firebase/firestore";
import type { FeatureToggleKey, FeatureToggleRecord } from "../types/models";
import { featureToggleDocument, featureTogglesCollection } from "./collections";
import { logAdminActivity } from "./adminActivity";
import { assertCurrentUserCanAccessAdmin } from "./adminSecurity";
import { getRecord, mergeRecord } from "./repository";

interface FeatureToggleDefinition {
  label: string;
  description: string;
  enabled: boolean;
  public: boolean;
}

const featureToggleDefinitions: Record<FeatureToggleKey, FeatureToggleDefinition> = {
  stripe_purchases: {
    label: "Stripe purchases",
    description: "Controls whether the memberships page renders the live Stripe pricing-table purchase path.",
    enabled: false,
    public: true,
  },
  premium_briefings: {
    label: "Premium briefings",
    description: "Controls whether premium briefing routes stay visible on the public site while the paywalled content system is being finalized.",
    enabled: true,
    public: true,
  },
  content_exports: {
    label: "Content exports",
    description: "Controls whether admins can export a JSON backup snapshot of CMS, page, task, and toggle data from the overview screen.",
    enabled: true,
    public: false,
  },
};

function buildDefaultToggleRecord(key: FeatureToggleKey): FeatureToggleRecord {
  const now = timestampNow();
  const definition = featureToggleDefinitions[key];

  return {
    id: key,
    key,
    label: definition.label,
    description: definition.description,
    enabled: definition.enabled,
    public: definition.public,
    updatedBy: "system",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeToggleRecord(
  key: FeatureToggleKey,
  record: Partial<FeatureToggleRecord> | null | undefined,
): FeatureToggleRecord {
  const fallback = buildDefaultToggleRecord(key);

  if (!record) {
    return fallback;
  }

  return {
    ...fallback,
    ...record,
    id: key,
    key,
    label: record.label?.trim() || fallback.label,
    description: record.description?.trim() || fallback.description,
    enabled: typeof record.enabled === "boolean" ? record.enabled : fallback.enabled,
    public: typeof record.public === "boolean" ? record.public : fallback.public,
    updatedBy: record.updatedBy?.trim() || fallback.updatedBy,
    createdAt: record.createdAt ?? fallback.createdAt,
    updatedAt: record.updatedAt ?? fallback.updatedAt,
  };
}

export function getDefaultFeatureToggleState(key: FeatureToggleKey) {
  return featureToggleDefinitions[key].enabled;
}

export function getFeatureToggleDefinition(key: FeatureToggleKey) {
  return featureToggleDefinitions[key];
}

export function getFeatureToggleKeys() {
  return Object.keys(featureToggleDefinitions) as FeatureToggleKey[];
}

export async function listAdminFeatureToggles() {
  await assertCurrentUserCanAccessAdmin();

  if (!isFirebaseConfigured) {
    return getFeatureToggleKeys().map((key) => buildDefaultToggleRecord(key));
  }

  const toggles = new Map<FeatureToggleKey, FeatureToggleRecord>();
  const snapshot = await getDocs(featureTogglesCollection());

  snapshot.docs.forEach((documentSnapshot) => {
    const key = documentSnapshot.id as FeatureToggleKey;

    if (!featureToggleDefinitions[key]) {
      return;
    }

    toggles.set(key, normalizeToggleRecord(key, documentSnapshot.data()));
  });

  return getFeatureToggleKeys().map((key) => toggles.get(key) ?? buildDefaultToggleRecord(key));
}

export function subscribeAdminFeatureToggles(
  onToggles: (toggles: FeatureToggleRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    onToggles(getFeatureToggleKeys().map((key) => buildDefaultToggleRecord(key)));
    return () => undefined;
  }

  return onSnapshot(
    featureTogglesCollection(),
    (snapshot) => {
      const toggleMap = new Map<FeatureToggleKey, FeatureToggleRecord>();

      snapshot.docs.forEach((documentSnapshot) => {
        const key = documentSnapshot.id as FeatureToggleKey;

        if (!featureToggleDefinitions[key]) {
          return;
        }

        toggleMap.set(key, normalizeToggleRecord(key, documentSnapshot.data()));
      });

      onToggles(getFeatureToggleKeys().map((key) => toggleMap.get(key) ?? buildDefaultToggleRecord(key)));
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function subscribeFeatureToggleValue(
  key: FeatureToggleKey,
  onValue: (enabled: boolean) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    onValue(getDefaultFeatureToggleState(key));
    return () => undefined;
  }

  return onSnapshot(
    featureToggleDocument(key),
    (snapshot) => {
      if (!snapshot.exists()) {
        onValue(getDefaultFeatureToggleState(key));
        return;
      }

      onValue(normalizeToggleRecord(key, snapshot.data()).enabled);
    },
    (error) => {
      onValue(getDefaultFeatureToggleState(key));
      onError?.(error);
    },
  );
}

export async function saveAdminFeatureToggle(key: FeatureToggleKey, enabled: boolean) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const existing = await getRecord(featureToggleDocument(key));
  const now = timestampNow();
  const fallback = buildDefaultToggleRecord(key);

  const record: FeatureToggleRecord = {
    ...fallback,
    ...existing,
    id: key,
    key,
    enabled,
    updatedBy: currentUser.uid,
    createdAt: existing?.createdAt ?? fallback.createdAt,
    updatedAt: now,
  };

  await mergeRecord(featureToggleDocument(key), record);
  await logAdminActivity({
    actorId: currentUser.uid,
    action: "toggle",
    entityType: "feature_toggle",
    entityId: key,
    entityLabel: record.label,
    summary: `${enabled ? "Enabled" : "Disabled"} feature toggle "${record.label}".`,
  });
  return normalizeToggleRecord(key, record);
}
