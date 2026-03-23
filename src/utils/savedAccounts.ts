import type { User } from "firebase/auth";
import { getAuthDisplayName, getAuthPhotoURL } from "./authUserProfile";

const SAVED_ACCOUNTS_KEY = "portfolio-saved-accounts";

export interface SavedAccount {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  providerIds: string[];
  lastUsedAt: number;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function matchesSavedAccount(account: SavedAccount, uid: string, email: string | null) {
  return account.uid === uid || (Boolean(account.email) && account.email === email);
}

function sortAccounts(accounts: SavedAccount[]) {
  return [...accounts].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

function normalizeSavedAccount(account: SavedAccount): SavedAccount {
  return {
    uid: account.uid,
    email: account.email ?? null,
    displayName: account.displayName || account.email || "User",
    photoURL: account.photoURL ?? null,
    providerIds: Array.from(new Set(account.providerIds.filter(Boolean))),
    lastUsedAt: Number.isFinite(account.lastUsedAt) ? account.lastUsedAt : Date.now(),
  };
}

export function readSavedAccounts(): SavedAccount[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(SAVED_ACCOUNTS_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortAccounts(
      parsed
        .filter((item): item is SavedAccount => Boolean(item && typeof item === "object" && typeof item.uid === "string"))
        .map((item) => normalizeSavedAccount(item)),
    );
  } catch {
    return [];
  }
}

function writeSavedAccounts(accounts: SavedAccount[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    SAVED_ACCOUNTS_KEY,
    JSON.stringify(mergeSavedAccounts(accounts)),
  );
}

export function buildSavedAccount(user: User): SavedAccount {
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: getAuthDisplayName(user),
    photoURL: getAuthPhotoURL(user),
    providerIds: Array.from(
      new Set(
        user.providerData
          .map((profile) => profile.providerId)
          .filter((providerId): providerId is string => typeof providerId === "string" && providerId.length > 0),
      ),
    ),
    lastUsedAt: Date.now(),
  };
}

export function hasSavedAccount(user: User, accounts = readSavedAccounts()) {
  return accounts.some((account) => matchesSavedAccount(account, user.uid, user.email ?? null));
}

export function mergeSavedAccounts(accounts: SavedAccount[]) {
  const merged = accounts.reduce<SavedAccount[]>((list, rawAccount) => {
    const nextAccount = normalizeSavedAccount(rawAccount);
    const existingIndex = list.findIndex((account) =>
      matchesSavedAccount(account, nextAccount.uid, nextAccount.email),
    );

    if (existingIndex === -1) {
      list.push(nextAccount);
      return list;
    }

    const existingAccount = list[existingIndex];

    list[existingIndex] = normalizeSavedAccount({
      ...existingAccount,
      ...nextAccount,
      displayName: nextAccount.displayName || existingAccount.displayName,
      photoURL: nextAccount.photoURL ?? existingAccount.photoURL,
      providerIds: Array.from(new Set([...existingAccount.providerIds, ...nextAccount.providerIds])),
      lastUsedAt: Math.max(existingAccount.lastUsedAt, nextAccount.lastUsedAt),
    });

    return list;
  }, []);

  return sortAccounts(merged);
}

export function upsertSavedAccount(user: User) {
  const nextAccount = buildSavedAccount(user);
  const accounts = mergeSavedAccounts([...readSavedAccounts(), nextAccount]);

  writeSavedAccounts(accounts);
  return accounts;
}

export function removeSavedAccount(accountToRemove: SavedAccount) {
  const nextAccounts = readSavedAccounts().filter(
    (account) =>
      account.uid !== accountToRemove.uid &&
      (!account.email || !accountToRemove.email || account.email !== accountToRemove.email),
  );

  writeSavedAccounts(nextAccounts);
  return nextAccounts;
}
