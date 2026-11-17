import { COMPOUND_BY_ID, type Concern } from "../data/compounds";

/**
 * Rule-based skincare routine builder. It reflects common dermatologist guidance:
 * gentle cleanser + moisturiser + daily sunscreen as the foundation, one well-chosen
 * active per concern, retinoids at night, exfoliating acids on non-retinoid nights,
 * one new active at a time, and pregnancy-safe substitutions.
 * Only OTC products are placed in a routine. Prescription options are shown separately
 * as "ask a dermatologist about" education.
 */

export type SkinType = "oily" | "dry" | "combination" | "normal" | "sensitive" | "unknown";
export type RoutineInput = {
  skinType: SkinType;
  concerns: Concern[];
  sensitive: boolean;
  pregnancy: boolean;
  age: number;
};

export type Step = { step: string; compoundId?: string; product: string; how: string; frequency?: string };
export type Routine = { am: Step[]; pm: Step[]; weekly: Step[]; notes: string[]; warnings: string[]; dermatologist: string[] };

const cleanser = (t: SkinType): Step => ({
  step: "Cleanse",
  product: t === "oily" ? "Gentle foaming or gel cleanser" : t === "dry" || t === "sensitive" ? "Cream or non-foaming hydrating cleanser" : "Gentle, fragrance-free cleanser",
  how: "Lukewarm water, 30–60 seconds, pat dry. Avoid scrubs and hot water.",
});

const moisturiser = (t: SkinType, night = false): Step => ({
  step: "Moisturise",
  compoundId: t === "dry" || t === "sensitive" ? "ceramides" : "glycerin",
  product:
    t === "oily" ? "Lightweight, non-comedogenic gel moisturiser (glycerin/niacinamide)" : t === "dry" ? `Richer cream with ceramides${night ? "; petrolatum on very dry areas" : ""}` : "Fragrance-free moisturiser with ceramides or glycerin",
  how: night ? "Apply after treatments; buffer a retinoid by applying moisturiser first if it irritates." : "Apply to slightly damp skin.",
});

const sunscreen: Step = {
  step: "Protect",
  compoundId: "sunscreen-mineral",
  product: "Broad-spectrum SPF 30+ (mineral or chemical — the one you'll wear daily)",
  how: "Last step every morning, about two finger-lengths for face and neck. Reapply every 2 hours outdoors or after sweating.",
};

