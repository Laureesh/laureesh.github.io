import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { ADMIN_IDLE_TIMEOUT_MINUTES, ADMIN_IDLE_TIMEOUT_MS } from "../config/security";
import { auth } from "../firebase/config";
import {
  createGoogleProvider,
  enablePersistentAuthSession,
  setAuthSessionPersistence,
} from "../firebase/auth";
import { syncUserRoleFromBootstrap } from "../services/adminBootstrap";
import { createUserProfile, ensureUserProfile } from "../services/userProfiles";
import {
  getSubscriptionAccessState,
  subscribeToUserSubscription,
  type SubscriptionAccessState,
} from "../services/subscriptions";
import type { SubscriptionRecord } from "../types/models";
import type { UserProfile, UserRole } from "../types/user";
import type { SavedAccount } from "../utils/savedAccounts";
import { mergeSavedAccounts, readSavedAccounts, upsertSavedAccount } from "../utils/savedAccounts";
import { hasActiveStatus, hasRole } from "../utils/authGuards";

function getAuthErrorMessage(error: unknown, fallbackMessage: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    if (error.code === "permission-denied" || error.code === "firestore/permission-denied") {
      return "Firebase Auth succeeded, but Firestore blocked access to your user profile. Deploy Firestore rules that allow a signed-in user to read and write users/{uid}.";
    }

    if (error.code === "auth/popup-closed-by-user") {
      return "Google sign-in was canceled before it finished.";
    }

    if (error.code === "auth/popup-blocked") {
      return "The sign-in popup was blocked by the browser. Allow popups for this site and try again.";
    }

    if (error.code === "auth/too-many-requests") {
      return "Too many requests were made too quickly. Wait a moment and try again.";
    }

    if (
      error.code === "auth/invalid-continue-uri" ||
      error.code === "auth/unauthorized-continue-uri"
    ) {
      return "Firebase rejected the verification link target. Add this site's domain to Firebase Authentication > Settings > Authorized domains.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  subscription: SubscriptionRecord | null;
  subscriptionLoading: boolean;
  subscriptionState: SubscriptionAccessState;
  savedAccounts: SavedAccount[];
  loading: boolean;
  error: string | null;
  adminSessionTimeRemainingMs: number | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPremiumAccess: boolean;
  hasCreatorAccess: boolean;
  hasProAccess: boolean;
  role: UserRole | null;
  login: (
    email: string,
    password: string,
    options?: {
      rememberSession?: boolean;
    },
  ) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    options?: {
      phoneNumber?: string | null;
    },
  ) => Promise<void>;
  loginWithGoogle: (
    options?: {
      loginHint?: string | null;
      forceAccountSelection?: boolean;
      rememberSession?: boolean;
    },
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  refreshAuthUser: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => readSavedAccounts());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminSessionTimeRemainingMs, setAdminSessionTimeRemainingMs] = useState<number | null>(null);
  const adminSessionTimeoutRef = useRef<number | null>(null);
  const adminSessionDeadlineRef = useRef<number | null>(null);

  const refreshSavedAccounts = useCallback(() => {
    setSavedAccounts(mergeSavedAccounts(readSavedAccounts()));
  }, []);

  const syncSavedAccountsForUser = useCallback((currentUser: User | null) => {
    if (!currentUser) {
      refreshSavedAccounts();
      return;
    }

    setSavedAccounts(upsertSavedAccount(currentUser));
  }, [refreshSavedAccounts]);

  const loadAuthorizedUserProfile = useCallback(async (currentUser: User) => {
    const ensuredProfile = await ensureUserProfile(currentUser);
    return syncUserRoleFromBootstrap(ensuredProfile);
  }, []);

  const refreshUserProfile = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setUserProfile(null);
      refreshSavedAccounts();
      return;
    }

    try {
      const profile = await loadAuthorizedUserProfile(currentUser);
      setUserProfile(profile);
      syncSavedAccountsForUser(currentUser);
    } catch {
      setUserProfile(null);
    }
  }, [loadAuthorizedUserProfile, refreshSavedAccounts, syncSavedAccountsForUser]);

  const refreshAuthUser = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setUser(null);
      setUserProfile(null);
      refreshSavedAccounts();
      return;
    }

    await reload(currentUser);
    setUser(auth.currentUser);
    await refreshUserProfile();
  }, [refreshSavedAccounts, refreshUserProfile]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => undefined;

    void (async () => {
      try {
        await enablePersistentAuthSession();
      } catch {
        // Keep the app usable even if persistence cannot be updated.
      }

      if (!isMounted) {
        return;
      }

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        void (async () => {
          if (!isMounted) {
            return;
          }

          setUser(firebaseUser);

          if (!firebaseUser) {
            setUserProfile(null);
            setAdminSessionTimeRemainingMs(null);
            adminSessionDeadlineRef.current = null;
            refreshSavedAccounts();
            setLoading(false);
            return;
          }

          try {
            const profile = await loadAuthorizedUserProfile(firebaseUser);

            if (isMounted) {
              setUserProfile(profile);
              syncSavedAccountsForUser(firebaseUser);
            }
          } catch {
            if (isMounted) {
              setUserProfile(null);
            }
          }

          if (isMounted) {
            setLoading(false);
          }
        })();
      });
    })();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadAuthorizedUserProfile, refreshSavedAccounts, syncSavedAccountsForUser]);

  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null);
      setSubscriptionLoading(false);
      setAdminSessionTimeRemainingMs(null);
      adminSessionDeadlineRef.current = null;
      return () => undefined;
    }

    setSubscriptionLoading(true);

    return subscribeToUserSubscription(
      user.uid,
      (nextSubscription) => {
        setSubscription(nextSubscription);
        setSubscriptionLoading(false);
      },
      () => {
        setSubscription(null);
        setSubscriptionLoading(false);
      },
    );
  }, [user?.uid]);

  useEffect(() => {
    if (adminSessionTimeoutRef.current !== null) {
      window.clearTimeout(adminSessionTimeoutRef.current);
      adminSessionTimeoutRef.current = null;
    }
    adminSessionDeadlineRef.current = null;
    setAdminSessionTimeRemainingMs(null);

    if (
      loading
      || !user
      || !userProfile
      || userProfile.role !== "admin"
      || !hasActiveStatus(userProfile)
    ) {
      return () => undefined;
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "focus",
    ];

    const expireAdminSession = () => {
      void (async () => {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          return;
        }

        setError(
          `Admin session timed out after ${ADMIN_IDLE_TIMEOUT_MINUTES} minutes of inactivity. Sign in again to reopen protected tools.`,
        );
        adminSessionDeadlineRef.current = null;
        setAdminSessionTimeRemainingMs(null);
        setSavedAccounts(upsertSavedAccount(currentUser));
        await signOut(auth);
        setUser(null);
        setUserProfile(null);
      })();
    };

    const resetAdminSessionTimeout = () => {
      if (adminSessionTimeoutRef.current !== null) {
        window.clearTimeout(adminSessionTimeoutRef.current);
      }

      adminSessionDeadlineRef.current = Date.now() + ADMIN_IDLE_TIMEOUT_MS;
      setAdminSessionTimeRemainingMs(ADMIN_IDLE_TIMEOUT_MS);
      adminSessionTimeoutRef.current = window.setTimeout(expireAdminSession, ADMIN_IDLE_TIMEOUT_MS);
    };

    resetAdminSessionTimeout();

    const countdownInterval = window.setInterval(() => {
      const deadline = adminSessionDeadlineRef.current;

      if (!deadline) {
        setAdminSessionTimeRemainingMs(null);
        return;
      }

      const nextRemaining = Math.max(deadline - Date.now(), 0);
      setAdminSessionTimeRemainingMs(nextRemaining);
    }, 1000);

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetAdminSessionTimeout);
    });

    return () => {
      if (adminSessionTimeoutRef.current !== null) {
        window.clearTimeout(adminSessionTimeoutRef.current);
        adminSessionTimeoutRef.current = null;
      }
      adminSessionDeadlineRef.current = null;
      window.clearInterval(countdownInterval);
      setAdminSessionTimeRemainingMs(null);

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetAdminSessionTimeout);
      });
    };
  }, [loading, user, userProfile]);

  const login = async (
    email: string,
    password: string,
    options?: {
      rememberSession?: boolean;
    },
  ) => {
    setError(null);
    try {
      await setAuthSessionPersistence(options?.rememberSession ?? true);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await loadAuthorizedUserProfile(credential.user);
      const nextSavedAccounts = upsertSavedAccount(credential.user);
      setUser(credential.user);
      setUserProfile(profile);
      setSavedAccounts(nextSavedAccounts);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err, "Login failed");
      setError(message);
      throw err;
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    options?: {
      phoneNumber?: string | null;
    },
  ) => {
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName });
      await createUserProfile(credential.user, displayName, options?.phoneNumber ?? null);
      const profile = await loadAuthorizedUserProfile(credential.user);
      const nextSavedAccounts = upsertSavedAccount(credential.user);
      setUser(credential.user);
      setUserProfile(profile);
      setSavedAccounts(nextSavedAccounts);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err, "Registration failed");
      setError(message);
      throw err;
    }
  };

  const loginWithGoogle = async (
    options?: {
      loginHint?: string | null;
      forceAccountSelection?: boolean;
      rememberSession?: boolean;
    },
  ) => {
    setError(null);
    try {
      await setAuthSessionPersistence(options?.rememberSession ?? true);
      const result = await signInWithPopup(auth, createGoogleProvider(options));
      const profile = await loadAuthorizedUserProfile(result.user);
      const nextSavedAccounts = upsertSavedAccount(result.user);
      setUser(result.user);
      setUserProfile(profile);
      setSavedAccounts(nextSavedAccounts);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err, "Google login failed");
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      const currentUser = auth.currentUser;

      if (currentUser) {
        setSavedAccounts(upsertSavedAccount(currentUser));
      }

      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err, "Logout failed");
      setError(message);
      throw err;
    }
  };

  const sendVerificationEmailForCurrentUser = async () => {
    setError(null);

    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No authenticated user is available for email verification.");
    }

    try {
      const continueUrl =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

      await sendEmailVerification(
        currentUser,
        continueUrl
          ? {
              url: continueUrl,
              handleCodeInApp: false,
            }
          : undefined,
      );
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err, "Unable to send verification email.");
      setError(message);
      throw new Error(message);
    }
  };

  const subscriptionState = getSubscriptionAccessState(subscription);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        subscription,
        subscriptionLoading,
        subscriptionState,
        savedAccounts,
        loading,
        error,
        adminSessionTimeRemainingMs,
        isAuthenticated: Boolean(user),
        isAdmin: hasRole(userProfile, "admin"),
        hasPremiumAccess: subscriptionState.hasPremiumAccess,
        hasCreatorAccess: subscriptionState.hasCreatorAccess,
        hasProAccess: subscriptionState.hasProAccess,
        role: userProfile?.role ?? null,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUserProfile,
        refreshAuthUser,
        sendVerificationEmail: sendVerificationEmailForCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
