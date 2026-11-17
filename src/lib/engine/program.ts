import { EXERCISES, EXERCISE_BY_ID, available, type Exercise, type MuscleGroup } from "../data/exercises";

/**
 * Deterministic program generator. It encodes widely used programming principles:
 * - Train each muscle roughly 2×/week where the schedule allows.
 * - Compounds first, isolation after.
 * - Rep ranges and effort (RIR) by goal; volume scales with experience.
 * - Double progression: add reps within the range, then add load.
 * The output is a structured plan the UI renders and the workout logger can follow.
 */

export type Goal = "hypertrophy" | "strength" | "general" | "fat-loss" | "athletic";
export type Split = "auto" | "full-body" | "upper-lower" | "ppl" | "ppl-ul" | "body-part";

export type ProgramConfig = {
  experience: "beginner" | "intermediate" | "advanced";
  days: number; // 2–6
  minutes: number; // 30–120
  equipment: string[];
  goal: Goal;
  split: Split;
  emphasis: MuscleGroup[]; // groups to give extra work
  avoid: string[]; // exercise ids to avoid
  likes: string[]; // exercise ids to prefer
};

export type PlannedExercise = {
  exerciseId: string;
  sets: number;
  reps: string;
  rir: string;
  restSec: number;
  note?: string;
};

export type ProgramDay = {
  key: string;
  name: string;
  focus: MuscleGroup[];
  warmup: string[];
  exercises: PlannedExercise[];
  mobility: string[];
  estMinutes: number;
};

export type Program = {
  name: string;
  splitLabel: string;
  summary: string;
  days: ProgramDay[];
  weeklySets: Partial<Record<MuscleGroup, number>>;
  progression: string[];
  recovery: string[];
};

type Slot = { group: MuscleGroup; kind: "compound" | "isolation" | "any" };

const S = (group: MuscleGroup, kind: Slot["kind"] = "any"): Slot => ({ group, kind });

const TEMPLATES: Record<string, { name: string; slots: Slot[] }> = {
  fullA: { name: "Full Body A", slots: [S("quadriceps", "compound"), S("chest", "compound"), S("back", "compound"), S("hamstrings"), S("shoulders", "isolation"), S("biceps"), S("abdominals")] },
  fullB: { name: "Full Body B", slots: [S("hamstrings", "compound"), S("back", "compound"), S("shoulders", "compound"), S("quadriceps"), S("chest"), S("triceps"), S("calves")] },
  fullC: { name: "Full Body C", slots: [S("glutes", "compound"), S("chest", "compound"), S("back", "compound"), S("quadriceps", "isolation"), S("shoulders", "isolation"), S("forearms"), S("abdominals")] },
  upperA: { name: "Upper A — Strength bias", slots: [S("chest", "compound"), S("back", "compound"), S("shoulders", "compound"), S("back", "compound"), S("biceps"), S("triceps")] },
  upperB: { name: "Upper B — Volume bias", slots: [S("back", "compound"), S("chest", "compound"), S("chest", "isolation"), S("shoulders", "isolation"), S("triceps"), S("biceps"), S("forearms")] },
  lowerA: { name: "Lower A — Squat focus", slots: [S("quadriceps", "compound"), S("hamstrings", "compound"), S("quadriceps"), S("calves"), S("abdominals")] },
  lowerB: { name: "Lower B — Hinge focus", slots: [S("hamstrings", "compound"), S("glutes", "compound"), S("quadriceps", "compound"), S("hamstrings", "isolation"), S("calves"), S("abdominals")] },
  push: { name: "Push", slots: [S("chest", "compound"), S("shoulders", "compound"), S("chest"), S("shoulders", "isolation"), S("triceps"), S("triceps", "isolation")] },
  pull: { name: "Pull", slots: [S("back", "compound"), S("back", "compound"), S("back"), S("shoulders", "isolation"), S("biceps"), S("biceps"), S("forearms")] },
  legs: { name: "Legs", slots: [S("quadriceps", "compound"), S("hamstrings", "compound"), S("glutes"), S("quadriceps", "isolation"), S("hamstrings", "isolation"), S("calves"), S("abdominals")] },
  chestDay: { name: "Chest & Core", slots: [S("chest", "compound"), S("chest", "compound"), S("chest", "isolation"), S("chest", "isolation"), S("abdominals"), S("abdominals")] },
  backDay: { name: "Back", slots: [S("back", "compound"), S("back", "compound"), S("back", "compound"), S("back", "isolation"), S("forearms")] },
  legDay: { name: "Legs", slots: [S("quadriceps", "compound"), S("hamstrings", "compound"), S("quadriceps"), S("glutes"), S("hamstrings", "isolation"), S("calves")] },
  shoulderDay: { name: "Shoulders", slots: [S("shoulders", "compound"), S("shoulders", "isolation"), S("shoulders", "isolation"), S("shoulders"), S("abdominals")] },
  armDay: { name: "Arms", slots: [S("triceps", "compound"), S("biceps"), S("triceps"), S("biceps"), S("triceps", "isolation"), S("forearms")] },
};

