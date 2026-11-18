// Client-side mirrors of the server report schemas (kept structurally identical to src/lib/analysis.ts).
export type Extent = "none_visible" | "minimal" | "mild" | "moderate" | "pronounced";
export type FaceReportT = {
  image_quality: { usable: boolean; issues: string[] };
  summary: string;
  skin: { category: string; observation: string; extent: Extent; zones: string[] }[];
  detected_skin_type?: "oily" | "dry" | "combination" | "normal" | "sensitive" | "unknown";
  detected_concerns?: string[];
  /** Older reports only. */
  structure?: { feature: string; observation: string }[];
  recommendations?: { concern: string; compound_ids: string[]; rationale: string; priority: "foundation" | "targeted" | "optional" }[];
  habits?: string[];
  professional: { reason: string; urgency: "routine" | "soon" | "prompt" }[];
  prescription_options: { compound_id: string; for_concern: string; why: string; expect: string }[];
  ratings?: RatingT | null;
  rating_error?: string | null;
};
export type BodyReportT = {
  image_quality: { usable: boolean; issues: string[] };
  summary: string;
  groups: { group: string; visibility: string; relative_development: "less_developed" | "balanced" | "more_developed" | "cannot_assess"; observation: string }[];
  posture: string[];
  structure_notes: string[];
  priorities: { group: string; why: string; exercise_ids: string[] }[];
  professional: { reason: string; urgency: string }[];
  ratings?: RatingT | null;
  rating_error?: string | null;
};
export type ImproveT = { action: string; detail: string; impact: "small" | "moderate" | "large" };
export type PillarT = { pillar: string; score: number; evidence: string; note: string; improve?: ImproveT[] };
export type RatingT = {
  ratable: boolean;
  reason_if_not: string;
  overall: { score: number; low: number; high: number };
  pillars: PillarT[];
  leans_toward: string;
  leans_summary: string;
  strengths: string[];
  /** Older ratings only; newer ones carry per-pillar `improve`. */
  modifiable?: { area: string; suggestion: string; impact: "small" | "moderate" | "large" }[];
  caveats: string[];
};
