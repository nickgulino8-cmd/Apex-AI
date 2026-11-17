import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite persistence layer. One file, WAL mode, foreign keys on.
 * Every user-owned table cascades on user delete so "Delete my account"
 * removes everything in a single statement.
 */

export const DATA_DIR = path.resolve(process.env.APEX_DATA_DIR || "./storage");

const MIGRATIONS: string[] = [
  /* 1 — core schema */ `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    experience TEXT NOT NULL DEFAULT 'beginner',
    equipment TEXT NOT NULL DEFAULT '["bodyweight","dumbbell"]',
    days_per_week INTEGER NOT NULL DEFAULT 3,
    session_minutes INTEGER NOT NULL DEFAULT 60,
    goals TEXT NOT NULL DEFAULT '["general"]',
    preferences TEXT NOT NULL DEFAULT '{}',
    skin_type TEXT NOT NULL DEFAULT 'unknown',
    skin_concerns TEXT NOT NULL DEFAULT '[]',
    skin_sensitive INTEGER NOT NULL DEFAULT 0,
    pregnancy_flag INTEGER NOT NULL DEFAULT 0,
    faith_content INTEGER NOT NULL DEFAULT 1,
    units TEXT NOT NULL DEFAULT 'kg',
    ai_memory INTEGER NOT NULL DEFAULT 0,
    save_photos INTEGER NOT NULL DEFAULT 0,
    photo_consent_at TEXT,
    onboarded INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('face','body')),
    file_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT
  );
  CREATE INDEX photos_user ON photos(user_id, kind, created_at);

  CREATE TABLE face_analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_id TEXT REFERENCES photos(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    metrics TEXT NOT NULL,
    report TEXT NOT NULL
  );
  CREATE TABLE body_analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_id TEXT REFERENCES photos(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    report TEXT NOT NULL
  );

  CREATE TABLE programs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    config TEXT NOT NULL,
    plan TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    program_day TEXT,
    duration_min INTEGER,
    session_rpe REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX workouts_user ON workouts(user_id, date);
  CREATE TABLE workout_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    set_index INTEGER NOT NULL,
    weight REAL NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL,
    rpe REAL
  );
  CREATE INDEX sets_workout ON workout_sets(workout_id);

  CREATE TABLE habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'discipline',
    active INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE habit_logs (
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    PRIMARY KEY (habit_id, date)
  );

  CREATE TABLE skincare_routines (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    routine TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE skincare_logs (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    slot TEXT NOT NULL CHECK (slot IN ('am','pm')),
    PRIMARY KEY (user_id, date, slot)
  );

  CREATE TABLE recovery_logs (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    sleep_hours REAL,
    sleep_quality INTEGER,
    energy INTEGER,
    soreness INTEGER,
    PRIMARY KEY (user_id, date)
  );

  CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'personal',
    target_date TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE daily_entries (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    challenge_done INTEGER NOT NULL DEFAULT 0,
    reflection TEXT,
    intention TEXT,
    PRIMARY KEY (user_id, date)
  );

  CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX chat_user ON chat_messages(user_id, id);

  CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE login_attempts (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    window_start INTEGER NOT NULL
  );
  `,
  /* 2 — separate threads for the general assistant and the appearance/skincare coach */ `
  ALTER TABLE chat_messages ADD COLUMN mode TEXT NOT NULL DEFAULT 'assistant';
  `,
  /* 3 — attractiveness/physique ratings (adults, toggleable) */ `
  ALTER TABLE profiles ADD COLUMN show_ratings INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE profiles ADD COLUMN rating_reference TEXT;
  ALTER TABLE face_analyses ADD COLUMN ratings TEXT;
  ALTER TABLE body_analyses ADD COLUMN ratings TEXT;
  `,
];

function open() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "apex.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 3000");
  // IMMEDIATE transaction + version re-check inside it, so concurrent processes
  // (e.g. parallel build workers) can't both run the same migration.
  db.transaction(() => {
    const version = db.pragma("user_version", { simple: true }) as number;
    for (let i = version; i < MIGRATIONS.length; i++) {
      db.exec(MIGRATIONS[i]);
      db.pragma(`user_version = ${i + 1}`);
    }
  }).immediate();
  return db;
}

const g = globalThis as unknown as { __apexDb?: Database.Database };
export const db: Database.Database = g.__apexDb ?? (g.__apexDb = open());

export function json<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
