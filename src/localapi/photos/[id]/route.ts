import { db } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { apiUser, HttpError } from "@/lib/auth";
import { readPhoto, deletePhotoFile } from "@/lib/storage";

type Row = { id: string; file_name: string };
const find = (userId: string, id: string) => {
  const r = db.prepare("SELECT id, file_name FROM photos WHERE id = ? AND user_id = ?").get(id, userId) as Row | undefined;
  if (!r) throw new HttpError(404, "Photo not found");
  return r;
};

/** Serve a decrypted photo to its owner only. Never cached by shared caches. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await apiUser(req);
  const r = find(user.id, (await ctx.params).id);
  const blob = await readPhoto(user.id, r.file_name);
  if (!blob) throw new HttpError(404, "Photo file missing");
  return new Response(blob, { headers: { "Content-Type": "image/jpeg" } });
});

export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await apiUser(req);
  const r = find(user.id, (await ctx.params).id);
  await deletePhotoFile(user.id, r.file_name);
  db.prepare("DELETE FROM photos WHERE id = ?").run(r.id);
  return ok();
});
