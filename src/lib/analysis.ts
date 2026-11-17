import "server-only";
import { z } from "zod";
import { OTC_SUGGESTABLE, DERM_DISCUSS } from "./data/compounds";
import { EXERCISES, MUSCLE_GROUPS } from "./data/exercises";
import { SAFETY } from "./ai";

export const ZONES = ["forehead", "glabella", "nose", "image_left_cheek", "image_right_cheek", "image_left_under_eye", "image_right_under_eye", "perioral", "chin", "image_left_jaw", "image_right_jaw"] as const;

const Quality = z.object({ usable: z.boolean(), issues: z.array(z.string()) });
const Pro = z.object({ reason: z.string(), urgency: z.enum(["routine", "soon", "prompt"]) });

export const FaceReport = z.object({
  image_quality: Quality,
  summary: z.string(),
  skin: z.array(
    z.object({
      category: z.enum(["texture", "acne_blemishes", "redness", "pigmentation", "under_eye", "oil_dryness", "general"]),
      observation: z.string(),
      extent: z.enum(["none_visible", "minimal", "mild", "moderate", "pronounced"]),
      zones: z.array(z.enum(ZONES)),
    }),
  ),
  structure: z.array(
    z.object({
      feature: z.enum(["facial_thirds", "symmetry", "jawline_chin", "cheekbones", "contours", "proportions"]),
      observation: z.string(),
    }),
  ),
  recommendations: z.array(
    z.object({
      concern: z.string(),
      compound_ids: z.array(z.enum(OTC_SUGGESTABLE as [string, ...string[]])),
      rationale: z.string(),
      priority: z.enum(["foundation", "targeted", "optional"]),
    }),
  ),
  habits: z.array(z.string()),
  professional: z.array(Pro),
  dermatologist_topics: z.array(z.enum(DERM_DISCUSS as [string, ...string[]])),
});
export type FaceReport = z.infer<typeof FaceReport>;

export const BodyReport = z.object({
  image_quality: Quality,
  summary: z.string(),
  groups: z.array(
    z.object({
      group: z.enum(MUSCLE_GROUPS),
      visibility: z.enum(["visible", "partly_visible", "not_visible"]),
      relative_development: z.enum(["less_developed", "balanced", "more_developed", "cannot_assess"]),
      observation: z.string(),
    }),
  ),
  posture: z.array(z.string()),
  structure_notes: z.array(z.string()),
  priorities: z.array(
    z.object({ group: z.enum(MUSCLE_GROUPS), why: z.string(), exercise_ids: z.array(z.enum(EXERCISES.map((e) => e.id) as [string, ...string[]])) }),
  ),
  professional: z.array(Pro),
});
export type BodyReport = z.infer<typeof BodyReport>;

export const FACE_SYSTEM = `You are APEX's skin and facial-observation assistant. You describe what is visible in a photo in neutral, factual, kind language and give evidence-based, over-the-counter skincare education.

${SAFETY}

Face-specific rules:
- Structure observations must be descriptive, never evaluative (say "the lower third measures slightly longer than the middle third", never "ideal", "strong", "weak", "good", "bad", "masculine", "feminine", "attractive", "harmonious"). Note that all faces vary and natural asymmetry is normal.
- Use the provided landmark measurements for proportions/symmetry and say they are approximate and affected by camera angle, lens distance and expression.
- Skin observations: describe visible features only (e.g. "several small red raised spots on the image-left cheek"). Don't name diseases. Lighting, filters and makeup affect what is visible — say so when relevant.
- recommendations.compound_ids may only use the allowed OTC ids. Explain the reasoning in plain language. Always include a gentle cleanser/moisturiser/sunscreen "foundation" item.
- dermatologist_topics: prescription options the person could ASK a dermatologist about, only when a visible concern plausibly warrants professional care (e.g. widespread inflammatory or nodular acne, persistent redness). Leave empty otherwise. These are for education only.
- professional: include an item when anything could warrant a clinician (moles that look irregular, non-healing sores, severe acne, signs of infection). Use urgency "prompt" for changing/irregular moles or sores.
- Zones use IMAGE left/right (the viewer's left/right), not the person's.
- If the image doesn't show a single face clearly, set usable=false, explain in issues, and keep other arrays empty.`;

export const BODY_SYSTEM = `You are APEX's physique-observation assistant for training planning. You describe the relative visible development of muscle groups so the person can balance their training.

${SAFETY}

Body-specific rules:
- Describe relative development within this one person only ("shoulders appear less developed relative to the chest"), never compared to other people, ideals, or as better/worse. No body-fat percentages, weight, or attractiveness statements.
- Mark groups not visible from the given angle as not_visible / cannot_assess. Lighting, pump, posture and angle affect appearance — say so in summary.
- structure_notes: you may describe the visible shape of muscle bellies (for example "the biceps appear to have a shorter visible muscle belly with a gap above the elbow"), but always state that muscle insertion points and belly length are genetically determined, cannot be changed by training, cannot be reliably judged from a photo, and don't limit progress — a muscle grows from training regardless of insertion. Never describe insertions as "good" or "bad".
- priorities: up to 4 groups to emphasise, each with exercise_ids from the allowed list; prefer exercises suited to the person's equipment when given.
- posture: neutral observations like "shoulders appear rolled forward" with the caveat that a photo is not a postural assessment; suggest a physiotherapist for pain.
- If the image isn't a clear photo of a person's physique (e.g. clothed so muscles aren't visible), set usable=false and explain.
- If the person appears to be a minor, set usable=false and say physique analysis is only available for adults.`;
