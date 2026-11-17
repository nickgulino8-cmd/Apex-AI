import { EXERCISE_BY_ID, MUSCLE_GROUPS, GROUP_LABEL, type MuscleGroup } from "../data/exercises";
import type { Program } from "./program";

export type WorkoutRow = { id: string; date: string; title: string; program_day: string | null; session_rpe: number | null; duration_min: number | null };
export type SetRow = { workout_id: string; exercise_id: string; weight: number; reps: number; rpe: number | null };
export type RecoveryRow = { date: string; sleep_hours: number | null; sleep_quality: number | null; energy: number | null; soreness: number | null };

/** Epley estimated 1RM — only meaningful for sets of ~12 reps or fewer. */
export const e1rm = (w: number, r: number) => (r <= 0 || w <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30));

const d = (s: string) => new Date(s + "T12:00:00");
const daysBetween = (a: string, b: string) => Math.round((d(b).getTime() - d(a).getTime()) / 864e5);
const weekStart = (s: string) => {
  const x = d(s);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x.toISOString().slice(0, 10);
};

export type Insight = { kind: "good" | "warn" | "info"; title: string; body: string };

export function analyze(workouts: WorkoutRow[], sets: SetRow[], recovery: RecoveryRow[], today: string, program?: Program | null) {
  const byWorkout = new Map<string, SetRow[]>();
  for (const s of sets) (byWorkout.get(s.workout_id) ?? byWorkout.set(s.workout_id, []).get(s.workout_id)!).push(s);
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));

  // Weekly sessions for the last 12 weeks
  const weeks: { week: string; sessions: number; sets: number }[] = [];
  const thisWeek = weekStart(today);
  for (let i = 11; i >= 0; i--) {
    const w = d(thisWeek);
    w.setDate(w.getDate() - i * 7);
    weeks.push({ week: w.toISOString().slice(0, 10), sessions: 0, sets: 0 });
  }
  const weekIdx = new Map(weeks.map((w, i) => [w.week, i]));
  for (const w of sorted) {
    const i = weekIdx.get(weekStart(w.date));
    if (i !== undefined) {
      weeks[i].sessions++;
      weeks[i].sets += byWorkout.get(w.id)?.length ?? 0;
    }
  }

  // Training-day calendar (last 84 days)
  const trainedDays = new Set(sorted.map((w) => w.date));

  // Muscle-group sets in the last 7 and 28 days
  const groupSets = (sinceDays: number) => {
    const out = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<MuscleGroup, number>;
    for (const w of sorted) {
      if (daysBetween(w.date, today) >= sinceDays) continue;
      for (const s of byWorkout.get(w.id) ?? []) {
        const ex = EXERCISE_BY_ID.get(s.exercise_id);
        if (ex) out[ex.group]++;
      }
    }
    return out;
  };
  const last7 = groupSets(7);
  const last28 = groupSets(28);

  // Strength progression: best e1RM per session per exercise
  const progress = new Map<string, { date: string; e1rm: number; best: string }[]>();
  for (const w of sorted) {
    const best = new Map<string, { v: number; s: SetRow }>();
    for (const s of byWorkout.get(w.id) ?? []) {
      if (s.reps > 12 || s.weight <= 0) continue;
      const v = e1rm(s.weight, s.reps);
      const cur = best.get(s.exercise_id);
      if (!cur || v > cur.v) best.set(s.exercise_id, { v, s });
    }
    for (const [ex, { v, s }] of best) {
      const arr = progress.get(ex) ?? [];
      arr.push({ date: w.date, e1rm: Math.round(v * 10) / 10, best: `${s.weight} × ${s.reps}` });
      progress.set(ex, arr);
    }
  }
  const lifts = [...progress.entries()]
    .map(([id, pts]) => ({
      id,
      name: EXERCISE_BY_ID.get(id)?.name ?? id,
      points: pts,
      change: pts.length > 1 ? Math.round(((pts.at(-1)!.e1rm - pts[0].e1rm) / pts[0].e1rm) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.points.length - a.points.length);

  // Streaks
  let streakWeeks = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].sessions > 0) streakWeeks++;
    else if (i === weeks.length - 1) continue; // current week may be in progress
    else break;
  }
  const lastWorkout = sorted.at(-1)?.date ?? null;
  const daysSinceLast = lastWorkout ? daysBetween(lastWorkout, today) : null;

  // Insights
  const insights: Insight[] = [];
  const target = program?.days.length ?? 3;
  const recentWeeks = weeks.slice(-4);
  const avg = recentWeeks.reduce((a, w) => a + w.sessions, 0) / 4;
  if (sorted.length === 0) {
    insights.push({ kind: "info", title: "No workouts logged yet", body: "Log your first session and APEX will start tracking consistency, volume and strength trends." });
  } else {
    if (avg >= target * 0.9) insights.push({ kind: "good", title: "Consistency is on point", body: `You've averaged ${avg.toFixed(1)} sessions/week over the last 4 weeks against a plan of ${target}.` });
    else if (avg > 0) insights.push({ kind: "warn", title: "Consistency below plan", body: `Averaging ${avg.toFixed(1)} sessions/week vs ${target} planned. If time is the limiter, a shorter plan you finish beats a longer one you skip.` });

    const push = last28.chest + last28.shoulders + last28.triceps;
    const pull = last28.back + last28.biceps;
    if (push >= 6 && (pull === 0 || push / pull > 1.5))
      insights.push({ kind: "warn", title: "Push volume outweighs pulling", body: `Last 28 days: ${push} pushing sets vs ${pull} pulling sets. Adding rows or pulldowns helps shoulder balance and posture.` });

    const neglected = MUSCLE_GROUPS.filter((g) => last28[g] === 0 && g !== "forearms");
    if (neglected.length && neglected.length < MUSCLE_GROUPS.length)
      insights.push({ kind: "info", title: "Untrained in the last 4 weeks", body: neglected.map((g) => GROUP_LABEL[g]).join(", ") + "." });

    for (const g of MUSCLE_GROUPS) {
      const wk = last28[g] / 4;
      if (wk > 22) insights.push({ kind: "warn", title: `High ${GROUP_LABEL[g].toLowerCase()} volume`, body: `~${wk.toFixed(0)} sets/week. If recovery or performance suffers, trim sets — more isn't always better.` });
    }

    for (const l of lifts.slice(0, 6)) {
      const pts = l.points.filter((p) => daysBetween(p.date, today) <= 35);
      if (pts.length >= 4) {
        const first = pts[0].e1rm, last = pts.at(-1)!.e1rm;
        if (last <= first) insights.push({ kind: "info", title: `${l.name} has plateaued`, body: "No estimated-1RM gain over ~5 weeks. Options: check sleep/recovery, add a set, adjust the rep range, or take a lighter week." });
        else insights.push({ kind: "good", title: `${l.name} trending up`, body: `Estimated 1RM up ${(((last - first) / first) * 100).toFixed(1)}% over the last ~5 weeks.` });
      }
    }

    const hardSessions = sorted.slice(-4).filter((w) => (w.session_rpe ?? 0) >= 9).length;
    if (hardSessions >= 3) insights.push({ kind: "warn", title: "Sessions are consistently near max effort", body: "3+ of your last 4 sessions were rated RPE 9–10. Consider a lighter session to manage fatigue." });
  }

  const rec = recovery.filter((r) => daysBetween(r.date, today) < 7);
  const sleepVals = rec.map((r) => r.sleep_hours).filter((x): x is number => x != null);
  const avgSleep = sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : null;
  if (avgSleep != null && avgSleep < 7)
    insights.push({ kind: "warn", title: "Sleep is below 7 hours", body: `7-day average: ${avgSleep.toFixed(1)} h. Most adults need 7–9 h; short sleep impairs recovery and strength.` });
  const sore = rec.map((r) => r.soreness).filter((x): x is number => x != null);
  if (sore.length && sore.reduce((a, b) => a + b, 0) / sore.length >= 4)
    insights.push({ kind: "warn", title: "Soreness is running high", body: "Average soreness ≥4/5 this week. Prioritise sleep, keep volume steady and avoid adding sets for now." });

  return { weeks, trainedDays: [...trainedDays], last7, last28, lifts, streakWeeks, lastWorkout, daysSinceLast, insights, avgSleep, totalWorkouts: sorted.length };
}

