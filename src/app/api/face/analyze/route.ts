import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { structured } from "@/lib/ai";
import { FaceReport, FACE_SYSTEM } from "@/lib/analysis";
import { preparePhoto, savePhoto } from "@/lib/photo-pipeline";
import { id } from "@/lib/util";

export const maxDuration = 120;

/**
 * Metrics are computed in the browser from landmarks. Only these few aggregate ratios
 * reach the server — never the landmark mesh — so no biometric template is created or stored.
 */
const Metrics = z.object({
  upperThird: z.number().min(0).max(1),
  middleThird: z.number().min(0).max(1),
  lowerThird: z.number().min(0).max(1),
  asymmetryPct: z.number().min(0).max(100),
  jawToCheekRatio: z.number().min(0).max(3),
  faceWidthToHeight: z.number().min(0).max(3),
  eyeSpacingRatio: z.number().min(0).max(3),
  mouthToNoseRatio: z.number().min(0).max(5),
  chinToLowerThird: z.number().min(0).max(1),
  yawDeg: z.number().min(-90).max(90),
  rollDeg: z.number().min(-90).max(90),
});

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, z.object({ image: z.string().max(9_000_000), metrics: Metrics.nullable(), save: z.boolean(), consent: z.boolean() }));
  const img = preparePhoto(user, b.image, b.consent);
  const p = user.profile;
  const m = b.metrics;
  const prompt = [
    "Analyse this face photo and fill in the report.",
    m
      ? `Approximate landmark measurements (computed on-device): facial thirds upper ${(m.upperThird * 100).toFixed(0)}% / middle ${(m.middleThird * 100).toFixed(0)}% / lower ${(m.lowerThird * 100).toFixed(0)}% (the mesh's top edge sits below the hairline, so the upper third reads short); left-right landmark asymmetry ${m.asymmetryPct.toFixed(1)}% of face width; jaw-to-cheekbone width ratio ${m.jawToCheekRatio.toFixed(2)}; face width-to-height ${m.faceWidthToHeight.toFixed(2)}; inter-eye distance to eye width ${m.eyeSpacingRatio.toFixed(2)}; mouth-to-nose width ${m.mouthToNoseRatio.toFixed(2)}; chin share of lower third ${(m.chinToLowerThird * 100).toFixed(0)}%; head yaw ${m.yawDeg.toFixed(0)}°, roll ${m.rollDeg.toFixed(0)}°.`
      : "No landmark measurements are available (face mesh didn't detect a face); limit structure observations to what is plainly visible.",
    `User context: skin type ${p.skin_type}; self-reported concerns ${p.skin_concerns.join(", ") || "none"}; sensitive skin ${p.skin_sensitive ? "yes" : "no"}; pregnant/trying ${p.pregnancy_flag ? "yes — exclude retinoids from recommendations" : "no"}.`,
  ].join("\n");
  const report = await structured({ system: FACE_SYSTEM, prompt, images: [{ data: img.data.toString("base64"), mediaType: img.mediaType }], schema: FaceReport });
  if (p.pregnancy_flag) for (const r of report.recommendations) r.compound_ids = r.compound_ids.filter((c) => !["retinol", "retinaldehyde", "adapalene"].includes(c));

  const photoId = b.save && report.image_quality.usable ? savePhoto(user, "face", img.data) : null;
  const aid = id();
  if (report.image_quality.usable)
    db.prepare("INSERT INTO face_analyses (id, user_id, photo_id, metrics, report) VALUES (?,?,?,?,?)").run(aid, user.id, photoId, JSON.stringify(m), JSON.stringify(report));
  return ok({ id: report.image_quality.usable ? aid : null, photoId, report });
});
