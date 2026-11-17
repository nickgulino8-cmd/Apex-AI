"use client";
import initSqlJs, { type Database as SqlDb, type SqlValue } from "sql.js";
import { BASE } from "./base";
import { idbGet, idbSet } from "./idb";

/**
 * On-device SQLite. The whole database runs in the browser (sql.js / WebAssembly) and is
 * persisted to IndexedDB on this device. Nothing is sent to a server.
 *
 * `db` exposes the small subset of the better-sqlite3 API the app uses
 * (prepare().get/all/run, transaction, exec, pragma), so data-access code is unchanged.
 */

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

type Params = unknown[];
const norm = (ps: Params): SqlValue[] => ps.map((v) => (v === undefined ? null : typeof v === "boolean" ? Number(v) : (v as SqlValue)));

let raw: SqlDb | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
let version = 0;

function scheduleSave() {
  version++;
  listeners.forEach((l) => l());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}

/** Persist immediately (also called when the app is backgrounded). */
export async function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (raw) await idbSet("db", raw.export());
}

const isWrite = (sql: string) => !/^\s*(SELECT|PRAGMA\s+\w+\s*$|WITH)/i.test(sql);

class Stmt {
  constructor(private sql: string) {}
  private run_<T>(ps: Params, fn: (s: ReturnType<SqlDb["prepare"]>) => T): T {
    const st = need().prepare(this.sql);
    try {
      st.bind(norm(ps));
      return fn(st);
    } finally {
      st.free();
    }
  }
  get(...ps: Params): unknown {
    return this.run_(ps, (st) => (st.step() ? st.getAsObject() : undefined));
  }
  all(...ps: Params): unknown[] {
    return this.run_(ps, (st) => { const out: unknown[] = []; while (st.step()) out.push(st.getAsObject()); return out; });
  }
  run(...ps: Params): { changes: number } {
    const d = need();
    this.run_(ps, (st) => { st.step(); });
    const changes = d.getRowsModified();
    if (isWrite(this.sql) && !inTx) scheduleSave();
    return { changes };
  }
}

let inTx = false;
function need(): SqlDb {
  if (!raw) throw new Error("Database not ready");
  return raw;
}

export const db = {
  prepare: (sql: string) => new Stmt(sql),
  exec(sql: string) {
    need().exec(sql);
    if (!inTx) scheduleSave();
  },
  pragma(p: string, opts?: { simple: boolean }) {
    const r = need().exec(`PRAGMA ${p}`);
    if (opts?.simple) return r[0]?.values[0]?.[0];
    return r;
  },
  transaction<A extends unknown[], R>(fn: (...a: A) => R) {
    const run = (...a: A): R => {
      if (inTx) return fn(...a);
      const d = need();
      d.exec("BEGIN");
      inTx = true;
      try {
        const r = fn(...a);
        d.exec("COMMIT");
        return r;
      } catch (e) {
        d.exec("ROLLBACK");
        throw e;
      } finally {
        inTx = false;
        scheduleSave();
      }
    };
    return Object.assign(run, { immediate: run });
  },
};

let ready: Promise<void> | null = null;
/** Load (or create) the on-device database. Safe to call repeatedly. */
export function initDb(): Promise<void> {
  return (ready ??= (async () => {
    const SQL = await initSqlJs({ locateFile: (f) => `${BASE}/sqljs/${f}` });
    const saved = await idbGet<Uint8Array>("db");
    raw = saved ? new SQL.Database(saved) : new SQL.Database();
    raw.exec("PRAGMA foreign_keys = ON");
    const version = (raw.exec("PRAGMA user_version")[0]?.values[0]?.[0] as number) ?? 0;
    for (let i = version; i < MIGRATIONS.length; i++) {
      raw.exec("BEGIN");
      raw.exec(MIGRATIONS[i]);
      raw.exec(`PRAGMA user_version = ${i + 1}`);
      raw.exec("COMMIT");
    }
    if (version < MIGRATIONS.length) await flush();
    // Ask the browser not to evict our storage, and save when the app is backgrounded.
    navigator.storage?.persist?.().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void flush(); });
    window.addEventListener("pagehide", () => void flush());
  })().catch((e) => { ready = null; throw e; }));
}

export const dbReady = () => raw !== null;
export const dbVersion = () => version;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
/** Bump the data version so screens re-read (used after imports). */
export const notify = () => { version++; listeners.forEach((l) => l()); };

/** Replace the whole database (backup restore). */
export async function replaceDb(bytes: Uint8Array) {
  const SQL = await initSqlJs({ locateFile: (f) => `${BASE}/sqljs/${f}` });
  const next = new SQL.Database(bytes);
  next.exec("SELECT COUNT(*) FROM users"); // validates it's an APEX database
  raw?.close();
  raw = next;
  raw.exec("PRAGMA foreign_keys = ON");
  await flush();
  notify();
}

export const exportDb = () => need().export();

export function json<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
