import { COMPOUNDS, ACCESS_LABEL, type Compound } from "../data/compounds";
import { EXERCISES, GROUP_LABEL, MUSCLE_GROUPS, available, exerciseName, byGroup, type MuscleGroup } from "../data/exercises";
import { analyze, suggestToday } from "./analytics";
import { buildRoutine, type SkinType } from "./routine";
import { activeProgram, goalsFor, habitsFor, memoriesFor, skincareHistory, skincareRoutine, workoutData } from "../repo";
import type { User } from "../auth";
import { today } from "../util";
import { db, json } from "../db";

/**
 * Builds the personal context the AI assistant sees, and a local (no-API) assistant that
 * answers the core question types directly from the user's data and APEX's databases.
 */

const GROUP_WORDS: Record<MuscleGroup, string[]> = {
  chest: ["chest", "pec", "pecs"],
  back: ["back", "lat", "lats", "traps"],
  shoulders: ["shoulder", "shoulders", "delt", "delts"],
  biceps: ["bicep", "biceps"],
  triceps: ["tricep", "triceps"],
  forearms: ["forearm", "forearms", "grip"],
  quadriceps: ["quad", "quads", "quadriceps", "thigh"],
  hamstrings: ["hamstring", "hamstrings", "hammies"],
  glutes: ["glute", "glutes", "butt"],
  calves: ["calf", "calves"],
  abdominals: ["abs", "ab", "core", "abdominals", "abdominal", "six pack"],
};

const has = (t: string, words: string[]) => words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(t));

function matchCompounds(t: string): Compound[] {
  const lower = t.toLowerCase();
  const found: Compound[] = [];
  for (const c of COMPOUNDS) {
    const names = [c.name.replace(/\(.*?\)/g, "").trim(), ...(c.aka ?? [])].map((n) => n.toLowerCase()).filter((n) => n.length > 2);
    if (names.some((n) => lower.includes(n))) found.push(c);
  }
  return found;
}

