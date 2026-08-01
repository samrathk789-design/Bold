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
};
