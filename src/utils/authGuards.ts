import type { User } from "firebase/auth";
import type { UserProfile, UserRole } from "../types/models";

export type RoleRequirement = UserRole | UserRole[];

export function isAuthenticated(user: User | null): user is User {
  return Boolean(user);
}

export function hasRole(userProfile: Pick<UserProfile, "role"> | null | undefined, role: UserRole) {
  return userProfile?.role === role;
}

export function hasAnyRole(
  userProfile: Pick<UserProfile, "role"> | null | undefined,
  roles: UserRole[],
) {
  return Boolean(userProfile && roles.includes(userProfile.role));
}

export function hasActiveStatus(
  userProfile: Pick<UserProfile, "status"> | null | undefined,
) {
  return userProfile?.status === "active";
}

export function canAccessRole(
  user: User | null,
  userProfile: Pick<UserProfile, "role" | "status"> | null | undefined,
  requiredRole?: RoleRequirement,
) {
  if (!isAuthenticated(user)) {
    return false;
  }

  if (!hasActiveStatus(userProfile)) {
    return false;
  }

  if (!requiredRole) {
    return true;
  }

  return Array.isArray(requiredRole)
    ? hasAnyRole(userProfile, requiredRole)
    : hasRole(userProfile, requiredRole);
}

export function shouldRedirectAuthenticated(user: User | null) {
  return isAuthenticated(user);
}
