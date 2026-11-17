import { db } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/auth";

export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await apiUser(req);
  const { id } = await ctx.params;
  const r = db.prepare("DELETE FROM workouts WHERE id = ? AND user_id = ?").run(id, user.id);
  if (!r.changes) throw new HttpError(404, "Workout not found");
  return ok();
});
