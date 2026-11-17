import type { Exercise } from "../data/exercise-types";

/**
 * Double-progression load suggestions: stay at a weight until every set reaches the top of
 * the rep range, then add the smallest sensible increment. If reps fell below the range, hold
 * the weight (or back off after a clear miss) so form stays solid.
 */

export type LastSet = { weight: number; reps: number };
export type Suggestion = { weight: number; reason: string; kind: "increase" | "hold" | "decrease" | "reps" | "first" };

export function parseRange(reps: string): { lo: number; hi: number } | null {
  const m = /(\d+)\s*[–-]\s*(\d+)/.exec(reps);
  if (m) return { lo: Number(m[1]), hi: Number(m[2]) };
  const one = /^(\d+)/.exec(reps.trim());
  return one ? { lo: Number(one[1]), hi: Number(one[1]) } : null;
}

export function increment(ex: Pick<Exercise, "equipment" | "group" | "mechanics">, units: "kg" | "lb"): number {
  const lower = ["quadriceps", "hamstrings", "glutes"].includes(ex.group);
  const barbell = ex.equipment.includes("barbell") || ex.equipment.includes("machine");
  if (units === "lb") return barbell ? (lower && ex.mechanics === "compound" ? 10 : 5) : 5;
  if (barbell) return lower && ex.mechanics === "compound" ? 5 : 2.5;
  return 2; // dumbbells/kettlebells/cables typically step ~2 kg
}

const roundTo = (w: number, step: number) => Math.round(w / step) * step;

export function suggestLoad(ex: Pick<Exercise, "equipment" | "group" | "mechanics">, targetReps: string, last: LastSet[] | undefined, units: "kg" | "lb"): Suggestion | null {
  const range = parseRange(targetReps);
  if (!range) return null; // holds/carries (time or distance)
  if (!last?.length) return { weight: 0, kind: "first", reason: `First time: pick a weight you can lift for ${targetReps} with 2–3 reps to spare.` };
  const weighted = last.filter((s) => s.weight > 0);
  if (!weighted.length) {
    // Bodyweight: progress by reps.
    const allTop = last.every((s) => s.reps >= range.hi);
    return { weight: 0, kind: "reps", reason: allTop ? `You hit ${range.hi}+ on every set. Add load (vest/dumbbell) or use a harder variation.` : `Aim for 1 more rep per set than last time (target ${targetReps}).` };
  }
  const top = Math.max(...weighted.map((s) => s.weight));
  const atTop = weighted.filter((s) => s.weight === top);
  const step = increment(ex, units);
  const minReps = Math.min(...atTop.map((s) => s.reps));
  if (atTop.every((s) => s.reps >= range.hi)) {
    return { weight: roundTo(top + step, step / 2), kind: "increase", reason: `All sets hit ${range.hi}+ at ${top} ${units}. Add ${step} ${units}.` };
  }
  if (minReps < range.lo - 2) {
    const back = Math.min(top - step, roundTo(top * 0.9, step));
    return { weight: back, kind: "decrease", reason: `Reps dropped well below ${range.lo} last time. Back off ~10% and build up again.` };
  }
  if (minReps < range.lo) {
    return { weight: top, kind: "hold", reason: `Stay at ${top} ${units} until every set reaches at least ${range.lo} reps.` };
  }
  return { weight: top, kind: "hold", reason: `Same weight, add a rep where you can. Move up once all sets hit ${range.hi}.` };
}
