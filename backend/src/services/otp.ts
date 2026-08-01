import crypto from "node:crypto";
import { env } from "../config.js";
import { db } from "../db/index.js";

export type OtpChannel = "email" | "phone";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(`${code}:${env.jwtSecret}`).digest("hex");
}

function generateCode(): string {
  const max = 10 ** env.otpLength;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(env.otpLength, "0");
}

export function normalizeDestination(channel: OtpChannel, destination: string): string {
  if (channel === "email") return destination.trim().toLowerCase();
  // Keep digits and leading +
  const cleaned = destination.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned.replace(/^\+/, "")}`;
}

export function createOtpChallenge(channel: OtpChannel, rawDestination: string) {
  const destination = normalizeDestination(channel, rawDestination);
  const code = generateCode();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.otpTtlSeconds * 1000).toISOString();

  // Invalidate previous unused challenges for same destination
  db.prepare(
    `UPDATE otp_challenges SET consumed_at = datetime('now')
     WHERE destination = ? AND channel = ? AND consumed_at IS NULL`
  ).run(destination, channel);

  db.prepare(
    `INSERT INTO otp_challenges (id, channel, destination, code_hash, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, channel, destination, hashCode(code), expiresAt);

  // Dev-friendly delivery: log OTP. Swap for Twilio/SendGrid later.
  console.log(`[OTP] ${channel} → ${destination} | code=${code} | expires=${expiresAt}`);

  return {
    challengeId: id,
    channel,
    destination,
    expiresAt,
    expiresInSeconds: env.otpTtlSeconds,
    ...(env.exposeOtp ? { debugOtp: code } : {}),
  };
}

export type VerifyResult =
  | { ok: true; destination: string; channel: OtpChannel }
  | { ok: false; error: string; status: number };

export function verifyOtpChallenge(
  challengeId: string,
  code: string
): VerifyResult {
  const row = db
    .prepare(`SELECT * FROM otp_challenges WHERE id = ?`)
    .get(challengeId) as
    | {
        id: string;
        channel: OtpChannel;
        destination: string;
        code_hash: string;
        attempts: number;
        max_attempts: number;
        expires_at: string;
        consumed_at: string | null;
      }
    | undefined;

  if (!row) return { ok: false, error: "Invalid or expired verification session", status: 400 };
  if (row.consumed_at) return { ok: false, error: "OTP already used", status: 400 };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "OTP expired. Request a new one.", status: 400 };
  }
  if (row.attempts >= row.max_attempts) {
    return { ok: false, error: "Too many attempts. Request a new OTP.", status: 429 };
  }

  db.prepare(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?`).run(challengeId);

  if (hashCode(code.trim()) !== row.code_hash) {
    return { ok: false, error: "Incorrect OTP", status: 401 };
  }

  db.prepare(`UPDATE otp_challenges SET consumed_at = datetime('now') WHERE id = ?`).run(challengeId);

  return { ok: true, destination: row.destination, channel: row.channel };
}
