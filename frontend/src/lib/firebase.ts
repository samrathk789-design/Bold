import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import {
  getAuth,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from "firebase/auth";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function initFirebase(config: FirebaseWebConfig): Auth {
  if (!getApps().length) {
    app = initializeApp(config);
  } else {
    app = getApps()[0]!;
  }
  auth = getAuth(app);
  return auth;
}

export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error("Firebase is not initialized");
  return auth;
}

export async function signInWithProvider(
  provider: "google" | "apple" | "github"
): Promise<UserCredential> {
  const a = getFirebaseAuth();
  if (provider === "google") {
    const g = new GoogleAuthProvider();
    g.addScope("email");
    g.addScope("profile");
    return signInWithPopup(a, g);
  }
  if (provider === "github") {
    const gh = new GithubAuthProvider();
    gh.addScope("user:email");
    return signInWithPopup(a, gh);
  }
  const apple = new OAuthProvider("apple.com");
  apple.addScope("email");
  apple.addScope("name");
  return signInWithPopup(a, apple);
}

export function isPopupCancelled(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? "";
  return (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/user-cancelled"
  );
}
