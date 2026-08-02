import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config.js";
import { db, markVerified, recordAudit, touchLastLogin } from "../db/index.js";
import type { OtpChannel } from "./otp.js";
import { verifyFirebaseIdToken } from "./firebase.js";

export type AuthMethod = "email" | "phone" | "google" | "apple" | "github" | "otp";

export type User = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  google_id: string | null;
  apple_id: string | null;
  github_id: string | null;
  firebase_uid: string | null;
  auth_method: string | null;
  email_verified?: number;
  phone_verified?: number;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
};

const googleClient = env.googleClientId
  ? new OAuth2Client(env.googleClientId)
  : null;

export function publicUser(user: User) {
  const needsUsername = !user.username;
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatar_url,
    authMethod: user.auth_method,
    emailVerified: Boolean(user.email_verified),
    phoneVerified: Boolean(user.phone_verified),
    lastLoginAt: user.last_login_at ?? null,
    needsUsername,
    createdAt: user.created_at,
  };
}

export function findUserById(id: string): User | undefined {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as User | undefined;
}

export function findOrCreateUserFromOtp(channel: OtpChannel, destination: string): User {
  if (channel === "email") {
    const existing = db.prepare(`SELECT * FROM users WHERE email = ?`).get(destination) as User | undefined;
    if (existing) {
      markVerified(existing.id, "email");
      db.prepare(
        `UPDATE users SET auth_method = COALESCE(auth_method, 'email'), updated_at = datetime('now') WHERE id = ?`
      ).run(existing.id);
      return findUserById(existing.id)!;
    }
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO users (id, email, name, email_verified, auth_method) VALUES (?, ?, ?, 1, 'email')`
    ).run(id, destination, destination.split("@")[0]);
    return findUserById(id)!;
  }

  const existing = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(destination) as User | undefined;
  if (existing) {
    markVerified(existing.id, "phone");
    db.prepare(
      `UPDATE users SET auth_method = COALESCE(auth_method, 'phone'), updated_at = datetime('now') WHERE id = ?`
    ).run(existing.id);
    return findUserById(existing.id)!;
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, phone, name, phone_verified, auth_method) VALUES (?, ?, ?, 1, 'phone')`
  ).run(id, destination, `Trader ${destination.slice(-4)}`);
  return findUserById(id)!;
}

type OAuthInput = {
  provider: "google" | "apple" | "github";
  email: string | null;
  name: string | null;
  picture: string | null;
  providerUserId: string;
  firebaseUid?: string | null;
};

