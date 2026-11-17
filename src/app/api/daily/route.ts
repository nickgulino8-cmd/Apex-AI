import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { isDate } from "@/lib/util";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(
    req,
    z.object({ date: z.string().refine(isDate), challenge_done: z.boolean().optional(), reflection: z.string().max(4000).optional(), intention: z.string().max(300).optional() }),
  );
  db.prepare("INSERT OR IGNORE INTO daily_entries (user_id, date) VALUES (?,?)").run(user.id, b.date);
  if (b.challenge_done !== undefined) db.prepare("UPDATE daily_entries SET challenge_done = ? WHERE user_id = ? AND date = ?").run(Number(b.challenge_done), user.id, b.date);
  if (b.reflection !== undefined) db.prepare("UPDATE daily_entries SET reflection = ? WHERE user_id = ? AND date = ?").run(b.reflection, user.id, b.date);
  if (b.intention !== undefined) db.prepare("UPDATE daily_entries SET intention = ? WHERE user_id = ? AND date = ?").run(b.intention, user.id, b.date);
  return ok();
});
