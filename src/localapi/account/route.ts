import { db, flush } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { deleteAllPhotos } from "@/lib/storage";
import { wipeAll } from "@/lib/idb";

/** Privacy actions: delete all photos, or erase everything APEX stores on this device. */
export const DELETE = handle(async (req: Request) => {
  const user = await apiUser(req);
  const scope = new URL(req.url).searchParams.get("scope");
  await deleteAllPhotos(user.id);
  db.prepare("DELETE FROM photos WHERE user_id = ?").run(user.id);
  if (scope === "photos") return ok();
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id); // cascades to every table
  await flush();
  await wipeAll();
  return ok();
});
