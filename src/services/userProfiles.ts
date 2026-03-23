import type { User } from "firebase/auth";
import { timestampNow } from "../firebase/firestore";
import { userDocument } from "./collections";
import type { UserProfile } from "../types/models";
import { getAuthDisplayName, getAuthPhotoURL } from "../utils/authUserProfile";
import { getRecord, mergeRecord, setRecord } from "./repository";

function buildDefaultSocialLinks() {
  return {
    github: null,
    linkedin: null,
    website: null,
    twitter: null,
    youtube: null,
    email: null,
  };
}

function buildDefaultPreferences() {
  return {
    language: "en",
    notifications: {
      accountActivity: true,
      securityAlerts: true,
      productUpdates: true,
      marketingEmails: false,
    },
    security: {
      loginAlerts: true,
      trustedDevicesOnly: false,
    },
  } satisfies UserProfile["preferences"];
}

function buildDefaultMembership() {
  return {
    planId: "free",
    planName: "Free",
    status: "inactive",
    billingInterval: "monthly",
    autoRenew: false,
  } satisfies UserProfile["membership"];
}

export function buildUserProfile(user: User, displayName: string): UserProfile {
  const now = timestampNow();

  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName,
    phoneNumber: user.phoneNumber ?? null,
    photoURL: getAuthPhotoURL(user),
    avatarStoragePath: null,
    role: "member",
    status: "active",
    bio: "",
    headline: "",
    username: null,
    location: null,
    skills: [],
    isPublic: true,
    socialLinks: {
      ...buildDefaultSocialLinks(),
      email: user.email ?? null,
    },
    preferences: buildDefaultPreferences(),
    membership: buildDefaultMembership(),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeUserProfile(user: User, profile: UserProfile) {
  const baseProfile = buildUserProfile(user, profile.displayName ?? getAuthDisplayName(user));

  return {
    ...baseProfile,
    ...profile,
    uid: user.uid,
    email: profile.email || user.email || "",
    displayName: profile.displayName || getAuthDisplayName(user),
    phoneNumber: profile.phoneNumber ?? user.phoneNumber ?? null,
    photoURL: profile.photoURL ?? getAuthPhotoURL(user),
    avatarStoragePath: profile.avatarStoragePath ?? null,
    socialLinks: {
      ...baseProfile.socialLinks,
      ...profile.socialLinks,
      email: profile.socialLinks?.email ?? profile.email ?? user.email ?? null,
    },
    preferences: {
      ...baseProfile.preferences,
      ...profile.preferences,
      notifications: {
        ...baseProfile.preferences.notifications,
        ...profile.preferences?.notifications,
      },
      security: {
        ...baseProfile.preferences.security,
        ...profile.preferences?.security,
      },
    },
    membership: {
      ...baseProfile.membership,
      ...profile.membership,
    },
    createdAt: profile.createdAt ?? baseProfile.createdAt,
    updatedAt: profile.updatedAt ?? baseProfile.updatedAt,
  } satisfies UserProfile;
}

function shouldBackfillUserProfile(profile: UserProfile, normalizedProfile: UserProfile) {
  return (
    typeof profile.status !== "string" ||
    typeof profile.phoneNumber === "undefined" ||
    typeof profile.avatarStoragePath === "undefined" ||
    typeof profile.headline !== "string" ||
    typeof profile.username === "undefined" ||
    typeof profile.location === "undefined" ||
    !Array.isArray(profile.skills) ||
    typeof profile.isPublic !== "boolean" ||
    !profile.socialLinks ||
    typeof profile.socialLinks !== "object" ||
    !profile.preferences ||
    typeof profile.preferences !== "object" ||
    !profile.preferences.notifications ||
    typeof profile.preferences.notifications !== "object" ||
    !profile.preferences.security ||
    typeof profile.preferences.security !== "object" ||
    !profile.membership ||
    typeof profile.membership !== "object" ||
    profile.email !== normalizedProfile.email ||
    profile.displayName !== normalizedProfile.displayName ||
    profile.photoURL !== normalizedProfile.photoURL
  );
}

export async function getUserProfile(uid: string) {
  return getRecord(userDocument(uid));
}

export async function createUserProfile(user: User, displayName: string, phoneNumber?: string | null) {
  const profile = {
    ...buildUserProfile(user, displayName),
    phoneNumber: phoneNumber ?? user.phoneNumber ?? null,
  };
  await setRecord(userDocument(user.uid), profile);
  return profile;
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>) {
  const nextUpdates = {
    ...updates,
    updatedAt: timestampNow(),
  };

  await mergeRecord(userDocument(uid), nextUpdates);
  return getUserProfile(uid);
}

export async function ensureUserProfile(user: User) {
  const existingProfile = await getUserProfile(user.uid);

  if (existingProfile) {
    const normalizedProfile = normalizeUserProfile(user, existingProfile);

    if (shouldBackfillUserProfile(existingProfile, normalizedProfile)) {
      await mergeRecord(userDocument(user.uid), normalizedProfile);
    }

    return normalizedProfile;
  }

  return createUserProfile(user, getAuthDisplayName(user));
}
