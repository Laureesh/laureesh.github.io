import { getDocs, limit, orderBy, query } from "firebase/firestore";
import { isFirebaseConfigured } from "../firebase";
import { timestampNow } from "../firebase/firestore";
import type { AdminActivityEntityType, AdminActivityRecord } from "../types/models";
import { adminActivityCollection } from "./collections";
import { assertCurrentUserCanAccessAdmin } from "./adminSecurity";
import { createRecord } from "./repository";

export interface AdminActivityInput {
  actorId: string;
  action: string;
  entityType: AdminActivityEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
}

export async function listRecentAdminActivity(limitCount = 12) {
  await assertCurrentUserCanAccessAdmin();

  if (!isFirebaseConfigured) {
    return [] as AdminActivityRecord[];
  }

  const snapshot = await getDocs(
    query(adminActivityCollection(), orderBy("createdAt", "desc"), limit(limitCount)),
  );

  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));
}

export async function logAdminActivity(input: AdminActivityInput) {
  if (!isFirebaseConfigured) {
    return null;
  }

  const now = timestampNow();

  return createRecord(adminActivityCollection(), {
    actorId: input.actorId,
    action: input.action.trim(),
    entityType: input.entityType,
    entityId: input.entityId?.trim() || null,
    entityLabel: input.entityLabel?.trim() || null,
    summary: input.summary.trim(),
    createdAt: now,
    updatedAt: now,
  });
}
