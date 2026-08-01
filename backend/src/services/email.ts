import nodemailer from "nodemailer";
import { env } from "../config.js";

function emailNotConfiguredError(): Error & { status: number } {
  const err = new Error("Email OTP is not configured") as Error & { status: number };
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

async function sendViaResend(to: string, code: string): Promise<void> {
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
}

async function sendViaSmtp(to: string, code: string): Promise<void> {
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
}

export async function sendEmailOtp(to: string, code: string): Promise<void> {
  if (env.resendApiKey) {
    await sendViaResend(to, code);
    return;
  }

  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    await sendViaSmtp(to, code);
    return;
  }

  throw emailNotConfiguredError();
}
