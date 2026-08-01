import nodemailer from "nodemailer";
import { env } from "../config.js";

export type EmailSendResult = {
  provider: "resend" | "smtp" | "ethereal";
  /** Ethereal catch-inbox URL (dev only) — not used for Resend/SMTP */
  previewUrl?: string;
};

function emailNotConfiguredError(): Error & { status: number } {
  const err = new Error(
    "Email OTP is not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env"
  ) as Error & { status: number };
  err.status = 503;
  return err;
}

function buildBody(code: string): string {
  const minutes = Math.max(1, Math.round(env.otpTtlSeconds / 60));
  return [
    "Your Bold login code is:",
    "",
    code,
    "",
    `This code expires in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    "",
    "If you did not request this code, you can ignore this email.",
  ].join("\n");
}

async function sendViaResend(to: string, code: string): Promise<EmailSendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [to],
      subject: "Your Bold login code",
      text: buildBody(code),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(
      detail ? `Failed to send email OTP: ${detail}` : "Failed to send email OTP"
    ) as Error & { status: number };
    err.status = 502;
    throw err;
  }
  return { provider: "resend" };
}

async function sendViaSmtp(to: string, code: string): Promise<EmailSendResult> {
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject: "Your Bold login code",
    text: buildBody(code),
  });
  return { provider: "smtp" };
}

/** Dev fallback: real SMTP to Ethereal catch-all; open previewUrl to read the OTP */
async function sendViaEthereal(to: string, code: string): Promise<EmailSendResult> {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  const info = await transporter.sendMail({
    from: `Bold <${testAccount.user}>`,
    to,
    subject: "Your Bold login code",
    text: buildBody(code),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (!previewUrl) {
    throw emailNotConfiguredError();
  }
  console.log(`[OTP email ethereal] to=${to} preview=${previewUrl}`);
  return { provider: "ethereal", previewUrl };
}

export async function sendEmailOtp(to: string, code: string): Promise<EmailSendResult> {
  if (env.resendApiKey) {
    return sendViaResend(to, code);
  }

  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    return sendViaSmtp(to, code);
  }

  // Zero-config email path for development so the OTP flow can be tested
  if (env.isDev) {
    return sendViaEthereal(to, code);
  }

  throw emailNotConfiguredError();
}
