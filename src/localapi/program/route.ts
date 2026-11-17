import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { generateProgram } from "@/lib/engine/program";
import { EQUIPMENT, MUSCLE_GROUPS } from "@/lib/data/exercises";
import { id } from "@/lib/util";

const ConfigSchema = z.object({
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  days: z.number().int().min(2).max(6),
  minutes: z.number().int().min(20).max(150),
  equipment: z.array(z.enum(EQUIPMENT)),
  goal: z.enum(["hypertrophy", "strength", "general", "fat-loss", "athletic"]),
  split: z.enum(["auto", "full-body", "upper-lower", "ppl", "ppl-ul", "body-part"]),
  emphasis: z.array(z.enum(MUSCLE_GROUPS)).max(4),
  avoid: z.array(z.string()).max(50),
  likes: z.array(z.string()).max(50),
});

/** Preview (dry-run) or save a generated program. */
export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, z.object({ config: ConfigSchema, save: z.boolean() }));
  const plan = generateProgram(b.config);
  if (b.save) {
    db.transaction(() => {
      db.prepare("UPDATE programs SET active = 0 WHERE user_id = ?").run(user.id);
      db.prepare("INSERT INTO programs (id, user_id, config, plan) VALUES (?,?,?,?)").run(id(), user.id, JSON.stringify(b.config), JSON.stringify(plan));
      db.prepare("UPDATE profiles SET experience = ?, days_per_week = ?, session_minutes = ?, equipment = ? WHERE user_id = ?").run(
        b.config.experience, b.config.days, b.config.minutes, JSON.stringify(b.config.equipment), user.id,
      );
    })();
  }
  return ok({ plan });
});
