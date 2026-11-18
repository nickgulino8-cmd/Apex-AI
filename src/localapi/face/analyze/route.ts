import { z } from "zod";
import { db } from "@/lib/db";
import { handle, body, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { structured, AiUnavailableError } from "@/lib/ai";
import { FaceRating, FACE_RATING_SYSTEM } from "@/lib/ratings";
import { combineRatings } from "@/lib/ratings-combine";
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
  canthalTiltDeg: z.number().min(-45).max(45),
  fwhr: z.number().min(0).max(5),
  midfaceRatio: z.number().min(0).max(5),
});

export const POST = handle(async (req: Request) => {
  const user = await apiUser(req);
  const b = await body(req, z.object({ image: z.string().max(9_000_000), extraImages: z.array(z.string().max(9_000_000)).max(2).default([]), metrics: Metrics.nullable(), save: z.boolean(), consent: z.boolean() }));
  const img = preparePhoto(user, b.image, b.consent);
  // Extra shots from the same session are used only to steady the rating; they are never stored.
  const extras = b.extraImages.map((x) => preparePhoto(user, x, b.consent));
  const p = user.profile;
  const m = b.metrics;
  const prompt = [
    "Analyse this face photo and fill in the report.",
    m
      ? `Approximate landmark measurements (computed on-device): facial thirds upper ${(m.upperThird * 100).toFixed(0)}% / middle ${(m.middleThird * 100).toFixed(0)}% / lower ${(m.lowerThird * 100).toFixed(0)}% (the mesh's top edge sits below the hairline, so the upper third reads short); left-right landmark asymmetry ${m.asymmetryPct.toFixed(1)}% of face width; jaw-to-cheekbone width ratio ${m.jawToCheekRatio.toFixed(2)}; face width-to-height ${m.faceWidthToHeight.toFixed(2)}; inter-eye distance to eye width ${m.eyeSpacingRatio.toFixed(2)}; mouth-to-nose width ${m.mouthToNoseRatio.toFixed(2)}; chin share of lower third ${(m.chinToLowerThird * 100).toFixed(0)}%; canthal tilt ${m.canthalTiltDeg.toFixed(1)}°; FWHR ${m.fwhr.toFixed(2)}; midface ratio (IPD ÷ eye-line-to-upper-lip) ${m.midfaceRatio.toFixed(2)}; head yaw ${m.yawDeg.toFixed(0)}°, roll ${m.rollDeg.toFixed(0)}°.`
      : "No landmark measurements are available (face mesh didn't detect a face); limit structure observations to what is plainly visible.",
    `User context: skin type ${p.skin_type}; self-reported concerns ${p.skin_concerns.join(", ") || "none"}; sensitive skin ${p.skin_sensitive ? "yes" : "no"}; pregnant/trying ${p.pregnancy_flag ? "yes — exclude retinoids from recommendations" : "no"}.`,
  ].join("\n");
  const image = [{ data: img.base64, mediaType: img.mediaType }];
  const wantRating = p.show_ratings && !user.isMinor;
  // Ratings run in parallel as their own calls (one per shot), so a declined rating never blocks the skin report.
  const ratingPrompt = `${prompt}\nAccount holder's age (confirmed by date of birth at setup): ${user.age}.\nDimorphism reference selected by the user: ${p.rating_reference ?? "none selected"}.\nRate this face.`;
  const shots = [img, ...extras];
  const [reportRes, ...ratingRes] = await Promise.allSettled([
    structured({ system: FACE_SYSTEM, prompt, images: image, schema: FaceReport }),
    ...(wantRating ? shots.map((s) => structured({ system: FACE_RATING_SYSTEM, prompt: ratingPrompt, images: [{ data: s.base64, mediaType: s.mediaType }], schema: FaceRating })) : []),
  ]);
  if (reportRes.status === "rejected") throw reportRes.reason;
  const report = reportRes.value as Awaited<ReturnType<typeof structured<typeof FaceReport>>>;
  const ratingValues = ratingRes.map((r) => (r.status === "fulfilled" ? (r.value as FaceRating) : null));
  const ratings = wantRating ? combineRatings(ratingValues) : null;
  const firstErr = ratingRes.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
  const declined = ratingValues.find((r) => r && !r.ratable);
  const rating_error = !wantRating || ratings
    ? null
    : declined ? declined.reason_if_not || "This photo couldn't be rated."
      : firstErr ? (firstErr.reason instanceof AiUnavailableError ? firstErr.reason.message : "Rating unavailable for this photo.") : "Rating unavailable for this photo.";

  const PREG_EXCLUDE = ["retinol", "retinaldehyde", "adapalene", "tretinoin", "tazarotene", "trifarotene", "isotretinoin", "spironolactone", "hydroquinone", "finasteride"];
  if (p.pregnancy_flag) {
    report.prescription_options = report.prescription_options.filter((o) => !PREG_EXCLUDE.includes(o.compound_id));
  }

  const photoId = b.save && report.image_quality.usable ? await savePhoto(user, "face", img.data) : null;
  const aid = id();
  if (report.image_quality.usable)
    db.prepare("INSERT INTO face_analyses (id, user_id, photo_id, metrics, report, ratings) VALUES (?,?,?,?,?,?)").run(
      aid, user.id, photoId, JSON.stringify(m), JSON.stringify(report), ratings ? JSON.stringify(ratings) : null,
    );
  return ok({ id: report.image_quality.usable ? aid : null, photoId, report: { ...report, ratings, rating_error } });
});