const SPLITS: Record<Exclude<Split, "auto">, { label: string; days: Record<number, string[]> }> = {
  "full-body": { label: "Full body", days: { 2: ["fullA", "fullB"], 3: ["fullA", "fullB", "fullC"], 4: ["fullA", "fullB", "fullC", "fullA"], 5: ["fullA", "fullB", "fullC", "fullA", "fullB"], 6: ["fullA", "fullB", "fullC", "fullA", "fullB", "fullC"] } },
  "upper-lower": { label: "Upper / Lower", days: { 2: ["upperA", "lowerA"], 3: ["upperA", "lowerA", "upperB"], 4: ["upperA", "lowerA", "upperB", "lowerB"], 5: ["upperA", "lowerA", "upperB", "lowerB", "upperA"], 6: ["upperA", "lowerA", "upperB", "lowerB", "upperA", "lowerA"] } },
  ppl: { label: "Push / Pull / Legs", days: { 2: ["push", "pull"], 3: ["push", "pull", "legs"], 4: ["push", "pull", "legs", "upperA"], 5: ["push", "pull", "legs", "push", "pull"], 6: ["push", "pull", "legs", "push", "pull", "legs"] } },
  "ppl-ul": { label: "PPL + Upper/Lower (5-day)", days: { 2: ["upperA", "lowerA"], 3: ["push", "pull", "legs"], 4: ["upperA", "lowerA", "upperB", "lowerB"], 5: ["push", "pull", "legs", "upperB", "lowerB"], 6: ["push", "pull", "legs", "push", "pull", "legs"] } },
  "body-part": { label: "Muscle-specific (body-part)", days: { 2: ["upperA", "lowerA"], 3: ["push", "pull", "legs"], 4: ["chestDay", "backDay", "legDay", "shoulderDay"], 5: ["chestDay", "backDay", "legDay", "shoulderDay", "armDay"], 6: ["chestDay", "backDay", "legDay", "shoulderDay", "armDay", "legs"] } },
};

export function resolveSplit(cfg: Pick<ProgramConfig, "split" | "days" | "experience">): Exclude<Split, "auto"> {
  if (cfg.split !== "auto") return cfg.split;
  if (cfg.days <= 3) return cfg.experience === "beginner" || cfg.days === 2 ? "full-body" : "ppl";
  if (cfg.days === 4) return "upper-lower";
  if (cfg.days === 5) return "ppl-ul";
  return "ppl";
}

function dosage(goal: Goal, ex: Exercise, exp: ProgramConfig["experience"], first: boolean) {
  const compound = ex.mechanics === "compound";
  const baseSets = exp === "beginner" ? 2 : exp === "intermediate" ? 3 : 3;
  let sets = baseSets + (first && exp !== "beginner" ? 1 : 0);
  let reps = "8–12";
  let rir = "1–3 reps in reserve";
  let restSec = compound ? 150 : 75;
  const isHold = ex.pattern === "plank" || ex.pattern === "carry" || ex.id === "dead-hang";
  switch (goal) {
    case "strength":
      if (compound && first) { reps = "3–6"; rir = "2–3 RIR"; restSec = 180; sets += 1; }
      else if (compound) { reps = "5–8"; rir = "2 RIR"; restSec = 150; }
      else { reps = "8–12"; rir = "1–2 RIR"; }
      break;
    case "hypertrophy":
      reps = compound ? "6–10" : "10–15";
      rir = compound ? "1–3 RIR" : "0–2 RIR";
      break;
    case "fat-loss":
    case "general":
      reps = compound ? "8–12" : "12–15";
      rir = "2–3 RIR";
      restSec = compound ? 105 : 60;
      break;
    case "athletic":
      reps = compound && first ? "3–5 (fast, explosive)" : compound ? "6–8" : "10–12";
      rir = "2–3 RIR";
      restSec = compound ? 150 : 75;
      break;
  }
  if (isHold) { reps = ex.pattern === "carry" ? "30–40 m" : "20–45 s"; rir = "stop before form breaks"; restSec = 60; }
  if (exp === "beginner") rir = "2–3 RIR (leave reps in the tank while learning)";
  return { sets: Math.min(sets, 5), reps, rir, restSec };
}

