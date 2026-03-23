import { timestampNow } from "../firebase/firestore";
import type { UserProfile } from "../types/models";
import { adminBootstrapDocument, userDocument } from "./collections";
import { getRecord, mergeRecord } from "./repository";

function isPermissionDenied(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "permission-denied" || error.code === "firestore/permission-denied")
  );
}

export async function getAdminBootstrap(uid: string) {
  return getRecord(adminBootstrapDocument(uid));
}

export async function syncUserRoleFromBootstrap(profile: UserProfile) {
  let bootstrap = null;

  try {
    bootstrap = await getAdminBootstrap(profile.uid);
  } catch (error) {
    if (isPermissionDenied(error)) {
      return profile;
    }

    throw error;
  }

  const nextRole = bootstrap?.enabled && bootstrap.role === "admin" ? "admin" : "member";

  if (profile.role === nextRole) {
    return profile;
  }

  const nextProfile = {
    role: nextRole,
    updatedAt: timestampNow(),
  } satisfies Pick<UserProfile, "role" | "updatedAt">;

  try {
    await mergeRecord(userDocument(profile.uid), nextProfile);
  } catch (error) {
    if (isPermissionDenied(error)) {
      return profile;
    }

    throw error;
  }

  return {
    ...profile,
    ...nextProfile,
  } satisfies UserProfile;
}
