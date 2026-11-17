import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/auth";
import { id } from "@/lib/util";

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(
    req,
    z.object({ title: z.string().trim().min(1).max(120), category: z.enum(["fitness", "skin", "discipline", "faith", "personal", "career"]), target_date: z.string().nullable() }),
  );
  db.prepare("INSERT INTO goals (id, user_id, title, category, target_date) VALUES (?,?,?,?,?)").run(id(), user.id, b.title, b.category, b.target_date || null);
  return ok({}, 201);
});

export const PATCH = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, z.object({ id: z.string(), progress: z.number().int().min(0).max(100).optional(), status: z.enum(["active", "done", "archived"]).optional() }));
  const r = db
    .prepare("UPDATE goals SET progress = COALESCE(?, progress), status = COALESCE(?, status) WHERE id = ? AND user_id = ?")
    .run(b.progress ?? null, b.status ?? null, b.id, user.id);
  if (!r.changes) throw new HttpError(404, "Goal not found");
  return ok();
});

export const DELETE = handle(async (req: Request) => {
  const user = await apiUser(req);
  db.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").run(new URL(req.url).searchParams.get("id"), user.id);
  return ok();
});
