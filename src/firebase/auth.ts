import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  setPersistence,
} from "firebase/auth";
import { auth } from "./app";
import { isFirebaseConfigured } from "./env";

export function createGoogleProvider(options?: {
  loginHint?: string | null;
  forceAccountSelection?: boolean;
}) {
  const provider = new GoogleAuthProvider();

  const parameters: Record<string, string> = {};

  if (options?.forceAccountSelection ?? true) {
    parameters.prompt = "select_account";
  }

  if (options?.loginHint) {
    parameters.login_hint = options.loginHint;
  }

  provider.setCustomParameters(parameters);

  return provider;
}

export async function enablePersistentAuthSession() {
  if (!isFirebaseConfigured || !auth) {
    return;
  }

  await setPersistence(auth, browserLocalPersistence);
}

export async function setAuthSessionPersistence(rememberSession: boolean) {
  if (!isFirebaseConfigured || !auth) {
    return;
  }

  await setPersistence(auth, rememberSession ? browserLocalPersistence : browserSessionPersistence);
}
