import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { EQUIPMENT } from "@/lib/data/exercises";

const Concerns = z.enum(["acne", "redness", "hyperpigmentation", "texture", "dryness", "oiliness", "photoaging", "under-eye", "sensitivity", "hair"]);
const Schema = z
  .object({
    name: z.string().trim().min(1).max(60),
    experience: z.enum(["beginner", "intermediate", "advanced"]),
    equipment: z.array(z.enum(EQUIPMENT)).max(12),
    days_per_week: z.number().int().min(2).max(6),
    session_minutes: z.number().int().min(20).max(150),
    goals: z.array(z.enum(["hypertrophy", "strength", "general", "fat-loss", "athletic"])).min(1).max(3),
    preferences: z.object({
      likes: z.array(z.string().max(60)).max(30).optional(),
      avoid: z.array(z.string().max(60)).max(30).optional(),
      injuries: z.string().max(500).optional(),
      split: z.string().max(20).optional(),
    }),
    skin_type: z.enum(["oily", "dry", "combination", "normal", "sensitive", "unknown"]),
    skin_concerns: z.array(Concerns).max(10),
    skin_sensitive: z.boolean(),
    pregnancy_flag: z.boolean(),
    faith_content: z.boolean(),
    units: z.enum(["kg", "lb"]),
    ai_memory: z.boolean(),
    save_photos: z.boolean(),
    onboarded: z.boolean(),
  })
  .partial();

const JSON_FIELDS = new Set(["equipment", "goals", "preferences", "skin_concerns"]);

export const PATCH = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, Schema);
  if (b.name) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(b.name, user.id);
  // Minors: photo saving and AI memory stay off regardless of request.
  if (user.isMinor) {
    b.save_photos = false;
    b.ai_memory = false;
  }
  const entries = Object.entries(b).filter(([k]) => k !== "name");
  if (entries.length) {
    const sets = entries.map(([k]) => `${k} = ?`).join(", ");
    const vals = entries.map(([k, v]) => (JSON_FIELDS.has(k) ? JSON.stringify(v) : typeof v === "boolean" ? Number(v) : v));
    db.prepare(`UPDATE profiles SET ${sets} WHERE user_id = ?`).run(...vals, user.id);
  }
  if (b.ai_memory === false) db.prepare("DELETE FROM memories WHERE user_id = ?").run(user.id);
  return ok();
});
