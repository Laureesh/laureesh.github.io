import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig, isFirebaseConfigured } from "./env";

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = (firebaseApp ? getAuth(firebaseApp) : null) as Auth;
export const db = (firebaseApp ? getFirestore(firebaseApp) : null) as Firestore;
export const storage = (firebaseApp ? getStorage(firebaseApp) : null) as FirebaseStorage;
