import type { User, UserInfo } from "firebase/auth";

function getFirstProfileValue(
  user: User,
  key: "displayName" | "photoURL",
) {
  const directValue = user[key];

  if (typeof directValue === "string" && directValue.trim().length > 0) {
    return directValue;
  }

  const providerValue = user.providerData
    .map((profile) => profile[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);

  return providerValue ?? null;
}

export function getAuthDisplayName(user: User) {
  return getFirstProfileValue(user, "displayName") ?? user.email ?? "User";
}

export function getAuthPhotoURL(user: User | UserInfo | null | undefined) {
  if (!user) {
    return null;
  }

  const directValue = user.photoURL;

  if (typeof directValue === "string" && directValue.trim().length > 0) {
    return directValue;
  }

  if ("providerData" in user) {
    const providerValue = user.providerData
      .map((profile) => profile.photoURL)
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);

    return providerValue ?? null;
  }

  return null;
}
