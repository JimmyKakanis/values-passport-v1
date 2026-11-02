import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";
import * as firebaseAuth from "firebase/auth";
import {
  OAuthProvider,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  setPersistence,
  signOut,
} from "firebase/auth";
import { SCHOOL_EMAIL_DOMAIN } from './constants';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = firebaseAuth.getAuth(app);
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  tenant: SCHOOL_EMAIL_DOMAIN
});

/**
 * Creates a Firebase Auth user using an isolated secondary app instance so the
 * currently signed-in Admin session is not interrupted.
 */
export async function provisionAuthUserWithPassword(
  email: string,
  password: string
): Promise<{ ok: boolean; alreadyExisted?: boolean; error?: string }> {
  const secondaryAppName = 'AdminUserProvisioning';
  const secondaryApp =
    getApps().find((a) => a.name === secondaryAppName) ??
    initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = firebaseAuth.getAuth(secondaryApp);

  try {
    await setPersistence(secondaryAuth, inMemoryPersistence);
    await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), password);
    await signOut(secondaryAuth).catch(() => {});
    return { ok: true };
  } catch (err: any) {
    await signOut(secondaryAuth).catch(() => {});
    if (err?.code === 'auth/email-already-in-use') {
      return { ok: true, alreadyExisted: true };
    }
    return {
      ok: false,
      error: err?.message || 'Failed to create login credentials.',
    };
  }
}

