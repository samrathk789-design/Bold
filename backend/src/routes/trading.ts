import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "../db/index.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/signals", requireAuth, (_req, res) => {
  const signals = db
    .prepare(
      `SELECT id, symbol, side, timeframe, entry, stop_loss as stopLoss, take_profit as takeProfit,
              confidence, rationale, status, created_at as createdAt
       FROM trade_signals WHERE status = 'active' ORDER BY created_at DESC`
    )
    .all();
  res.json({ signals });
});

router.get("/journal", requireAuth, (req, res) => {
  const userId = (req as AuthedRequest).userId!;
  const entries = db
    .prepare(
      `SELECT id, symbol, side, entry_price as entryPrice, exit_price as exitPrice, notes, emotion,
              pnl, traded_at as tradedAt, created_at as createdAt
       FROM journal_entries WHERE user_id = ? ORDER BY traded_at DESC`
    )
    .all(userId);
  res.json({ entries });
});

const journalSchema = z.object({
  symbol: z.string().min(1).max(32),
  side: z.enum(["BUY", "SELL"]),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  emotion: z.string().max(64).optional().nullable(),
  pnl: z.number().optional().nullable(),
  tradedAt: z.string().datetime().optional(),
});

router.post("/journal", requireAuth, (req, res) => {
  const parsed = journalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid entry" });
  }
  const userId = (req as AuthedRequest).userId!;
  const id = crypto.randomUUID();
  const d = parsed.data;
  db.prepare(
    `INSERT INTO journal_entries (id, user_id, symbol, side, entry_price, exit_price, notes, emotion, pnl, traded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    d.symbol.toUpperCase(),
    d.side,
    d.entryPrice,
    d.exitPrice ?? null,
    d.notes ?? null,
    d.emotion ?? null,
    d.pnl ?? null,
    d.tradedAt ?? new Date().toISOString()
  );
  const entry = db
    .prepare(
      `SELECT id, symbol, side, entry_price as entryPrice, exit_price as exitPrice, notes, emotion,
              pnl, traded_at as tradedAt, created_at as createdAt
       FROM journal_entries WHERE id = ?`
    )
    .get(id);
  res.status(201).json({ entry });
});

router.get("/algos", requireAuth, (req, res) => {
  const userId = (req as AuthedRequest).userId!;
  const bots = db
    .prepare(
      `SELECT id, name, strategy, status, config_json as config, created_at as createdAt, updated_at as updatedAt
       FROM algo_bots WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(userId)
    .map((b) => {
      const bot = b as { config: string; [k: string]: unknown };
      return { ...bot, config: JSON.parse(bot.config) };
    });
  res.json({ bots });
});

const algoSchema = z.object({
  name: z.string().min(1).max(80),
  strategy: z.string().min(1).max(80),
  config: z.record(z.unknown()).optional(),
});

router.post("/algos", requireAuth, (req, res) => {
  const parsed = algoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid bot" });
  }
  const userId = (req as AuthedRequest).userId!;
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO algo_bots (id, user_id, name, strategy, status, config_json) VALUES (?, ?, ?, ?, 'paused', ?)`
  ).run(id, userId, parsed.data.name, parsed.data.strategy, JSON.stringify(parsed.data.config ?? {}));
  const bot = db
    .prepare(
      `SELECT id, name, strategy, status, config_json as config, created_at as createdAt, updated_at as updatedAt
       FROM algo_bots WHERE id = ?`
    )
    .get(id) as { config: string; [k: string]: unknown };
  res.status(201).json({ bot: { ...bot, config: JSON.parse(bot.config) } });
});

export default router;
