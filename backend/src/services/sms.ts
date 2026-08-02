import twilio from "twilio";
import { env } from "../config.js";

export type SmsSendResult = { provider: string };

export class SmsDeliveryError extends Error {
  status = 503;
  constructor(message: string) {
    super(message);
    this.name = "SmsDeliveryError";
  }
}

function hasTwilioConfig(): boolean {
  return Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber);
}

async function sendViaTwilio(to: string, code: string): Promise<SmsSendResult> {
  const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  const minutes = Math.max(1, Math.ceil(env.otpTtlSeconds / 60));
  await client.messages.create({
    body: `Your Bold verification code is ${code}. It expires in ${minutes} minutes.`,
    from: env.twilioFromNumber,
    to,
  });
  return { provider: "twilio" };
}

async function sendViaTextBelt(to: string, code: string): Promise<SmsSendResult> {
  const key = env.textbeltKey || "textbelt";
  const minutes = Math.max(1, Math.ceil(env.otpTtlSeconds / 60));
  const body = new URLSearchParams({
    phone: to,
    message: `Your Bold verification code is ${code}. It expires in ${minutes} minutes.`,
    key,
  });

  const response = await fetch("https://textbelt.com/text", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await response.json()) as { success?: boolean; error?: string };
  if (!response.ok || !data.success) {
    throw new SmsDeliveryError(
      data.error
        ? `SMS delivery failed: ${data.error}`
        : "SMS delivery failed via TextBelt. Configure Twilio or a valid TEXTBELT_KEY."
    );
  }
  return { provider: "textbelt" };
}

/**
 * Send an OTP code via SMS.
 * Prefers Twilio when fully configured; otherwise falls back to TextBelt
 * (TEXTBELT_KEY, or free key=textbelt when unset).
 * Throws SmsDeliveryError (status 503) if delivery cannot complete.
 */
export async function sendSmsOtp(to: string, code: string): Promise<SmsSendResult> {
  if (hasTwilioConfig()) {
    try {
      return await sendViaTwilio(to, code);
    } catch (err) {
      if (err instanceof SmsDeliveryError) throw err;
      const message = err instanceof Error ? err.message : "unknown error";
      throw new SmsDeliveryError(`SMS delivery failed via Twilio: ${message}`);
    }
  }

  // TextBelt free tier is unreliable for many countries — only try if a key is set
  if (env.textbeltKey) {
    try {
      return await sendViaTextBelt(to, code);
    } catch (err) {
      if (err instanceof SmsDeliveryError) throw err;
      const message = err instanceof Error ? err.message : "unknown error";
      throw new SmsDeliveryError(`SMS delivery failed via TextBelt: ${message}`);
    }
  }

  throw new SmsDeliveryError(
    "SMS OTP is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to backend/.env (Twilio Console → Account → Phone Numbers), then restart the API."
  );
}
