import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/auth";
import { EXERCISE_BY_ID } from "@/lib/data/exercises";
import { id, isDate } from "@/lib/util";

const Schema = z.object({
  date: z.string().refine(isDate),
  title: z.string().trim().min(1).max(80),
  program_day: z.string().max(10).nullable(),
  duration_min: z.number().int().min(0).max(600).nullable(),
  session_rpe: z.number().min(1).max(10).nullable(),
  notes: z.string().max(2000).nullable(),
  sets: z
    .array(z.object({ exercise_id: z.string(), weight: z.number().min(0).max(2000), reps: z.number().int().min(0).max(500), rpe: z.number().min(1).max(10).nullable() }))
    .min(1, "Add at least one set")
    .max(200),
});

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, Schema);
  for (const s of b.sets) if (!EXERCISE_BY_ID.has(s.exercise_id)) throw new HttpError(400, `Unknown exercise: ${s.exercise_id}`);
  const wid = id();
  db.transaction(() => {
    db.prepare("INSERT INTO workouts (id, user_id, date, title, program_day, duration_min, session_rpe, notes) VALUES (?,?,?,?,?,?,?,?)").run(
      wid, user.id, b.date, b.title, b.program_day, b.duration_min, b.session_rpe, b.notes,
    );
    const ins = db.prepare("INSERT INTO workout_sets (workout_id, exercise_id, set_index, weight, reps, rpe) VALUES (?,?,?,?,?,?)");
    b.sets.forEach((s, i) => ins.run(wid, s.exercise_id, i, s.weight, s.reps, s.rpe));
  })();
  return ok({ id: wid }, 201);
});
