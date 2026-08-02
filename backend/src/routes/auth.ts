import { Router } from "express";
import { z } from "zod";
import {
  findOrCreateUserFromDevOAuth,
  findOrCreateUserFromFirebase,
  findOrCreateUserFromGoogle,
  findOrCreateUserFromOtp,
  issueToken,
  publicUser,
  revokeSession,
  setUsername,
} from "../services/auth.js";
import { createOtpChallenge, verifyOtpChallenge } from "../services/otp.js";
import { getAuthedUser, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { env } from "../config.js";
import { firebaseWebConfig, isFirebaseAdminReady, isFirebaseWebConfigured } from "../services/firebase.js";

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

const firebaseSchema = z.object({
  idToken: z.string().min(1),
  provider: z.enum(["google", "apple", "github"]).optional(),
});

const devOAuthSchema = z.object({
  provider: z.enum(["google", "apple", "github"]),
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
});

const usernameSchema = z.object({
  username: z.string().min(3).max(24),
});

function sessionMeta(req: { get: (h: string) => string | undefined; ip?: string }) {
  return {
    userAgent: req.get("user-agent") ?? undefined,
    ip: req.ip,
  };
}

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
  const { token, expiresAt } = issueToken(user, sessionMeta(req));
  return res.json({
    token,
    expiresAt,
    user: publicUser(user),
    isNew: !user.username,
  });
});

router.post("/google", async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "idToken is required" });
  }
  try {
    const { user, isNew } = await findOrCreateUserFromGoogle(parsed.data.idToken);
    const { token, expiresAt } = issueToken(user, sessionMeta(req));
    return res.json({ token, expiresAt, user: publicUser(user), isNew });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Google auth failed";
    return res.status(status).json({ error: message });
  }
});

router.post("/firebase", async (req, res) => {
  const parsed = firebaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "idToken is required" });
  }
  try {
    const { user, isNew } = await findOrCreateUserFromFirebase(
      parsed.data.idToken,
      parsed.data.provider
    );
    const { token, expiresAt } = issueToken(user, sessionMeta(req));
    return res.json({ token, expiresAt, user: publicUser(user), isNew });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Firebase auth failed";
    return res.status(status).json({ error: message });
  }
});

router.post("/oauth/dev", (req, res) => {
  const parsed = devOAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
  }
  try {
    const { user, isNew } = findOrCreateUserFromDevOAuth(
      parsed.data.provider,
      parsed.data.email,
      parsed.data.name
    );
    const { token, expiresAt } = issueToken(user, sessionMeta(req));
    return res.json({ token, expiresAt, user: publicUser(user), isNew });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "OAuth failed";
    return res.status(status).json({ error: message });
  }
});

router.post("/username", requireAuth, (req, res) => {
  const parsed = usernameSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid username" });
  }
  try {
    const user = setUsername((req as AuthedRequest).userId!, parsed.data.username);
    return res.json({ user: publicUser(user) });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Could not set username";
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
  const smsReady = Boolean(
    env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber
  );
  const emailReady = Boolean(
    env.resendApiKey || (env.smtpHost && env.smtpUser && env.smtpPass) || env.isDev
  );
  const firebaseReady = isFirebaseWebConfigured() && isFirebaseAdminReady();
  res.json({
    googleClientId: env.googleClientId || null,
    googleEnabled: Boolean(env.googleClientId) || firebaseReady || (env.isDev && env.allowDevOAuth),
    googleMode: env.googleClientId ? "gis" : firebaseReady ? "firebase" : env.isDev ? "dev" : "off",
    firebase: firebaseWebConfig(),
    firebaseReady,
    providers: {
      google: Boolean(env.googleClientId) || firebaseReady || (env.isDev && env.allowDevOAuth),
      apple: firebaseReady || (env.isDev && env.allowDevOAuth),
      github: firebaseReady || (env.isDev && env.allowDevOAuth),
    },
    allowDevOAuth: env.isDev && env.allowDevOAuth,
    otpLength: env.otpLength,
    otpTtlSeconds: env.otpTtlSeconds,
    exposeOtp: env.exposeOtp,
    smsReady,
    emailReady,
    smsSetupHint: smsReady
      ? null
      : "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in backend/.env to send real SMS OTPs.",
    emailSetupHint: env.resendApiKey || (env.smtpHost && env.smtpUser && env.smtpPass)
      ? null
      : "Dev mode uses an email preview link. For real Gmail delivery set RESEND_API_KEY or SMTP_* in backend/.env.",
    googleSetupHint: env.googleClientId || firebaseReady
      ? null
      : "Add FIREBASE_* credentials (or GOOGLE_CLIENT_ID) for production Google sign-in. Dev OAuth is enabled locally.",
    firebaseSetupHint: firebaseReady
      ? null
      : "Enable Google, Apple, and GitHub in Firebase Authentication, then set FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_APP_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    devGoogleHint: env.isDev && env.allowDevOAuth && !firebaseReady
      ? "Dev mode: provider buttons create a real Bold account (authMethod stored). Add Firebase for production popups."
      : null,
  });
});

export default router;