export function buildContext(user: User): string {
  const d = today();
  const p = user.profile;
  const prog = activeProgram(user.id);
  const { workouts, sets, recovery } = workoutData(user.id, 90);
  const a = analyze(workouts, sets, recovery, d, prog?.plan);
  const routine = skincareRoutine(user.id);
  const skin = skincareHistory(user.id, 14, d);
  const habits = habitsFor(user.id, d);
  const goals = goalsFor(user.id).filter((g) => g.status === "active");
  const mem = p.ai_memory ? memoriesFor(user.id) : [];
  const recent = [...workouts].slice(-5).map((w) => {
    const s = sets.filter((x) => x.workout_id === w.id);
    const byEx = [...new Set(s.map((x) => x.exercise_id))].map((ex) => {
      const xs = s.filter((x) => x.exercise_id === ex);
      return `${exerciseName(ex)} ${xs.map((x) => `${x.weight}${p.units}×${x.reps}`).join(", ")}`;
    });
    return `- ${w.date} ${w.title}${w.session_rpe ? ` (RPE ${w.session_rpe})` : ""}: ${byEx.join("; ")}`;
  });
  const sug = suggestToday(prog?.plan ?? null, workouts, sets, d);
  return [
    `Today: ${d}. User: ${user.name.split(" ")[0]}, ${user.isMinor ? "UNDER 18 — apply extra caution, keep advice conservative, encourage involving a parent/guardian and doctor" : "adult"}.`,
    `Training: ${p.experience}, ${p.days_per_week} days/week, ${p.session_minutes} min, equipment: ${p.equipment.join(", ")}, goals: ${p.goals.join(", ")}.`,
    p.preferences.injuries ? `Injuries/limitations noted by user: ${p.preferences.injuries}` : "",
    prog ? `Active program: ${prog.plan.name}. Days: ${prog.plan.days.map((x) => `${x.key}=${x.name} [${x.exercises.map((e) => exerciseName(e.exerciseId)).join(", ")}]`).join(" | ")}` : "No active program.",
    sug?.day ? `Suggested today: ${sug.day.name} — ${sug.reason}` : sug ? `Suggestion: ${sug.reason}` : "",
    `Workouts logged (90d): ${a.totalWorkouts}; streak ${a.streakWeeks} weeks; last workout ${a.lastWorkout ?? "never"}.`,
    `Sets last 28 days by muscle: ${MUSCLE_GROUPS.map((g) => `${g} ${a.last28[g]}`).join(", ")}.`,
    a.lifts.length ? `Strength trends (e1RM change): ${a.lifts.slice(0, 6).map((l) => `${l.name} ${l.change >= 0 ? "+" : ""}${l.change}%`).join(", ")}.` : "",
    recent.length ? `Recent sessions:\n${recent.join("\n")}` : "",
    a.avgSleep != null ? `Average sleep (7d): ${a.avgSleep.toFixed(1)} h.` : "",
    a.insights.length ? `Analytics flags: ${a.insights.map((i) => i.title).join("; ")}.` : "",
    `Skin: type ${p.skin_type}, concerns ${p.skin_concerns.join(", ") || "none listed"}${p.skin_sensitive ? ", sensitive" : ""}${p.pregnancy_flag ? ", pregnant/trying to conceive" : ""}.`,
    routine ? `Saved routine — AM: ${routine.am.map((s) => s.product).join(" → ")}. PM: ${routine.pm.map((s) => s.product).join(" → ")}. Weekly: ${routine.weekly.map((s) => s.product).join(", ") || "none"}.` : "No saved skincare routine.",
    `Skincare adherence last 14 days: AM ${skin.filter((x) => x.am).length}/14, PM ${skin.filter((x) => x.pm).length}/14.`,
    habits.length ? `Habits (done in last 7 days): ${habits.map((h) => `${h.name} ${h.last7}/7`).join(", ")}.` : "",
    goals.length ? `Active goals: ${goals.map((g) => `${g.title} (${g.progress}%)`).join("; ")}.` : "",
    (() => {
      if (!p.show_ratings || user.isMinor) return "";
      const r = db.prepare("SELECT created_at, ratings FROM face_analyses WHERE user_id = ? AND ratings IS NOT NULL ORDER BY created_at DESC LIMIT 1").get(user.id) as { created_at: string; ratings: string } | undefined;
      const fr = r ? json<{ overall: { score: number }; pillars: { pillar: string; score: number; improve?: { action: string }[] }[]; leans_toward: string } | null>(r.ratings, null) : null;
      return fr ? `Latest facial rating (${r!.created_at.slice(0, 10)}, user opted in): ${fr.overall.score}/10; pillars ${fr.pillars.map((x) => `${x.pillar} ${x.score}`).join(", ")}; leans toward ${fr.leans_toward}; improvement plan: ${fr.pillars.map((x) => `${x.pillar}: ${(x.improve ?? []).map((i) => i.action).join("; ")}`).join(" | ")}. You may discuss it and how to improve modifiable areas, but don't produce new ratings.` : "";
    })(),
    mem.length ? `Things the user asked you to remember:\n${mem.map((m) => `- ${m.content}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Local deterministic assistant — real answers from the user's data when no AI key is configured. */
export function localAnswer(user: User, q: string): string {
  const t = q.toLowerCase();
  const d = today();
  const p = user.profile;

  if (/\b(dose|dosage|dosing|cycle|stack|pct|sarm|trenbolone|tren|anavar|dbol|test e|test cyp|how much .* take|where (to )?(buy|get))\b/i.test(q) && /(steroid|sarm|test|tren|anavar|dbol|hgh|peptide|anastrozole|letrozole|arimidex|aromatase|finasteride|accutane|isotretinoin|tretinoin|clomid)/i.test(q)) {
    return "I can't help with doses, cycles, stacking, post-cycle protocols or sourcing for prescription or controlled drugs. That needs to happen with a doctor who can examine you and monitor bloodwork.\n\nWhat I can do is explain what a substance is, how it works and its known risks. Search it in **Skincare → Database**, or ask me \"what are the side effects of …\".";
  }

  if (has(t, ["train today", "workout today", "what should i train", "what should i do today", "today's workout"]) || /train(ing)? today/.test(t)) {
    const prog = activeProgram(user.id);
    if (!prog) return "You don't have an active program yet. Head to **Fitness → Program builder**, enter your schedule and equipment, and I'll generate one. Then I can tell you what to train each day.";
    const { workouts, sets } = workoutData(user.id, 30);
    const s = suggestToday(prog.plan, workouts, sets, d)!;
    if (!s.day) return s.reason;
    return `**${s.day.name}**\n\n${s.reason}\n\n${s.day.exercises.map((e) => `- ${exerciseName(e.exerciseId)} — ${e.sets} × ${e.reps} (${e.rir})`).join("\n")}\n\nEstimated time: ~${s.day.estMinutes} min. Start it from **Fitness → Log workout**.`;
  }

  const groups = MUSCLE_GROUPS.filter((g) => has(t, GROUP_WORDS[g]));
  if (groups.length && /(exercise|target|work|hit|build|train|grow|movement)/.test(t)) {
    return groups
      .map((g) => {
        const list = byGroup(g, p.equipment);
        const all = byGroup(g);
        return `**${GROUP_LABEL[g]}** — ${list.length} exercises with your equipment${list.length < all.length ? ` (${all.length} total)` : ""}:\n${list
          .slice(0, 8)
          .map((e) => `- **${e.name}** (${e.mechanics}, ${e.difficulty}) — ${e.primary.join(", ")}`)
          .join("\n")}`;
      })
      .join("\n\n") + "\n\nOpen **Exercises** for form guides, common mistakes and animated demos.";
  }

  const comps = matchCompounds(q);
  if (comps.length >= 2 && /(differ|vs|versus|compare|better|or)/.test(t)) {
    const [a, b] = comps;
    const row = (label: string, x: string, y: string) => `| ${label} | ${x} | ${y} |`;
    return [
      `| | ${a.name} | ${b.name} |`,
      "|---|---|---|",
      row("Access", ACCESS_LABEL[a.access], ACCESS_LABEL[b.access]),
      row("Used for", a.purpose, b.purpose),
      row("How it works", a.mechanism, b.mechanism),
      row("Evidence", a.evidence, b.evidence),
      row("Main side effects", a.sideEffects.slice(0, 2).join("; "), b.sideEffects.slice(0, 2).join("; ")),
      row("Pregnancy", a.pregnancy, b.pregnancy),
      "",
      "This is educational. Which option fits you depends on your skin and history, so a dermatologist or pharmacist is the right person to decide.",
    ].join("\n");
  }
  if (comps.length) {
    const c = comps[0];
    return `**${c.name}** · ${ACCESS_LABEL[c.access]}${c.highRisk ? " · ⚠️ high-risk medication" : ""}\n\n${c.what}\n\n**Used for:** ${c.purpose}\n\n**How it works:** ${c.mechanism}\n\n**Evidence (${c.evidenceLevel}):** ${c.evidence}\n\n**Side effects:** ${c.sideEffects.join("; ")}\n\n**Avoid if:** ${c.contraindications.join("; ") || "No major contraindications listed"}\n\n**Age:** ${c.age}\n\nFull entry with references is in **Skincare → Database**.${c.access !== "otc" ? " This is a prescription medicine. Talk to a doctor about whether it's appropriate for you." : ""}`;
  }

  if (/(skincare|skin care|routine)/.test(t)) {
    const r = skincareRoutine(user.id) ?? buildRoutine({ skinType: p.skin_type as SkinType, concerns: p.skin_concerns as never, sensitive: p.skin_sensitive, pregnancy: p.pregnancy_flag, age: user.age });
    return `Here's how to order your routine. **Thinnest to thickest. Treatments before moisturiser. Sunscreen last in the morning.**\n\n**Morning**\n${r.am.map((s, i) => `${i + 1}. ${s.step}: ${s.product}`).join("\n")}\n\n**Evening**\n${r.pm.map((s, i) => `${i + 1}. ${s.step}: ${s.product}`).join("\n")}${r.weekly.length ? `\n\n**Weekly**\n${r.weekly.map((s) => `- ${s.product} — ${s.frequency}`).join("\n")}` : ""}${r.warnings.length ? `\n\n⚠️ ${r.warnings.join(" ")}` : ""}\n\nCustomise it in **Skincare → Routine builder**.`;
  }

  if (/(history|progress|how am i doing|trend|show)/.test(t) && /(workout|training|lift|strength|history|progress)/.test(t)) {
    const { workouts, sets, recovery } = workoutData(user.id, 120);
    const a = analyze(workouts, sets, recovery, d, activeProgram(user.id)?.plan);
    if (!a.totalWorkouts) return "No workouts logged yet. Once you log a few sessions I'll show consistency, volume per muscle and strength trends.";
    return `**${a.totalWorkouts} workouts** in the last 120 days · **${a.streakWeeks}-week** streak · last session ${a.lastWorkout}.\n\n${a.lifts.slice(0, 5).map((l) => `- ${l.name}: estimated 1RM ${l.points.at(-1)!.e1rm}${p.units} (${l.change >= 0 ? "+" : ""}${l.change}% since first logged)`).join("\n")}\n\n${a.insights.map((i) => `${i.kind === "good" ? "✅" : i.kind === "warn" ? "⚠️" : "•"} **${i.title}.** ${i.body}`).join("\n")}`;
  }

  if (/(habit|focus|this week|week)/.test(t)) {
    const hs = habitsFor(user.id, d).sort((a, b) => a.last7 - b.last7);
    if (!hs.length) return "You don't have habits set up yet. Add some on **Home**.";
    const weak = hs.slice(0, 2);
    const strong = hs.at(-1)!;
    return `This week, focus on:\n${weak.map((h) => `- **${h.name}** — ${h.last7}/7 days. Make it easier: attach it to something you already do daily.`).join("\n")}\n\nKeep protecting **${strong.name}** (${strong.last7}/7). That one is becoming part of who you are.`;
  }

  const ex = EXERCISES.find((e) => t.includes(e.name.toLowerCase()) || t.includes(e.id.replace(/-/g, " ")));
  if (ex) {
    return `**${ex.name}** — ${ex.primary.join(", ")}${available(ex, p.equipment) ? "" : " (needs equipment you haven't listed)"}\n\n${ex.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n**Common mistakes:** ${ex.mistakes.join("; ")}\n\n**Cues:** ${ex.cues.join(" · ")}`;
  }

  return "I'm running in **offline mode** right now. Conversational AI needs an API key on the server. I can still answer these directly from your data:\n\n- *What should I train today?*\n- *What exercises target my chest?*\n- *What does niacinamide do?*\n- *Difference between adapalene and tretinoin?*\n- *How should I organise my skincare routine?*\n- *What does my workout history show?*\n- *What habits should I focus on this week?*";
}
