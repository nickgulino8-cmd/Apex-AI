import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { activeProgram } from "@/lib/repo";
import { generateProgram, type ProgramConfig } from "@/lib/engine/program";
import { MUSCLE_GROUPS } from "@/lib/data/exercises";
import { id } from "@/lib/util";

/** Regenerate the active program with new emphasis groups (e.g. from a physique scan). */
export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, z.object({ emphasis: z.array(z.enum(MUSCLE_GROUPS)).max(4) }));
  const p = user.profile;
  const cfg: ProgramConfig = {
    ...(activeProgram(user.id)?.config ?? {
      experience: p.experience, days: p.days_per_week, minutes: p.session_minutes, equipment: p.equipment,
      goal: (p.goals[0] ?? "general") as ProgramConfig["goal"], split: "auto", avoid: [], likes: [],
    }),
    emphasis: b.emphasis,
  } as ProgramConfig;
  const plan = generateProgram(cfg);
  db.transaction(() => {
    db.prepare("UPDATE programs SET active = 0 WHERE user_id = ?").run(user.id);
    db.prepare("INSERT INTO programs (id, user_id, config, plan) VALUES (?,?,?,?)").run(id(), user.id, JSON.stringify(cfg), JSON.stringify(plan));
  })();
  return ok({ plan });
});