export function findOrCreateUserFromOAuth(input: OAuthInput): { user: User; isNew: boolean } {
  const providerCol =
    input.provider === "google" ? "google_id" : input.provider === "apple" ? "apple_id" : "github_id";

  if (input.firebaseUid) {
    const byFb = db.prepare(`SELECT * FROM users WHERE firebase_uid = ?`).get(input.firebaseUid) as
      | User
      | undefined;
    if (byFb) {
      db.prepare(
        `UPDATE users SET ${providerCol} = COALESCE(${providerCol}, ?), auth_method = ?, email_verified = 1,
         name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?`
      ).run(input.providerUserId, input.provider, input.name, input.picture, byFb.id);
      return { user: findUserById(byFb.id)!, isNew: false };
    }
  }

  const byProvider = db
    .prepare(`SELECT * FROM users WHERE ${providerCol} = ?`)
    .get(input.providerUserId) as User | undefined;
  if (byProvider) {
    db.prepare(
      `UPDATE users SET auth_method = ?, firebase_uid = COALESCE(firebase_uid, ?), email_verified = 1,
       name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?`
    ).run(input.provider, input.firebaseUid ?? null, input.name, input.picture, byProvider.id);
    return { user: findUserById(byProvider.id)!, isNew: false };
  }

  if (input.email) {
    const byEmail = db.prepare(`SELECT * FROM users WHERE email = ?`).get(input.email.toLowerCase()) as
      | User
      | undefined;
    if (byEmail) {
      db.prepare(
        `UPDATE users SET ${providerCol} = ?, firebase_uid = COALESCE(firebase_uid, ?), auth_method = ?,
         email_verified = 1, name = COALESCE(name, ?), avatar_url = COALESCE(avatar_url, ?), updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        input.providerUserId,
        input.firebaseUid ?? null,
        input.provider,
        input.name,
        input.picture,
        byEmail.id
      );
      return { user: findUserById(byEmail.id)!, isNew: false };
    }
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, email, name, avatar_url, ${providerCol}, firebase_uid, auth_method, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    id,
    input.email,
    input.name ?? (input.email ? input.email.split("@")[0] : `${input.provider}-user`),
    input.picture,
    input.providerUserId,
    input.firebaseUid ?? null,
    input.provider
  );
  return { user: findUserById(id)!, isNew: true };
}

export async function findOrCreateUserFromGoogle(idToken: string): Promise<{ user: User; isNew: boolean }> {
  if (!googleClient || !env.googleClientId) {
    if (env.isDev && idToken.startsWith("dev:")) {
      const email = idToken.slice(4).toLowerCase();
      if (!email.includes("@")) {
        throw Object.assign(new Error("Use a Gmail address for Google sign-in"), { status: 400 });
      }
      return findOrCreateUserFromOAuth({
        provider: "google",
        email,
        name: email.split("@")[0],
        picture: null,
        providerUserId: `dev-google-${email}`,
      });
    }
    throw Object.assign(
      new Error("Google Sign-In is not configured. Set GOOGLE_CLIENT_ID or Firebase."),
      { status: 501 }
    );
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw Object.assign(new Error("Invalid Google token"), { status: 401 });
  }

  return findOrCreateUserFromOAuth({
    provider: "google",
    email: payload.email.toLowerCase(),
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    providerUserId: payload.sub,
  });
}

export async function findOrCreateUserFromFirebase(
  idToken: string,
  preferredProvider?: "google" | "apple" | "github"
): Promise<{ user: User; isNew: boolean }> {
  const identity = await verifyFirebaseIdToken(idToken);
  const provider = preferredProvider ?? identity.provider;
  if (provider === "unknown") {
    throw Object.assign(new Error("Unsupported Firebase sign-in provider"), { status: 400 });
  }
  return findOrCreateUserFromOAuth({
    provider,
    email: identity.email,
    name: identity.name,
    picture: identity.picture,
    providerUserId: `${provider}:${identity.uid}`,
    firebaseUid: identity.uid,
  });
}

/** Dev-only OAuth completion so Apple/GitHub/Google buttons work before Firebase console is wired */
export function findOrCreateUserFromDevOAuth(
  provider: "google" | "apple" | "github",
  email: string,
  name?: string
): { user: User; isNew: boolean } {
  if (!env.isDev || !env.allowDevOAuth) {
    throw Object.assign(new Error("Dev OAuth is disabled"), { status: 403 });
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw Object.assign(new Error("Enter a valid email for this provider"), { status: 400 });
  }
  return findOrCreateUserFromOAuth({
    provider,
    email: normalized,
    name: name ?? normalized.split("@")[0],
    picture: null,
    providerUserId: `dev-${provider}-${normalized}`,
  });
}

export function setUsername(userId: string, username: string): User {
  const cleaned = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(cleaned)) {
    throw Object.assign(
      new Error("Username must be 3–24 characters (letters, numbers, underscore)"),
      { status: 400 }
    );
  }
  const taken = db
    .prepare(`SELECT id FROM users WHERE username = ? AND id != ?`)
    .get(cleaned, userId) as { id: string } | undefined;
  if (taken) {
    throw Object.assign(new Error("That username is taken"), { status: 409 });
  }
  db.prepare(
    `UPDATE users SET username = ?, name = COALESCE(name, ?), updated_at = datetime('now') WHERE id = ?`
  ).run(cleaned, cleaned, userId);
  recordAudit("auth.username_set", userId, { username: cleaned });
  return findUserById(userId)!;
}

export function issueToken(
  user: User,
  meta: { userAgent?: string; ip?: string } = {}
): { token: string; expiresAt: string } {
  const jti = crypto.randomUUID();
  const expiresMs = parseExpiryMs(env.jwtExpiresIn);
  const expiresAt = new Date(Date.now() + expiresMs).toISOString();

  const token = jwt.sign(
    { sub: user.id, email: user.email, phone: user.phone },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"], jwtid: jti }
  );

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_jti, expires_at, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), user.id, jti, expiresAt, meta.userAgent ?? null, meta.ip ?? null);

  touchLastLogin(user.id);
  recordAudit("auth.login", user.id, {
    email: user.email,
    phone: user.phone,
    authMethod: user.auth_method,
  });

  return { token, expiresAt };
}

function parseExpiryMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const mult = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

export function verifyAccessToken(token: string): { userId: string; jti: string } {
  const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  if (!payload.sub || !payload.jti) {
    throw Object.assign(new Error("Invalid token"), { status: 401 });
  }
  const session = db
    .prepare(`SELECT * FROM sessions WHERE token_jti = ?`)
    .get(payload.jti) as { expires_at: string; revoked_at?: string | null } | undefined;
  if (!session) throw Object.assign(new Error("Session revoked"), { status: 401 });
  if (session.revoked_at) throw Object.assign(new Error("Session revoked"), { status: 401 });
  if (new Date(session.expires_at).getTime() < Date.now()) {
    throw Object.assign(new Error("Session expired"), { status: 401 });
  }
  return { userId: payload.sub, jti: payload.jti };
}

export function revokeSession(jti: string) {
  db.prepare(`UPDATE sessions SET revoked_at = datetime('now') WHERE token_jti = ?`).run(jti);
  recordAudit("auth.logout", null, { jti });
}
