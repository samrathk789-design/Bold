import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config.js";
import { db } from "../db/index.js";
import type { OtpChannel } from "./otp.js";

export type User = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatar_url: string | null;
  google_id: string | null;
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
    createdAt: user.created_at,
  };
}

export function findUserById(id: string): User | undefined {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as User | undefined;
}

export function findOrCreateUserFromOtp(channel: OtpChannel, destination: string): User {
  if (channel === "email") {
    const existing = db.prepare(`SELECT * FROM users WHERE email = ?`).get(destination) as User | undefined;
    if (existing) return existing;
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO users (id, email, name) VALUES (?, ?, ?)`).run(
      id,
      destination,
      destination.split("@")[0]
    );
    return findUserById(id)!;
  }

  const existing = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(destination) as User | undefined;
  if (existing) return existing;
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO users (id, phone, name) VALUES (?, ?, ?)`).run(
    id,
    destination,
    `Trader ${destination.slice(-4)}`
  );
  return findUserById(id)!;
}

export async function findOrCreateUserFromGoogle(idToken: string): Promise<User> {
  if (!googleClient || !env.googleClientId) {
    // Dev fallback: accept a mock token payload when Google is not configured
    if (env.isDev && idToken.startsWith("dev:")) {
      const email = idToken.slice(4).toLowerCase();
      const existing = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as User | undefined;
      if (existing) return existing;
      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO users (id, email, name, google_id) VALUES (?, ?, ?, ?)`
      ).run(id, email, email.split("@")[0], `dev-${email}`);
      return findUserById(id)!;
    }
    throw Object.assign(new Error("Google Sign-In is not configured. Set GOOGLE_CLIENT_ID."), {
      status: 501,
    });
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
  if (byGoogle) return byGoogle;

  const byEmail = db.prepare(`SELECT * FROM users WHERE email = ?`).get(payload.email.toLowerCase()) as
    | User
    | undefined;
  if (byEmail) {
    db.prepare(
      `UPDATE users SET google_id = ?, name = COALESCE(name, ?), avatar_url = COALESCE(avatar_url, ?), updated_at = datetime('now') WHERE id = ?`
    ).run(payload.sub, payload.name ?? null, payload.picture ?? null, byEmail.id);
    return findUserById(byEmail.id)!;
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, email, name, avatar_url, google_id) VALUES (?, ?, ?, ?, ?)`
  ).run(
    id,
    payload.email.toLowerCase(),
    payload.name ?? payload.email.split("@")[0],
    payload.picture ?? null,
    payload.sub
  );
  return findUserById(id)!;
}

export function issueToken(user: User): { token: string; expiresAt: string } {
  const jti = crypto.randomUUID();
  const expiresMs = parseExpiryMs(env.jwtExpiresIn);
  const expiresAt = new Date(Date.now() + expiresMs).toISOString();

  const token = jwt.sign(
    { sub: user.id, email: user.email, phone: user.phone },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"], jwtid: jti }
  );

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_jti, expires_at) VALUES (?, ?, ?, ?)`
  ).run(crypto.randomUUID(), user.id, jti, expiresAt);

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
    .get(payload.jti) as { expires_at: string } | undefined;
  if (!session) throw Object.assign(new Error("Session revoked"), { status: 401 });
  if (new Date(session.expires_at).getTime() < Date.now()) {
    throw Object.assign(new Error("Session expired"), { status: 401 });
  }
  return { userId: payload.sub, jti: payload.jti };
}

export function revokeSession(jti: string) {
  db.prepare(`DELETE FROM sessions WHERE token_jti = ?`).run(jti);
}
