import "server-only";
import { db, json } from "./db";
import { id, today as todayStr, addDays } from "./util";
import type { Program, ProgramConfig } from "./engine/program";
import type { RecoveryRow, SetRow, WorkoutRow } from "./engine/analytics";
import type { Routine } from "./engine/routine";
import { DEFAULT_HABITS } from "./engine/motivation";

/** Data-access helpers shared by pages, API routes and the AI assistant. */

export function activeProgram(userId: string): { id: string; config: ProgramConfig; plan: Program; created_at: string } | null {
  const r = db.prepare("SELECT id, config, plan, created_at FROM programs WHERE user_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1").get(userId) as
    | { id: string; config: string; plan: string; created_at: string }
    | undefined;
  return r ? { id: r.id, created_at: r.created_at, config: json(r.config, {} as ProgramConfig), plan: json(r.plan, {} as Program) } : null;
}

export function workoutData(userId: string, sinceDays = 365) {
  const since = addDays(todayStr(), -sinceDays);
  const workouts = db
    .prepare("SELECT id, date, title, program_day, session_rpe, duration_min FROM workouts WHERE user_id = ? AND date >= ? ORDER BY date")
    .all(userId, since) as WorkoutRow[];
  const sets = db
    .prepare(
      `SELECT s.workout_id, s.exercise_id, s.weight, s.reps, s.rpe FROM workout_sets s JOIN workouts w ON w.id = s.workout_id
       WHERE w.user_id = ? AND w.date >= ? ORDER BY w.date, s.set_index`,
    )
    .all(userId, since) as SetRow[];
  const recovery = db
    .prepare("SELECT date, sleep_hours, sleep_quality, energy, soreness FROM recovery_logs WHERE user_id = ? AND date >= ? ORDER BY date")
    .all(userId, since) as RecoveryRow[];
  return { workouts, sets, recovery };
}

export function ensureHabits(userId: string, faith: boolean) {
  const n = (db.prepare("SELECT COUNT(*) n FROM habits WHERE user_id = ?").get(userId) as { n: number }).n;
  if (n > 0) return;
  const ins = db.prepare("INSERT INTO habits (id, user_id, name, category, sort) VALUES (?,?,?,?,?)");
  DEFAULT_HABITS.filter((h) => faith || h.category !== "faith").forEach((h, i) => ins.run(id(), userId, h.name, h.category, i));
}

export type HabitWithLogs = { id: string; name: string; category: string; done: boolean; last7: number };
export function habitsFor(userId: string, date: string): HabitWithLogs[] {
  const rows = db.prepare("SELECT id, name, category FROM habits WHERE user_id = ? AND active = 1 ORDER BY sort, name").all(userId) as {
    id: string;
    name: string;
    category: string;
  }[];
  const since = addDays(date, -6);
  return rows.map((h) => ({
    ...h,
    done: !!db.prepare("SELECT 1 FROM habit_logs WHERE habit_id = ? AND date = ?").get(h.id, date),
    last7: (db.prepare("SELECT COUNT(*) n FROM habit_logs WHERE habit_id = ? AND date BETWEEN ? AND ?").get(h.id, since, date) as { n: number }).n,
  }));
}

export function habitHistory(userId: string, days: number, end: string) {
  const start = addDays(end, -(days - 1));
  const total = (db.prepare("SELECT COUNT(*) n FROM habits WHERE user_id = ? AND active = 1").get(userId) as { n: number }).n;
  const rows = db
    .prepare(
      `SELECT l.date, COUNT(*) n FROM habit_logs l JOIN habits h ON h.id = l.habit_id
       WHERE h.user_id = ? AND h.active = 1 AND l.date BETWEEN ? AND ? GROUP BY l.date`,
    )
    .all(userId, start, end) as { date: string; n: number }[];
  const map = new Map(rows.map((r) => [r.date, r.n]));
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(start, i);
    return { date: d, done: map.get(d) ?? 0, total };
  });
}

export function skincareRoutine(userId: string): Routine | null {
  const r = db.prepare("SELECT routine FROM skincare_routines WHERE user_id = ?").get(userId) as { routine: string } | undefined;
  return r ? json<Routine | null>(r.routine, null) : null;
}

export function skincareHistory(userId: string, days: number, end: string) {
  const start = addDays(end, -(days - 1));
  const rows = db.prepare("SELECT date, slot FROM skincare_logs WHERE user_id = ? AND date BETWEEN ? AND ?").all(userId, start, end) as {
    date: string;
    slot: "am" | "pm";
  }[];
  const set = new Set(rows.map((r) => `${r.date}:${r.slot}`));
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(start, i);
    return { date: d, am: set.has(`${d}:am`), pm: set.has(`${d}:pm`) };
  });
}

export type Goal = { id: string; title: string; category: string; target_date: string | null; progress: number; status: string };
export function goalsFor(userId: string): Goal[] {
  return db.prepare("SELECT id, title, category, target_date, progress, status FROM goals WHERE user_id = ? ORDER BY status = 'active' DESC, created_at DESC").all(userId) as Goal[];
}

export function memoriesFor(userId: string) {
  return db.prepare("SELECT id, content, created_at FROM memories WHERE user_id = ? ORDER BY created_at").all(userId) as { id: string; content: string; created_at: string }[];
}

export function dailyEntry(userId: string, date: string) {
  return (db.prepare("SELECT challenge_done, reflection, intention FROM daily_entries WHERE user_id = ? AND date = ?").get(userId, date) as
    | { challenge_done: number; reflection: string | null; intention: string | null }
    | undefined) ?? { challenge_done: 0, reflection: null, intention: null };
}
