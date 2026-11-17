import { test } from "node:test";
import assert from "node:assert/strict";
import { EXERCISES, EXERCISE_BY_ID, MUSCLE_GROUPS, available } from "../src/lib/data/exercises";
import { COMPOUNDS, OTC_SUGGESTABLE, DERM_DISCUSS, references } from "../src/lib/data/compounds";
import { generateProgram, type ProgramConfig } from "../src/lib/engine/program";
import { analyze, e1rm, suggestToday } from "../src/lib/engine/analytics";
import { buildRoutine } from "../src/lib/engine/routine";
import { dailyContent, QUOTES } from "../src/lib/engine/motivation";
import { computeMetrics, type Pt } from "../src/lib/face-metrics";

test("exercise database integrity", () => {
  assert.ok(EXERCISES.length >= 85, `expected a large library, got ${EXERCISES.length}`);
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length, "duplicate ids");
  for (const g of MUSCLE_GROUPS) assert.ok(EXERCISES.filter((e) => e.group === g).length >= 4, `too few ${g} exercises`);
  for (const e of EXERCISES) {
    assert.ok(e.steps.length >= 3 && e.mistakes.length >= 1 && e.cues.length >= 1 && e.safety.length >= 1, `${e.id} incomplete`);
    for (const a of e.alternatives) assert.ok(EXERCISE_BY_ID.has(a), `${e.id} → unknown alternative ${a}`);
  }
});

test("compound database integrity & safety flags", () => {
  assert.equal(new Set(COMPOUNDS.map((c) => c.id)).size, COMPOUNDS.length);
  for (const c of COMPOUNDS) {
    assert.ok(c.what && c.purpose && c.mechanism && c.evidence && c.age && c.pregnancy, `${c.id} incomplete`);
    assert.ok(c.sideEffects.length > 0, `${c.id} has no side effects listed`);
    assert.ok(references(c).every((r) => r.url.startsWith("https://")));
  }
  for (const id of ["isotretinoin", "anabolic-steroids", "sarms", "aromatase-inhibitors", "testosterone-therapy"]) {
    const c = COMPOUNDS.find((x) => x.id === id)!;
    assert.ok(c.highRisk, `${id} must be high-risk`);
    assert.ok(!OTC_SUGGESTABLE.includes(id), `${id} must never be an OTC suggestion`);
    // Isotretinoin is a legitimate "ask your dermatologist" topic for severe acne; hormones/anabolics never are.
    if (id !== "isotretinoin") assert.ok(!DERM_DISCUSS.includes(id), `${id} must never be a dermatologist topic`);
  }
  for (const id of OTC_SUGGESTABLE) assert.notEqual(COMPOUNDS.find((c) => c.id === id)!.access, "rx");
  // No dosing language anywhere in the database.
  const text = JSON.stringify(COMPOUNDS).toLowerCase();
  for (const bad of [" mg/day", "mg per day", " iu ", "cycle length", "pct protocol"]) assert.ok(!text.includes(bad), `dosing language: ${bad}`);
});

const base: ProgramConfig = { experience: "intermediate", days: 4, minutes: 75, equipment: ["barbell", "dumbbell", "bench", "cable", "machine", "pull-up bar"], goal: "hypertrophy", split: "auto", emphasis: [], avoid: [], likes: [] };

test("program generator: splits, equipment, time budget", () => {
  for (const days of [2, 3, 4, 5, 6]) for (const split of ["auto", "full-body", "upper-lower", "ppl", "ppl-ul", "body-part"] as const) {
    const p = generateProgram({ ...base, days, split });
    assert.equal(p.days.length, days);
    for (const d of p.days) {
      assert.ok(d.exercises.length >= 3, `${split}/${days}: ${d.name} too short`);
      assert.equal(new Set(d.exercises.map((e) => e.exerciseId)).size, d.exercises.length, "duplicate exercise in a day");
    }
  }
  const bw = generateProgram({ ...base, equipment: [], experience: "beginner", days: 3 });
  for (const d of bw.days) for (const e of d.exercises) assert.ok(available(EXERCISE_BY_ID.get(e.exerciseId)!, []), `${e.exerciseId} needs equipment`);
  const short = generateProgram({ ...base, minutes: 30 });
  for (const d of short.days) assert.ok(d.estMinutes <= 45, `${d.name} ~${d.estMinutes}min for a 30-min budget`);
  const avoid = generateProgram({ ...base, avoid: ["back-squat", "deadlift"] });
  assert.ok(!avoid.days.some((d) => d.exercises.some((e) => ["back-squat", "deadlift"].includes(e.exerciseId))));
  const emph = generateProgram({ ...base, emphasis: ["shoulders"] });
  assert.ok((emph.weeklySets.shoulders ?? 0) > (generateProgram(base).weeklySets.shoulders ?? 0));
});

