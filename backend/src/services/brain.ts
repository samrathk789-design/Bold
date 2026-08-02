import { env } from "../config.js";

export type BrainMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class BrainError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "BrainError";
    this.status = status;
  }
}

const SYSTEM_PROMPT = `You are Bold Brain — a calm trading coach for beginners using the Bold app.

Your job:
- Explain markets, setups, risk, and journaling in plain language
- Help new traders think in process (plan, size, stop, review) not gambling
- Never promise profits or tell someone to put money they cannot afford to lose
- Prefer concrete next steps and short answers
- If asked for a trade idea, include entry idea, invalidation/stop, target, and risk note
- If data is missing, say what you need instead of inventing prices

Tone: clear, direct, encouraging, never hype.`;

export function isBrainConfigured(): boolean {
  return Boolean(env.openRouterApiKey);
}

export async function askBrain(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<{ reply: string; model: string }> {
  if (!env.openRouterApiKey) {
    throw new BrainError(
      "Bold Brain is not configured. Set OPENROUTER_API_KEY in backend/.env",
      503
    );
  }

  const messages: BrainMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const res = await fetch(`${env.openRouterBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.frontendUrl,
      "X-Title": "Bold Trading Brain",
    },
    body: JSON.stringify({
      model: env.openRouterModel,
      messages,
      temperature: 0.4,
      max_tokens: 800,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
    model?: string;
  };

  if (!res.ok) {
    throw new BrainError(
      data.error?.message || `OpenRouter request failed (${res.status})`,
      res.status >= 400 && res.status < 600 ? res.status : 502
    );
  }

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new BrainError("Bold Brain returned an empty response");
  }

  return { reply, model: data.model || env.openRouterModel };
}
