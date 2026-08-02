import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
const dbPath = path.join(dataDir, "bold.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = NORMAL");

type Migration = { id: string; sql: string };

const migrations: Migration[] = [
  {
    id: "001_core",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        name TEXT,
        avatar_url TEXT,
        google_id TEXT UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0,
        phone_verified INTEGER NOT NULL DEFAULT 0,
        last_login_at TEXT,
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

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_jti TEXT NOT NULL UNIQUE,
        user_agent TEXT,
        ip TEXT,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
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
    `,
  },
  {
    id: "002_indexes_and_auth_hardening",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_otp_destination ON otp_challenges(destination, channel);
      CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_challenges(expires_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id, traded_at);
      CREATE INDEX IF NOT EXISTS idx_algos_user ON algo_bots(user_id);
      CREATE INDEX IF NOT EXISTS idx_signals_status ON trade_signals(status, created_at);
    `,
  },
  {
    id: "003_brain_and_audit",
    sql: `
      CREATE TABLE IF NOT EXISTS brain_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        model TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_brain_user_created ON brain_messages(user_id, created_at);

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        event_type TEXT NOT NULL,
        meta_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_events(event_type, created_at);
    `,
  },
  {
    id: "004_user_auth_columns",
    sql: `
      -- Additive columns for older DBs created before 001 included them
      -- SQLite lacks IF NOT EXISTS for columns; use try/catch in runner.
    `,
  },
  {
    id: "005_oauth_username",
    sql: `
      -- username + auth_method added via addColumnIfMissing in migrate()
    `,
  },
];

function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function appliedIds(): Set<string> {
  const rows = db.prepare(`SELECT id FROM schema_migrations`).all() as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

function addColumnIfMissing(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function migrate() {
  ensureMigrationsTable();
  const done = appliedIds();
  const insert = db.prepare(`INSERT INTO schema_migrations (id) VALUES (?)`);

  const run = db.transaction(() => {
    for (const m of migrations) {
      if (done.has(m.id)) continue;
      if (m.id === "004_user_auth_columns") {
        addColumnIfMissing("users", "email_verified", "INTEGER NOT NULL DEFAULT 0");
        addColumnIfMissing("users", "phone_verified", "INTEGER NOT NULL DEFAULT 0");
        addColumnIfMissing("users", "last_login_at", "TEXT");
        addColumnIfMissing("sessions", "user_agent", "TEXT");
        addColumnIfMissing("sessions", "ip", "TEXT");
        addColumnIfMissing("sessions", "revoked_at", "TEXT");
      } else if (m.id === "005_oauth_username") {
        addColumnIfMissing("users", "username", "TEXT");
        addColumnIfMissing("users", "auth_method", "TEXT");
        addColumnIfMissing("users", "apple_id", "TEXT");
        addColumnIfMissing("users", "github_id", "TEXT");
        addColumnIfMissing("users", "firebase_uid", "TEXT");
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL`);
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase ON users(firebase_uid) WHERE firebase_uid IS NOT NULL`);
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple ON users(apple_id) WHERE apple_id IS NOT NULL`);
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github ON users(github_id) WHERE github_id IS NOT NULL`);
      } else if (m.sql.trim()) {
        db.exec(m.sql);
      }
      insert.run(m.id);
    }
  });
  run();

  seedSignalsIfEmpty();
  cleanupExpired();
}

function cleanupExpired() {
  db.prepare(
    `DELETE FROM otp_challenges WHERE consumed_at IS NOT NULL OR datetime(expires_at) < datetime('now')`
  ).run();
  db.prepare(
    `UPDATE sessions SET revoked_at = datetime('now')
     WHERE revoked_at IS NULL AND datetime(expires_at) < datetime('now')`
  ).run();
}

export function recordAudit(eventType: string, userId: string | null, meta: Record<string, unknown> = {}) {
  db.prepare(
    `INSERT INTO audit_events (id, user_id, event_type, meta_json) VALUES (?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, eventType, JSON.stringify(meta));
}

export function touchLastLogin(userId: string) {
  db.prepare(`UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(
    userId
  );
}

export function markVerified(userId: string, channel: "email" | "phone") {
  if (channel === "email") {
    db.prepare(`UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?`).run(userId);
  } else {
    db.prepare(`UPDATE users SET phone_verified = 1, updated_at = datetime('now') WHERE id = ?`).run(userId);
  }
}

export function saveBrainMessage(
  userId: string,
  role: "user" | "assistant" | "system",
  content: string,
  model?: string
) {
  db.prepare(
    `INSERT INTO brain_messages (id, user_id, role, content, model) VALUES (?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, role, content, model ?? null);
}

export function recentBrainMessages(userId: string, limit = 40) {
  return db
    .prepare(
      `SELECT role, content, model, created_at as createdAt
       FROM brain_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit)
    .reverse();
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
