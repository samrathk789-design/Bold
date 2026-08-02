import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { askBrain, BrainError, isBrainConfigured } from "../services/brain.js";
import { recentBrainMessages, saveBrainMessage } from "../db/index.js";

const router = Router();

const CLIENT_ERROR = "Something went wrong — please try again.";

const brainLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: CLIENT_ERROR },
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

/** All brain routes require a valid session — no public/preview access */
router.use(requireAuth);

router.get("/status", (_req, res) => {
  res.json({
    ready: isBrainConfigured(),
  });
});

router.get("/history", (req, res) => {
  const userId = (req as AuthedRequest).userId!;
  res.json({ messages: recentBrainMessages(userId) });
});

router.post("/chat", brainLimiter, async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: CLIENT_ERROR });
  }

  const userId = (req as AuthedRequest).userId!;
  try {
    saveBrainMessage(userId, "user", parsed.data.message);
    const { reply, model } = await askBrain(parsed.data.message, parsed.data.history ?? []);
    saveBrainMessage(userId, "assistant", reply, model);
    return res.json({
      reply,
      userId,
    });
  } catch (err) {
    console.error("[brain/chat]", err instanceof Error ? err.message : err);
    const status = err instanceof BrainError ? err.status : 500;
    return res.status(status).json({ error: CLIENT_ERROR });
  }
});

export default router;
