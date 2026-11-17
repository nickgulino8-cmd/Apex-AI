import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { apiUser } from "@/lib/auth";

/** Data portability: everything we hold about the user as JSON (photos listed, not embedded). */
export const GET = handle(async (req: Request) => {
  const user = await apiUser(req);
  const q = (sql: string) => db.prepare(sql).all(user.id);
  const data = {
    exported_at: new Date().toISOString(),
    account: { name: user.name, email: user.email, birth_date: user.birth_date },
    profile: user.profile,
    programs: q("SELECT created_at, active, config, plan FROM programs WHERE user_id = ?"),
    workouts: q("SELECT * FROM workouts WHERE user_id = ?"),
    sets: q("SELECT s.* FROM workout_sets s JOIN workouts w ON w.id = s.workout_id WHERE w.user_id = ?"),
    habits: q("SELECT * FROM habits WHERE user_id = ?"),
    habit_logs: q("SELECT l.* FROM habit_logs l JOIN habits h ON h.id = l.habit_id WHERE h.user_id = ?"),
    skincare_routine: q("SELECT * FROM skincare_routines WHERE user_id = ?"),
    skincare_logs: q("SELECT date, slot FROM skincare_logs WHERE user_id = ?"),
    recovery: q("SELECT * FROM recovery_logs WHERE user_id = ?"),
    goals: q("SELECT * FROM goals WHERE user_id = ?"),
    daily: q("SELECT * FROM daily_entries WHERE user_id = ?"),
    face_analyses: q("SELECT id, created_at, metrics, report FROM face_analyses WHERE user_id = ?"),
    body_analyses: q("SELECT id, created_at, report FROM body_analyses WHERE user_id = ?"),
    photos: q("SELECT id, kind, created_at FROM photos WHERE user_id = ?"),
    chat: q("SELECT role, content, mode, created_at FROM chat_messages WHERE user_id = ?"),
    memories: q("SELECT content, created_at FROM memories WHERE user_id = ?"),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="apex-export.json"`, "Cache-Control": "no-store" },
  });
});
