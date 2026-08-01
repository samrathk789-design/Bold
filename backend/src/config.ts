import "dotenv/config";

const requireEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isDev: (process.env.NODE_ENV ?? "development") !== "production",
  jwtSecret: requireEnv("JWT_SECRET", "bold-dev-jwt-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
  otpLength: Number(process.env.OTP_LENGTH ?? 6),
  exposeOtp: process.env.EXPOSE_OTP_IN_RESPONSE === "true",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  // Email OTP (prefer Resend, else SMTP)
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Bold <onboarding@resend.dev>",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpSecure: process.env.SMTP_SECURE === "true",
  // Phone SMS (Twilio preferred, TextBelt fallback)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  textbeltKey: process.env.TEXTBELT_KEY ?? "",
  // OpenRouter trading brain
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
};
