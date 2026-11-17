import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { isDate } from "@/lib/util";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, z.object({ date: z.string().refine(isDate), slot: z.enum(["am", "pm"]), done: z.boolean() }));
  if (b.done) db.prepare("INSERT OR IGNORE INTO skincare_logs (user_id, date, slot) VALUES (?,?,?)").run(user.id, b.date, b.slot);
  else db.prepare("DELETE FROM skincare_logs WHERE user_id = ? AND date = ? AND slot = ?").run(user.id, b.date, b.slot);
  return ok();
});
