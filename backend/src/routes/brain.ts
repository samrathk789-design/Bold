import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { askBrain, BrainError, isBrainConfigured } from "../services/brain.js";
import { env } from "../config.js";
import { recentBrainMessages, saveBrainMessage } from "../db/index.js";

const router = Router();

const brainLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many brain requests. Slow down a bit." },
});

const chatSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .max(20)
    .optional(),
});

router.get("/status", requireAuth, (_req, res) => {
  res.json({
    ready: isBrainConfigured(),
    model: isBrainConfigured() ? env.openRouterModel : null,
  });
});

router.get("/history", requireAuth, (req, res) => {
  const userId = (req as AuthedRequest).userId!;
  res.json({ messages: recentBrainMessages(userId) });
});

router.post("/chat", requireAuth, brainLimiter, async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
  }

  const userId = (req as AuthedRequest).userId!;
  try {
    saveBrainMessage(userId, "user", parsed.data.message);
    const { reply, model } = await askBrain(parsed.data.message, parsed.data.history ?? []);
    saveBrainMessage(userId, "assistant", reply, model);
    return res.json({
      reply,
      model,
      userId,
    });
  } catch (err) {
    const status = err instanceof BrainError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Brain request failed";
    return res.status(status).json({ error: message });
  }
});

export default router;