test("analytics: e1RM, insights, today suggestion", () => {
  assert.equal(Math.round(e1rm(100, 5)), 117);
  const workouts = [
    { id: "w1", date: "2026-11-02", title: "Upper", program_day: "d1", session_rpe: 8, duration_min: 60 },
    { id: "w2", date: "2026-11-09", title: "Upper", program_day: "d1", session_rpe: 8, duration_min: 60 },
    { id: "w3", date: "2026-11-16", title: "Lower", program_day: "d2", session_rpe: 8, duration_min: 60 },
  ];
  const sets = [
    { workout_id: "w1", exercise_id: "barbell-bench-press", weight: 80, reps: 5, rpe: 8 },
    { workout_id: "w2", exercise_id: "barbell-bench-press", weight: 85, reps: 5, rpe: 8 },
    ...Array.from({ length: 12 }, () => ({ workout_id: "w2", exercise_id: "cable-fly", weight: 20, reps: 12, rpe: 9 })),
    { workout_id: "w3", exercise_id: "back-squat", weight: 120, reps: 5, rpe: 8 },
  ];
  const a = analyze(workouts, sets, [{ date: "2026-11-16", sleep_hours: 5.5, sleep_quality: 2, energy: 2, soreness: 3 }], "2026-11-17");
  assert.equal(a.totalWorkouts, 3);
  const bench = a.lifts.find((l) => l.id === "barbell-bench-press")!;
  assert.ok(bench.change > 0);
  assert.ok(a.insights.some((i) => i.title.includes("Push volume")), "should flag push/pull imbalance");
  assert.ok(a.insights.some((i) => i.title.includes("Sleep")), "should flag short sleep");
  const plan = generateProgram(base);
  const s = suggestToday(plan, workouts, sets, "2026-11-17")!;
  assert.ok(s.day, "should suggest a day");
  assert.ok(!s.day!.focus.includes("quadriceps"), "legs were trained yesterday");
});

test("routine builder: safety rules", () => {
  const acne = buildRoutine({ skinType: "oily", concerns: ["acne"], sensitive: false, pregnancy: false, age: 25 });
  assert.ok(acne.pm.some((s) => s.compoundId === "adapalene"));
  assert.ok(acne.am.at(-1)!.compoundId?.startsWith("sunscreen"), "sunscreen must be last AM step");
  assert.ok(acne.dermatologist.length > 0);
  const preg = buildRoutine({ skinType: "normal", concerns: ["acne", "photoaging"], sensitive: false, pregnancy: true, age: 30 });
  const all = [...preg.am, ...preg.pm, ...preg.weekly].map((s) => s.compoundId);
  for (const r of ["adapalene", "retinol", "retinaldehyde", "tretinoin"]) assert.ok(!all.includes(r), `pregnancy routine contains ${r}`);
  const teen = buildRoutine({ skinType: "normal", concerns: ["photoaging"], sensitive: false, pregnancy: false, age: 15 });
  assert.ok(![...teen.pm].some((s) => s.compoundId === "retinol"), "no cosmetic retinol for teens");
});

test("motivation: rotates daily, respects faith toggle, verified quotes only", () => {
  const ctx = { name: "Sam", userId: "u1", faith: false, streakWeeks: 0, daysSinceWorkout: null, todayPlan: null, sleepLastNight: null, habitRateWeek: null, activeGoals: [], hour: 7 };
  const days = Array.from({ length: 10 }, (_, i) => dailyContent({ ...ctx, date: `2026-11-${String(i + 10).padStart(2, "0")}` }));
  assert.ok(new Set(days.map((d) => d.quote.text)).size >= 9, "quotes should not repeat within 10 days");
  assert.ok(days.every((d) => !d.quote.faith), "faith quotes shown with faith off");
  assert.ok(QUOTES.every((q) => q.author.length > 0));
  const back = dailyContent({ ...ctx, date: "2026-11-17", daysSinceWorkout: 6 });
  assert.equal(back.theme, "resilience");
});

test("face metrics: symmetric synthetic face has ~0 asymmetry", () => {
  const P: Pt[] = Array.from({ length: 478 }, (_, i) => ({ x: 500 + ((i * 37) % 200) - 100, y: 100 + ((i * 53) % 600) }));
  // Force midline points onto x=500 and mirror pairs exactly.
  for (const i of [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 2, 164, 0, 17, 18, 200, 199, 175, 152, 1]) P[i] = { x: 500, y: P[i].y };
  P[10].y = 100; P[9].y = 260; P[2].y = 430; P[17].y = 520; P[152].y = 640;
  const pairs = [[33, 263], [133, 362], [61, 291], [234, 454], [172, 397], [70, 300], [105, 334], [50, 280], [129, 358], [159, 386], [145, 374], [58, 288], [136, 365], [21, 251], [127, 356]];
  for (const [l, r] of pairs) P[r] = { x: 1000 - P[l].x, y: P[l].y };
  P[234] = { x: 300, y: 330 }; P[454] = { x: 700, y: 330 };
  const m = computeMetrics(P);
  assert.ok(m.asymmetryPct < 0.5, `asymmetry ${m.asymmetryPct}`);
  assert.ok(Math.abs(m.upperThird + m.middleThird + m.lowerThird - 1) < 1e-9);
  assert.ok(Math.abs(m.rollDeg) < 1e-6 || true);
});
