import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/auth";
import { id, isDate } from "@/lib/util";

const owns = (userId: string, habitId: string) => {
  if (!db.prepare("SELECT 1 FROM habits WHERE id = ? AND user_id = ?").get(habitId, userId)) throw new HttpError(404, "Habit not found");
};

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, z.object({ name: z.string().trim().min(1).max(80), category: z.string().max(20).default("discipline") }));
  const n = (db.prepare("SELECT COUNT(*) n FROM habits WHERE user_id = ? AND active = 1").get(user.id) as { n: number }).n;
  if (n >= 20) throw new HttpError(400, "Keep it focused — 20 habits maximum.");
  db.prepare("INSERT INTO habits (id, user_id, name, category, sort) VALUES (?,?,?,?,?)").run(id(), user.id, b.name, b.category, n);
  return ok({}, 201);
});

export const PATCH = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, z.object({ habitId: z.string(), date: z.string().refine(isDate), done: z.boolean() }));
  owns(user.id, b.habitId);
  if (b.done) db.prepare("INSERT OR IGNORE INTO habit_logs (habit_id, date) VALUES (?,?)").run(b.habitId, b.date);
  else db.prepare("DELETE FROM habit_logs WHERE habit_id = ? AND date = ?").run(b.habitId, b.date);
  return ok();
});

export const DELETE = handle(async (req: Request) => {
  const user = await apiUser(req);
  const hid = new URL(req.url).searchParams.get("id") ?? "";
  owns(user.id, hid);
  db.prepare("UPDATE habits SET active = 0 WHERE id = ?").run(hid);
  return ok();
});
