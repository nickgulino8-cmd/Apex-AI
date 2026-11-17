import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { isDate } from "@/lib/util";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(
    req,
    z.object({
      date: z.string().refine(isDate),
      sleep_hours: z.number().min(0).max(16).nullable(),
      sleep_quality: z.number().int().min(1).max(5).nullable(),
      energy: z.number().int().min(1).max(5).nullable(),
      soreness: z.number().int().min(1).max(5).nullable(),
    }),
  );
  db.prepare(
    `INSERT INTO recovery_logs (user_id, date, sleep_hours, sleep_quality, energy, soreness) VALUES (?,?,?,?,?,?)
     ON CONFLICT(user_id, date) DO UPDATE SET sleep_hours=excluded.sleep_hours, sleep_quality=excluded.sleep_quality, energy=excluded.energy, soreness=excluded.soreness`,
  ).run(user.id, b.date, b.sleep_hours, b.sleep_quality, b.energy, b.soreness);
  return ok();
});
