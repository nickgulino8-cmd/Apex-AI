import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { buildRoutine } from "@/lib/engine/routine";

const Concern = z.enum(["acne", "redness", "hyperpigmentation", "texture", "dryness", "oiliness", "photoaging", "under-eye", "sensitivity", "hair"]);

/** Build a routine from inputs; optionally save it (and the inputs) to the profile. */
export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(
    req,
    z.object({
      skinType: z.enum(["oily", "dry", "combination", "normal", "sensitive", "unknown"]),
      concerns: z.array(Concern).max(10),
      sensitive: z.boolean(),
      pregnancy: z.boolean(),
      save: z.boolean(),
    }),
  );
  const routine = buildRoutine({ ...b, age: user.age });
  if (b.save) {
    db.prepare(
      `INSERT INTO skincare_routines (user_id, routine, updated_at) VALUES (?,?,datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET routine = excluded.routine, updated_at = excluded.updated_at`,
    ).run(user.id, JSON.stringify(routine));
    db.prepare("UPDATE profiles SET skin_type = ?, skin_concerns = ?, skin_sensitive = ?, pregnancy_flag = ? WHERE user_id = ?").run(
      b.skinType, JSON.stringify(b.concerns), Number(b.sensitive), Number(b.pregnancy), user.id,
    );
  }
  return ok({ routine });
});
