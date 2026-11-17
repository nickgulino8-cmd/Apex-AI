import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { structured } from "@/lib/ai";
import { BodyReport, BODY_SYSTEM } from "@/lib/analysis";
import { preparePhoto, savePhoto } from "@/lib/photo-pipeline";
import { EXERCISES, available } from "@/lib/data/exercises";
import { id } from "@/lib/util";

export const maxDuration = 120;

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(
    req,
    z.object({ images: z.array(z.object({ image: z.string().max(9_000_000), view: z.enum(["front", "back", "side"]) })).min(1).max(3), save: z.boolean(), consent: z.boolean() }),
  );
  const imgs = b.images.map((x) => ({ ...preparePhoto(user, x.image, b.consent), view: x.view }));
  const owned = EXERCISES.filter((e) => available(e, user.profile.equipment)).map((e) => e.id);
  const report = await structured({
    system: BODY_SYSTEM,
    prompt: `Photos provided (in order): ${imgs.map((i) => i.view).join(", ")}. Training experience: ${user.profile.experience}. Goals: ${user.profile.goals.join(", ")}. Exercises available with their equipment: ${owned.join(", ")}.`,
    images: imgs.map((i) => ({ data: i.data.toString("base64"), mediaType: i.mediaType })),
    schema: BodyReport,
  });
  let photoId: string | null = null;
  if (b.save && report.image_quality.usable) for (const i of imgs) photoId = savePhoto(user, "body", i.data);
  const aid = id();
  if (report.image_quality.usable) db.prepare("INSERT INTO body_analyses (id, user_id, photo_id, report) VALUES (?,?,?,?)").run(aid, user.id, photoId, JSON.stringify(report));
  return ok({ id: report.image_quality.usable ? aid : null, report });
});
