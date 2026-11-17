import { UPPER } from "./exercises-upper";
import { LOWER } from "./exercises-lower";
import type { Equipment, Exercise, MuscleGroup } from "./exercise-types";
export * from "./exercise-types";

export const EXERCISES: Exercise[] = [...UPPER, ...LOWER];
export const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export const exerciseName = (id: string) => EXERCISE_BY_ID.get(id)?.name ?? id;

/** An exercise is available when every piece of equipment it needs is owned (bodyweight is always owned). */
export function available(e: Exercise, owned: string[]): boolean {
  const have = new Set<string>([...owned, "bodyweight"]);
  return e.equipment.every((q) => have.has(q));
}

export function byGroup(group: MuscleGroup, owned?: string[]) {
  return EXERCISES.filter((e) => e.group === group && (!owned || available(e, owned)));
}

/** Link to external technique videos. We don't host videos; this opens a search, and the UI says so. */
export const videoSearchUrl = (e: Exercise) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${e.name} proper form technique`)}`;

export function searchExercises(opts: { q?: string; group?: string; equipment?: string; difficulty?: string }) {
  const s = (opts.q ?? "").trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (opts.group && e.group !== opts.group) return false;
    if (opts.equipment && !e.equipment.includes(opts.equipment as Equipment)) return false;
    if (opts.difficulty && e.difficulty !== opts.difficulty) return false;
    if (!s) return true;
    return [e.name, e.group, ...e.primary, ...e.secondary, ...e.equipment].join(" ").toLowerCase().includes(s);
  });
}
