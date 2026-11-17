import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser, destroySession, HttpError } from "@/lib/auth";
import { deleteAllPhotos } from "@/lib/storage";

/** Privacy actions: delete all photos, or delete the whole account (password confirmation required). */
export const DELETE = handle(async (req: Request) => {
  const user = await apiUser(req);
  const scope = new URL(req.url).searchParams.get("scope");
  if (scope === "photos") {
    deleteAllPhotos(user.id);
    db.prepare("DELETE FROM photos WHERE user_id = ?").run(user.id);
    return ok();
  }
  const b = await body(req, z.object({ password: z.string() }));
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string };
  if (!(await bcrypt.compare(b.password, row.password_hash))) throw new HttpError(401, "Password is incorrect.");
  deleteAllPhotos(user.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id); // cascades to every table
  await destroySession();
  return ok();
});
