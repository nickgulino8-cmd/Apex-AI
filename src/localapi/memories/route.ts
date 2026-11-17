import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/auth";
import { id } from "@/lib/util";

/** Memories are only ever written after the user explicitly approves them. */
export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  if (!user.profile.ai_memory || user.isMinor) throw new HttpError(403, "AI memory is turned off in your privacy settings.");
  const b = await body(req, z.object({ content: z.string().trim().min(2).max(200) }));
  const n = (db.prepare("SELECT COUNT(*) n FROM memories WHERE user_id = ?").get(user.id) as { n: number }).n;
  if (n >= 50) throw new HttpError(400, "Memory is full (50 items). Remove some in Profile.");
  db.prepare("INSERT INTO memories (id, user_id, content) VALUES (?,?,?)").run(id(), user.id, b.content);
  return ok({}, 201);
});

export const DELETE = handle(async (req: Request) => {
  const user = await apiUser(req);
  const mid = new URL(req.url).searchParams.get("id");
  if (mid === "all") db.prepare("DELETE FROM memories WHERE user_id = ?").run(user.id);
  else db.prepare("DELETE FROM memories WHERE id = ? AND user_id = ?").run(mid, user.id);
  return ok();
});
