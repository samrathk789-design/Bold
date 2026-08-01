import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
const dbPath = path.join(dataDir, "bold.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      name TEXT,
      avatar_url TEXT,
      google_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_challenges (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL CHECK (channel IN ('email', 'phone')),
      destination TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_otp_destination ON otp_challenges(destination, channel);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_jti TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trade_signals (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
      timeframe TEXT NOT NULL,
      entry REAL NOT NULL,
      stop_loss REAL NOT NULL,
      take_profit REAL NOT NULL,
      confidence INTEGER NOT NULL,
      rationale TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
      entry_price REAL NOT NULL,
      exit_price REAL,
      notes TEXT,
      emotion TEXT,
      pnl REAL,
      traded_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS algo_bots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'paused' CHECK (status IN ('running', 'paused', 'stopped')),
      config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedSignalsIfEmpty();
}

function seedSignalsIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) as c FROM trade_signals").get() as { c: number };
  if (count.c > 0) return;

  const insert = db.prepare(`
    INSERT INTO trade_signals (id, symbol, side, timeframe, entry, stop_loss, take_profit, confidence, rationale, status)
    VALUES (@id, @symbol, @side, @timeframe, @entry, @stop_loss, @take_profit, @confidence, @rationale, @status)
  `);

  const samples = [
    {
      id: crypto.randomUUID(),
      symbol: "NIFTY",
      side: "BUY",
      timeframe: "15m",
      entry: 24580,
      stop_loss: 24490,
      take_profit: 24720,
      confidence: 78,
      rationale: "Break above VWAP with rising volume — beginners: wait for candle close confirmation.",
      status: "active",
    },
    {
      id: crypto.randomUUID(),
      symbol: "RELIANCE",
      side: "SELL",
      timeframe: "1h",
      entry: 2895,
      stop_loss: 2925,
      take_profit: 2830,
      confidence: 71,
      rationale: "Rejection at resistance. Risk small size; exit if price reclaims the level.",
      status: "active",
    },
    {
      id: crypto.randomUUID(),
      symbol: "BTCUSDT",
      side: "BUY",
      timeframe: "1h",
      entry: 68450,
      stop_loss: 67200,
      take_profit: 70200,
      confidence: 66,
      rationale: "Higher-low structure intact. For learners: use a fixed 0.5% account risk.",
      status: "active",
    },
  ];

  const tx = db.transaction(() => {
    for (const s of samples) insert.run(s);
  });
  tx();
}

migrate();
