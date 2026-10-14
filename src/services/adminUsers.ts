import { getDocs, orderBy, query } from "firebase/firestore";
import { timestampNow } from "../firebase/firestore";
import type { UserRole, UserStatus } from "../types/models";
import { logAdminActivity } from "./adminActivity";
import { portfolioDocument, userDocument, usersCollection } from "./collections";
import { assertCurrentUserCanAccessAdmin } from "./adminSecurity";
import { getRecord, mergeRecord } from "./repository";

interface ManagedUserUpdates {
  role: UserRole;
  status: UserStatus;
}

export async function listAdminUsers() {
  await assertCurrentUserCanAccessAdmin();
  const snapshot = await getDocs(query(usersCollection(), orderBy("updatedAt", "desc")));
  return snapshot.docs.map((document) => document.data());
}

export async function updateManagedUser(uid: string, updates: ManagedUserUpdates) {
  const { currentUser } = await assertCurrentUserCanAccessAdmin();
  const existing = await getRecord(userDocument(uid));
  const hideFromCommunity = updates.status !== "active";

  await mergeRecord(userDocument(uid), {
    ...updates,
    ...(hideFromCommunity ? { isPublic: false } : {}),
    updatedAt: timestampNow(),
  });

  if (hideFromCommunity) {
    const portfolio = await getRecord(portfolioDocument(uid));

    if (portfolio) {
      await mergeRecord(portfolioDocument(uid), {
        isPublic: false,
        updatedAt: timestampNow(),
      });
    }
  }

  await logAdminActivity({
    actorId: currentUser.uid,
    action: "update",
    entityType: "user",
    entityId: uid,
    entityLabel: existing?.displayName ?? existing?.email ?? uid,
    summary: `Updated user access for "${existing?.displayName ?? existing?.email ?? uid}" to ${updates.role} / ${updates.status}.`,
  });

  return getRecord(userDocument(uid));
}

export async function removeManagedUserAccess(uid: string) {
  return updateManagedUser(uid, {
    role: "member",
    status: "banned",
  });
}
