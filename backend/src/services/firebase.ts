import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "../config.js";

let initialized = false;

export function isFirebaseAdminReady(): boolean {
  return Boolean(env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey);
}

export function isFirebaseWebConfigured(): boolean {
  return Boolean(env.firebaseApiKey && env.firebaseAuthDomain && env.firebaseProjectId && env.firebaseAppId);
}

function ensureAdmin() {
  if (initialized) return;
  if (!isFirebaseAdminReady()) {
    throw Object.assign(new Error("Firebase Admin is not configured"), { status: 501 });
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey,
      }),
    });
  }
  initialized = true;
}

export type FirebaseIdentity = {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  provider: "google" | "apple" | "github" | "unknown";
};

function mapProvider(signInProvider?: string): FirebaseIdentity["provider"] {
  if (!signInProvider) return "unknown";
  if (signInProvider.includes("google")) return "google";
  if (signInProvider.includes("apple")) return "apple";
  if (signInProvider.includes("github")) return "github";
  return "unknown";
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity> {
  ensureAdmin();
  const decoded = await getAuth().verifyIdToken(idToken);
  const fromSignIn = mapProvider(decoded.firebase?.sign_in_provider);
  const fromIdentities = mapProvider(
    decoded.firebase?.identities ? Object.keys(decoded.firebase.identities)[0] : undefined
  );
  const provider = fromSignIn !== "unknown" ? fromSignIn : fromIdentities;

  return {
    uid: decoded.uid,
    email: decoded.email?.toLowerCase() ?? null,
    name: (decoded.name as string | undefined) ?? null,
    picture: (decoded.picture as string | undefined) ?? null,
    provider,
  };
}

export function firebaseWebConfig() {
  if (!isFirebaseWebConfigured()) return null;
  return {
    apiKey: env.firebaseApiKey,
    authDomain: env.firebaseAuthDomain,
    projectId: env.firebaseProjectId,
    appId: env.firebaseAppId,
    messagingSenderId: env.firebaseMessagingSenderId || undefined,
  };
}
