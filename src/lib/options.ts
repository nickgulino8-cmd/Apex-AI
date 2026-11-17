import type { Concern } from "./data/compounds";

export const GOAL_OPTIONS = [
  { v: "hypertrophy", l: "Build muscle" },
  { v: "strength", l: "Get stronger" },
  { v: "general", l: "General fitness" },
  { v: "fat-loss", l: "Recomposition & conditioning" },
  { v: "athletic", l: "Athletic performance" },
] as const;

export const EQUIP_OPTIONS = [
  { v: "dumbbell", l: "Dumbbells" },
  { v: "barbell", l: "Barbell & plates" },
  { v: "bench", l: "Bench" },
  { v: "pull-up bar", l: "Pull-up bar" },
  { v: "kettlebell", l: "Kettlebell" },
  { v: "cable", l: "Cable station" },
  { v: "machine", l: "Machines" },
  { v: "band", l: "Resistance bands" },
] as const;

export const SPLIT_OPTIONS = [
  { v: "auto", l: "Recommend for me" },
  { v: "full-body", l: "Full body" },
  { v: "upper-lower", l: "Upper / Lower" },
  { v: "ppl", l: "Push / Pull / Legs" },
  { v: "ppl-ul", l: "PPL + Upper/Lower" },
  { v: "body-part", l: "Muscle-specific" },
] as const;

export const SKIN_TYPES = [
  { v: "oily", l: "Oily", d: "Shiny by midday, visible pores" },
  { v: "dry", l: "Dry", d: "Tight, flaky, rough patches" },
  { v: "combination", l: "Combination", d: "Oily T-zone, normal/dry cheeks" },
  { v: "normal", l: "Normal", d: "Comfortable, few issues" },
  { v: "sensitive", l: "Sensitive", d: "Stings, flushes or reacts easily" },
  { v: "unknown", l: "Not sure", d: "We'll keep things gentle" },
] as const;

export const CONCERN_OPTIONS: { v: Concern; l: string }[] = [
  { v: "acne", l: "Acne & breakouts" },
  { v: "redness", l: "Redness" },
  { v: "hyperpigmentation", l: "Dark spots / uneven tone" },
  { v: "texture", l: "Rough texture" },
  { v: "dryness", l: "Dryness" },
  { v: "oiliness", l: "Oiliness" },
  { v: "photoaging", l: "Fine lines / sun damage" },
  { v: "under-eye", l: "Under-eye" },
];

export const UNITS = ["kg", "lb"] as const;