function pick(slot: Slot, pool: Exercise[], used: Set<string>, cfg: ProgramConfig, rotation: number): Exercise | null {
  let cands = pool.filter((e) => e.group === slot.group && !used.has(e.id) && !cfg.avoid.includes(e.id));
  if (slot.kind !== "any") {
    const k = cands.filter((e) => e.mechanics === slot.kind);
    if (k.length) cands = k;
  }
  if (cfg.experience === "beginner") {
    const easy = cands.filter((e) => e.difficulty !== "advanced");
    if (easy.length) cands = easy;
  }
  if (!cands.length) return null;
  const liked = cands.filter((e) => cfg.likes.includes(e.id));
  if (liked.length) return liked[rotation % liked.length];
  // Prefer free-weight/compound staples for the first compound slots, then rotate for variety.
  const ranked = [...cands].sort((a, b) => score(b) - score(a));
  return ranked[rotation % Math.min(ranked.length, 3)];
}

function score(e: Exercise) {
  let s = 0;
  if (e.mechanics === "compound") s += 2;
  if (e.equipment.includes("barbell") || e.equipment.includes("dumbbell")) s += 1;
  if (e.difficulty === "intermediate") s += 0.5;
  return s;
}

const WARMUPS: Partial<Record<MuscleGroup, string>> = {
  chest: "Band pull-aparts ×15 and 2 light ramp-up sets of the first press",
  back: "Dead hang 20–30 s and scapular pull-ups ×8",
  shoulders: "Arm circles and band external rotations ×12 each side",
  quadriceps: "Bodyweight squats ×10 and leg swings ×10 each side",
  hamstrings: "Hip-hinge drills with a dowel ×10 and leg swings",
  glutes: "Glute bridges ×12 and banded lateral walks",
  abdominals: "Dead bugs ×6 each side",
};

const MOBILITY: Partial<Record<MuscleGroup, string>> = {
  chest: "Doorway pec stretch — 2 × 30 s each side",
  back: "Child's pose with side reach — 2 × 30 s",
  shoulders: "Thread-the-needle thoracic rotation — 8 each side",
  quadriceps: "Half-kneeling hip-flexor stretch — 2 × 30 s each side",
  hamstrings: "Supine hamstring stretch with strap — 2 × 30 s each side",
  glutes: "Figure-four glute stretch — 2 × 30 s each side",
  calves: "Wall calf stretch, straight and bent knee — 30 s each",
};