export function buildRoutine(input: RoutineInput): Routine {
  const { skinType, concerns, pregnancy, age } = input;
  const sensitive = input.sensitive || skinType === "sensitive";
  const has = (c: Concern) => concerns.includes(c);
  const am: Step[] = [cleanser(skinType)];
  const pm: Step[] = [cleanser(skinType)];
  const weekly: Step[] = [];
  const notes: string[] = [];
  const warnings: string[] = [];
  const dermatologist: string[] = [];

  // Morning treatment
  if (has("hyperpigmentation") || has("photoaging") || has("under-eye")) {
    am.push({ step: "Treat", compoundId: "vitamin-c", product: "Vitamin C serum", how: "A few drops before moisturiser. Store away from light; discard if it turns brown.", frequency: sensitive ? "Every other morning to start" : "Daily" });
  } else if (has("redness") || has("oiliness") || has("acne")) {
    am.push({ step: "Treat", compoundId: "niacinamide", product: "Niacinamide serum (2–5% is usually enough)", how: "Before moisturiser.", frequency: "Daily" });
  }
  if (has("acne") && !sensitive) {
    am.splice(0, 1, { ...cleanser(skinType), compoundId: "benzoyl-peroxide", product: "Benzoyl peroxide wash (2.5–5%)", how: "Leave on 1–2 minutes then rinse. Use white towels — it bleaches fabric." });
  }
  am.push(moisturiser(skinType), sunscreen);

  // Evening treatment
  let retinoidNight = false;
  if (pregnancy) {
    notes.push("Pregnancy/trying to conceive: retinoids are left out. Azelaic acid and niacinamide are commonly considered compatible — confirm with your obstetrician or dermatologist.");
    if (has("acne") || has("redness") || has("hyperpigmentation"))
      pm.push({ step: "Treat", compoundId: "azelaic-acid", product: "Azelaic acid (OTC strength)", how: "Thin layer after cleansing.", frequency: "Nightly once tolerated" });
  } else if (has("acne") && age >= 12) {
    retinoidNight = true;
    pm.push({ step: "Treat", compoundId: "adapalene", product: "Adapalene 0.1% gel (OTC)", how: "Pea-sized amount for the whole face on dry skin. Expect dryness and possibly a mild flare for the first few weeks.", frequency: sensitive ? "Every 3rd night, building up" : "Every other night for 2 weeks, then nightly if tolerated" });
  } else if ((has("photoaging") || has("texture") || has("under-eye")) && age >= 18) {
    retinoidNight = true;
    pm.push({ step: "Treat", compoundId: "retinol", product: "Retinol (start low strength)", how: "Pea-sized amount on dry skin, avoiding the lash line and corners of the nose/mouth.", frequency: "2–3 nights/week, increasing slowly" });
  } else if (has("redness") || has("hyperpigmentation")) {
    pm.push({ step: "Treat", compoundId: "azelaic-acid", product: "Azelaic acid", how: "Thin layer after cleansing.", frequency: "Nightly once tolerated" });
  }
  if (has("redness") && retinoidNight && !pm.some((s) => s.compoundId === "niacinamide") && !am.some((s) => s.compoundId === "niacinamide")) {
    am.splice(1, 0, { step: "Calm", compoundId: "niacinamide", product: "Niacinamide serum", how: "Before moisturiser.", frequency: "Daily" });
  }
  if (has("dryness")) pm.push({ step: "Hydrate", compoundId: "hyaluronic-acid", product: "Hyaluronic acid serum", how: "On damp skin, before moisturiser." });
  pm.push(moisturiser(skinType, true));

  // Exfoliation
  if ((has("texture") || has("acne") || has("oiliness") || has("hyperpigmentation")) && !sensitive) {
    const acid = has("acne") || has("oiliness") ? "salicylic-acid" : "lactic-acid";
    weekly.push({
      step: "Exfoliate",
      compoundId: acid,
      product: acid === "salicylic-acid" ? "Salicylic acid (BHA) leave-on 0.5–2%" : "Lactic or mandelic acid (AHA)",
      how: retinoidNight ? "Only on nights you skip the retinoid — never the same night." : "In place of the evening treatment.",
      frequency: "1–2× per week, increase to 3× if well tolerated",
    });
  } else if (sensitive && has("texture")) {
    weekly.push({ step: "Exfoliate", compoundId: "pha", product: "PHA (gluconolactone) toner", how: "Gentlest acid option.", frequency: "1× per week" });
  }

  // Compatibility & safety notes
  if (retinoidNight && weekly.length) warnings.push("Retinoid + exfoliating acid on the same night commonly causes irritation — alternate nights.");
  if (am.some((s) => s.compoundId === "benzoyl-peroxide") && retinoidNight) notes.push("Benzoyl peroxide in the morning and a retinoid at night is a well-studied acne combination. Prescription tretinoin is the exception: some formulations are inactivated by benzoyl peroxide.");
  if (retinoidNight || weekly.length || am.some((s) => s.compoundId === "vitamin-c")) warnings.push("Daily sunscreen is non-negotiable with retinoids, acids and pigment treatments.");
  if (sensitive) notes.push("Sensitive skin: introduce one new product at a time, two weeks apart, after a patch test on the jawline or inner arm.");
  else notes.push("Introduce one active at a time and wait 2–4 weeks before adding the next, so you know what's helping or irritating.");
  notes.push("Most actives take 8–12 weeks of consistent use to judge. Acne often looks worse before it looks better on retinoids.");
  if (has("under-eye")) notes.push("Under-eye darkness has several causes (pigment, visible blood vessels, shadowing from structure, sleep). Sunscreen and sleep help some causes; topical products have limited evidence.");
  if (age < 18) notes.push("For teens, a simple routine works best. Talk to a parent or doctor before starting new active products.");

  // When to see a dermatologist (education, never prescribing)
  if (has("acne")) {
    dermatologist.push("Acne that is painful, deep (nodules/cysts), leaving scars or dark marks, or not improving after ~3 months of OTC care should be seen by a dermatologist. They may discuss prescription options such as topical tretinoin, clindamycin combinations, oral antibiotics, hormonal therapy or isotretinoin.");
  }
  if (has("redness")) dermatologist.push("Persistent facial redness with flushing, bumps or visible vessels can be rosacea or another condition — a dermatologist can confirm and discuss treatments like azelaic acid, metronidazole, ivermectin or laser.");
  if (has("hyperpigmentation")) dermatologist.push("Patchy brown pigmentation (especially symmetrical patches on cheeks/forehead) may be melasma; prescription options and procedures exist. Any spot that is changing, irregular, or bleeding needs prompt evaluation.");
  if (has("hair")) dermatologist.push("Hair thinning has many causes (genetics, stress, thyroid, iron, medications). A dermatologist can identify the cause before treatment.");

  // Validate every referenced compound exists (guards against typos in rules)
  for (const s of [...am, ...pm, ...weekly]) if (s.compoundId && !COMPOUND_BY_ID.has(s.compoundId)) s.compoundId = undefined;

  return { am, pm, weekly, notes, warnings, dermatologist };
}
