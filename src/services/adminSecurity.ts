import { auth } from "../firebase/config";
import type { UserProfile } from "../types/models";
import { getUserProfile } from "./userProfiles";

export class AdminSecurityError extends Error {
  code: "admin-auth-required" | "admin-email-verification-required" | "admin-access-denied";

  constructor(
    code: "admin-auth-required" | "admin-email-verification-required" | "admin-access-denied",
    message: string,
  ) {
    super(message);
    this.name = "AdminSecurityError";
    this.code = code;
  }
}

function isActiveAdmin(profile: UserProfile | null) {
  return Boolean(profile && profile.role === "admin" && profile.status === "active");
}

export async function assertCurrentUserCanAccessAdmin() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new AdminSecurityError(
      "admin-auth-required",
      "Your admin session is no longer active. Sign in again before using admin tools.",
    );
  }

  if (!currentUser.emailVerified) {
    throw new AdminSecurityError(
      "admin-email-verification-required",
      "Verify your email address before using admin tools.",
    );
  }

  const profile = await getUserProfile(currentUser.uid);

  if (!isActiveAdmin(profile)) {
    throw new AdminSecurityError(
      "admin-access-denied",
      "This account no longer has active admin access.",
    );
  }

  return {
    currentUser,
    profile,
  };
}