export function generateProgram(cfg: ProgramConfig): Program {
  const days = Math.max(2, Math.min(6, Math.round(cfg.days)));
  const split = resolveSplit({ ...cfg, days });
  const keys = SPLITS[split].days[days];
  const pool = EXERCISES.filter((e) => available(e, cfg.equipment));
  const weeklySets: Partial<Record<MuscleGroup, number>> = {};
  const seenTemplate: Record<string, number> = {};

  const planDays: ProgramDay[] = keys.map((tk, i) => {
    const t = TEMPLATES[tk];
    const rotation = (seenTemplate[tk] = (seenTemplate[tk] ?? -1) + 1);
    const used = new Set<string>();
    const slots = [...t.slots];
    // Emphasis: add an extra slot for each emphasised group already present on this day.
    for (const g of cfg.emphasis) if (slots.some((s) => s.group === g)) slots.push(S(g, "isolation"));

    const exercises: PlannedExercise[] = [];
    let minutes = 8; // warm-up
    slots.forEach((slot, idx) => {
      const ex = pick(slot, pool, used, cfg, rotation + idx);
      if (!ex) return;
      const d = dosage(cfg.goal, ex, cfg.experience, exercises.length === 0);
      const cost = d.sets * (d.restSec / 60 + 0.75);
      if (minutes + cost > cfg.minutes && exercises.length >= 3) return; // respect the time budget
      used.add(ex.id);
      minutes += cost;
      exercises.push({
        exerciseId: ex.id,
        ...d,
        note: cfg.emphasis.includes(ex.group) ? "Emphasis — a priority area you selected" : undefined,
      });
      weeklySets[ex.group] = (weeklySets[ex.group] ?? 0) + d.sets;
    });
    const focus = [...new Set(exercises.map((e) => EXERCISE_BY_ID.get(e.exerciseId)!.group))];
    return {
      key: `d${i + 1}`,
      name: `Day ${i + 1} · ${t.name}`,
      focus,
      warmup: ["5 min easy cardio (bike, row, brisk walk)", ...focus.map((g) => WARMUPS[g]).filter((x): x is string => !!x).slice(0, 2)],
      exercises,
      mobility: focus.map((g) => MOBILITY[g]).filter((x): x is string => !!x).slice(0, 3),
      estMinutes: Math.round(minutes),
    };
  });

  const goalLabel: Record<Goal, string> = {
    hypertrophy: "muscle growth",
    strength: "strength",
    general: "general fitness",
    "fat-loss": "body recomposition & conditioning",
    athletic: "athletic performance",
  };

  return {
    name: `${SPLITS[split].label} · ${days} days`,
    splitLabel: SPLITS[split].label,
    summary: `A ${days}-day ${SPLITS[split].label.toLowerCase()} plan for ${goalLabel[cfg.goal]}, built for ${cfg.experience} lifters with ${cfg.equipment.join(", ") || "bodyweight"} in about ${cfg.minutes} minutes per session.`,
    days: planDays,
    weeklySets,
    progression: [
      "Double progression: when you hit the top of the rep range on every set with good form, add the smallest available load next session.",
      cfg.experience === "beginner"
        ? "As a beginner you can often add load most sessions on compound lifts — prioritise clean technique over speed of progress."
        : "Track your top set on the first lift of each day; aim for small improvements in reps or load over 3–4 weeks.",
      "Every 4–8 weeks, or when performance drops and you feel run-down, take a lighter week (about half the sets, same exercises).",
      "Swap an exercise only when it causes pain or stalls for 3+ weeks — consistency on the same lifts makes progress measurable.",
    ],
    recovery: [
      "Sleep 7–9 hours; sleep is when most adaptation happens.",
      "Protein intake spread through the day supports muscle repair — a registered dietitian can personalise targets.",
      "Leave at least 48 hours before training the same muscle hard again.",
      "Sharp or joint pain is a stop signal; normal muscle soreness is not. Persistent pain warrants a physiotherapist or doctor.",
    ],
  };
}

export const HYPERTROPHY_EDUCATION = [
  { title: "Mechanical tension drives growth", body: "Muscles grow mainly in response to high tension under load. Sets taken reasonably close to failure (roughly 0–3 reps in reserve) recruit the most muscle fibres, across a wide range of rep counts (about 5–30 reps)." },
  { title: "Volume", body: "Research reviews show a dose-response between weekly sets and growth up to a point. Around 10–20 hard sets per muscle per week is a common evidence-based target for intermediates; beginners grow well on less." },
  { title: "Frequency", body: "Training a muscle about twice per week is a practical way to distribute volume and tends to perform at least as well as once per week for equal volume." },
  { title: "Range of motion", body: "Full range of motion, and in particular training at longer muscle lengths (the stretched position), appears beneficial for hypertrophy in recent studies." },
  { title: "Progressive overload", body: "Increase load, reps or sets over time. Without a progressive demand, adaptation stalls." },
  { title: "Rest periods", body: "Longer rests (2–3 min) on compounds let you keep performance high across sets; 1–2 min is fine for isolation work." },
];

export const STRENGTH_EDUCATION = [
  { title: "Specificity", body: "Strength is skill-specific. To get stronger at a lift, practise that lift (or a close variation) regularly with heavier loads (roughly 1–6 reps)." },
  { title: "Bar speed and technique", body: "Consistent technique makes strength measurable and reduces injury risk. Stop sets before form breaks down." },
  { title: "Peaking and fatigue", body: "Fitness and fatigue build together. Planned lighter weeks let fatigue dissipate so strength gains show up." },
];

export const MOBILITY_EDUCATION = [
  { title: "Train the range you need", body: "Loaded full-range training improves flexibility comparably to stretching for many people. Add targeted stretching where a specific restriction limits a lift." },
  { title: "Static vs dynamic", body: "Dynamic warm-ups before training; longer static stretches are best after training or as a separate session." },
];
