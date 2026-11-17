// Client-side mirrors of the server report schemas (kept structurally identical to src/lib/analysis.ts).
export type Extent = "none_visible" | "minimal" | "mild" | "moderate" | "pronounced";
export type FaceReportT = {
  image_quality: { usable: boolean; issues: string[] };
  summary: string;
  skin: { category: string; observation: string; extent: Extent; zones: string[] }[];
  structure: { feature: string; observation: string }[];
  recommendations: { concern: string; compound_ids: string[]; rationale: string; priority: "foundation" | "targeted" | "optional" }[];
  habits: string[];
  professional: { reason: string; urgency: "routine" | "soon" | "prompt" }[];
  dermatologist_topics: string[];
};
export type BodyReportT = {
  image_quality: { usable: boolean; issues: string[] };
  summary: string;
  groups: { group: string; visibility: string; relative_development: "less_developed" | "balanced" | "more_developed" | "cannot_assess"; observation: string }[];
  posture: string[];
  structure_notes: string[];
  priorities: { group: string; why: string; exercise_ids: string[] }[];
  professional: { reason: string; urgency: string }[];
};
