import { Router } from "express";
import { z } from "zod";
import {
  findOrCreateUserFromGoogle,
  findOrCreateUserFromOtp,
  issueToken,
  publicUser,
  revokeSession,
} from "../services/auth.js";
import { createOtpChallenge, verifyOtpChallenge } from "../services/otp.js";
import { getAuthedUser, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { env } from "../config.js";

const router = Router();

const startSchema = z.discriminatedUnion("channel", [
  z.object({
    channel: z.literal("email"),
    destination: z.string().email("Enter a valid email"),
  }),
  z.object({
    channel: z.literal("phone"),
    destination: z
      .string()
      .min(8, "Enter a valid phone number")
      .regex(/^\+?[\d\s-]{8,20}$/, "Enter a valid phone number with country code"),
  }),
]);

const verifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().min(4).max(8),
});

const googleSchema = z.object({
  idToken: z.string().min(1),
});

router.post("/otp/start", async (req, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
  }
  try {
    const challenge = await createOtpChallenge(parsed.data.channel, parsed.data.destination);
    return res.json({
      message: `OTP sent to your ${parsed.data.channel}`,
      ...challenge,
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Failed to send OTP";
    return res.status(status).json({ error: message });
  }
});

router.post("/otp/verify", (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
  }

  const result = verifyOtpChallenge(parsed.data.challengeId, parsed.data.code);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  const user = findOrCreateUserFromOtp(result.channel, result.destination);
  const { token, expiresAt } = issueToken(user);
  return res.json({
    token,
    expiresAt,
    user: publicUser(user),
  });
});

router.post("/google", async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "idToken is required" });
  }
  try {
    const user = await findOrCreateUserFromGoogle(parsed.data.idToken);
    const { token, expiresAt } = issueToken(user);
    return res.json({ token, expiresAt, user: publicUser(user) });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Google auth failed";
    return res.status(status).json({ error: message });
  }
});

router.get("/me", requireAuth, (req, res) => getAuthedUser(req as AuthedRequest, res));

router.post("/logout", requireAuth, (req, res) => {
  const authed = req as AuthedRequest;
  if (authed.jti) revokeSession(authed.jti);
  return res.json({ ok: true });
});

router.get("/config", (_req, res) => {
  res.json({
    googleClientId: env.googleClientId || null,
    googleEnabled: Boolean(env.googleClientId) || env.isDev,
    otpLength: env.otpLength,
    otpTtlSeconds: env.otpTtlSeconds,
    exposeOtp: env.exposeOtp,
    devGoogleHint: env.isDev && !env.googleClientId
      ? "Use Continue with Google (dev) or send idToken as 'dev:you@gmail.com'"
      : null,
  });
});

export default router;
