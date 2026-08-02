import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config.js";
import { db, markVerified, recordAudit, touchLastLogin } from "../db/index.js";
import type { OtpChannel } from "./otp.js";

export type User = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatar_url: string | null;
  google_id: string | null;
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
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    avatarUrl: user.avatar_url,
    emailVerified: Boolean(user.email_verified),
    phoneVerified: Boolean(user.phone_verified),
    lastLoginAt: user.last_login_at ?? null,
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
      return findUserById(existing.id)!;
    }
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO users (id, email, name, email_verified) VALUES (?, ?, ?, 1)`
    ).run(id, destination, destination.split("@")[0]);
    return findUserById(id)!;
  }

  const existing = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(destination) as User | undefined;
  if (existing) {
    markVerified(existing.id, "phone");
    return findUserById(existing.id)!;
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, phone, name, phone_verified) VALUES (?, ?, ?, 1)`
  ).run(id, destination, `Trader ${destination.slice(-4)}`);
  return findUserById(id)!;
}

export async function findOrCreateUserFromGoogle(idToken: string): Promise<User> {
  if (!googleClient || !env.googleClientId) {
    if (env.isDev && idToken.startsWith("dev:")) {
      const email = idToken.slice(4).toLowerCase();
      if (!email.includes("@")) {
        throw Object.assign(new Error("Use a Gmail address for Google sign-in"), { status: 400 });
      }
      const existing = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as User | undefined;
      if (existing) {
        if (!existing.google_id) {
          db.prepare(
            `UPDATE users SET google_id = ?, email_verified = 1, updated_at = datetime('now') WHERE id = ?`
          ).run(`dev-${email}`, existing.id);
        }
        return findUserById(existing.id)!;
      }
      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO users (id, email, name, google_id, email_verified) VALUES (?, ?, ?, ?, 1)`
      ).run(id, email, email.split("@")[0], `dev-${email}`);
      return findUserById(id)!;
    }
    throw Object.assign(
      new Error("Google Sign-In is not configured. Set GOOGLE_CLIENT_ID in backend/.env"),
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

  const byGoogle = db.prepare(`SELECT * FROM users WHERE google_id = ?`).get(payload.sub) as User | undefined;
  if (byGoogle) {
    db.prepare(
      `UPDATE users SET email_verified = 1, name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?`
    ).run(payload.name ?? null, payload.picture ?? null, byGoogle.id);
    return findUserById(byGoogle.id)!;
  }

  const byEmail = db.prepare(`SELECT * FROM users WHERE email = ?`).get(payload.email.toLowerCase()) as
    | User
    | undefined;
  if (byEmail) {
    db.prepare(
      `UPDATE users SET google_id = ?, name = COALESCE(name, ?), avatar_url = COALESCE(avatar_url, ?), email_verified = 1, updated_at = datetime('now') WHERE id = ?`
    ).run(payload.sub, payload.name ?? null, payload.picture ?? null, byEmail.id);
    return findUserById(byEmail.id)!;
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, email, name, avatar_url, google_id, email_verified) VALUES (?, ?, ?, ?, ?, 1)`
  ).run(
    id,
    payload.email.toLowerCase(),
    payload.name ?? payload.email.split("@")[0],
    payload.picture ?? null,
    payload.sub
  );
  return findUserById(id)!;
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
    google: Boolean(user.google_id),
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