/** "What should I train today?" — next program day whose muscles are recovered (≥48 h). */
export function suggestToday(program: Program | null, workouts: WorkoutRow[], sets: SetRow[], today: string) {
  if (!program) return null;
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  const recentGroups = new Set<MuscleGroup>();
  const ids = new Set(sorted.filter((w) => daysBetween(w.date, today) < 2).map((w) => w.id));
  for (const s of sets) if (ids.has(s.workout_id)) { const ex = EXERCISE_BY_ID.get(s.exercise_id); if (ex) recentGroups.add(ex.group); }
  const lastDayKey = [...sorted].reverse().find((w) => w.program_day)?.program_day;
  const idx = program.days.findIndex((d) => d.key === lastDayKey);
  const order = program.days.map((_, i) => program.days[(idx + 1 + i) % program.days.length]);
  const trainedToday = sorted.some((w) => w.date === today);
  const ready = order.find((day) => !day.focus.some((g) => recentGroups.has(g) && g !== "abdominals" && g !== "forearms" && g !== "calves"));
  return {
    day: ready ?? null,
    trainedToday,
    reason: trainedToday
      ? "You've already trained today. Recovery is training too."
      : ready
        ? recentGroups.size
          ? `Next in your rotation that avoids muscles trained in the last 48 h (${[...recentGroups].map((g) => GROUP_LABEL[g]).join(", ")}).`
          : "Next day in your program rotation."
        : "Every program day overlaps with muscles you trained in the last 48 h — a rest or mobility day is a good call.",
  };
}
