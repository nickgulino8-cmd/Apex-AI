import { db } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/auth";
import { deletePhotoFile } from "@/lib/storage";

/** Delete an analysis and its linked photo (if any). */
export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const user = await apiUser(req);
  const { kind, id } = await ctx.params;
  const table = kind === "face" ? "face_analyses" : kind === "body" ? "body_analyses" : null;
  if (!table) throw new HttpError(404, "Not found");
  const r = db.prepare(`SELECT photo_id FROM ${table} WHERE id = ? AND user_id = ?`).get(id, user.id) as { photo_id: string | null } | undefined;
  if (!r) throw new HttpError(404, "Analysis not found");
  if (r.photo_id) {
    const p = db.prepare("SELECT file_name FROM photos WHERE id = ? AND user_id = ?").get(r.photo_id, user.id) as { file_name: string } | undefined;
    if (p) deletePhotoFile(user.id, p.file_name);
    db.prepare("DELETE FROM photos WHERE id = ?").run(r.photo_id);
  }
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  return ok();
});
