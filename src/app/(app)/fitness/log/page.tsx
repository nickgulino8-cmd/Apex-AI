"use client";
import { useLocalView, useSP } from "@/components/Local";
import { db } from "@/lib/db";
import { activeProgram } from "@/lib/repo";
import { EXERCISES } from "@/lib/data/exercises";
import { PageHeader } from "@/components/ui";
import { WorkoutLogger } from "@/components/fitness/WorkoutLogger";


export default function LogPage() {
  const searchParams = useSP();
  return useLocalView((user) => {
  const { day } = searchParams;
  const prog = activeProgram(user.id);
  const pd = day ? prog?.plan.days.find((d) => d.key === day) ?? null : null;

  // Most recent performance for every exercise the user has logged.
  const rows = db
    .prepare(
      `SELECT s.exercise_id, s.weight, s.reps, w.date, w.id FROM workout_sets s JOIN workouts w ON w.id = s.workout_id
       WHERE w.user_id = ? ORDER BY w.date DESC, w.created_at DESC, s.set_index`,
    )
    .all(user.id) as { exercise_id: string; weight: number; reps: number; id: string }[];
  const last: Record<string, { weight: number; reps: number }[]> = {};
  const lastWorkout: Record<string, string> = {};
  for (const r of rows) {
    lastWorkout[r.exercise_id] ??= r.id;
    if (lastWorkout[r.exercise_id] === r.id) (last[r.exercise_id] ??= []).push({ weight: r.weight, reps: r.reps });
  }
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Fitness" title={pd ? pd.name : "Log a workout"} sub={pd ? "Targets come from your program. Last session's weights are pre-filled. Beat them with good form." : "Add any exercises from the database."} />
      <WorkoutLogger
        dayKey={pd?.key ?? null}
        dayName={pd?.name ?? null}
        planned={pd?.exercises ?? []}
        last={last}
        exercises={EXERCISES.map((e) => ({ id: e.id, name: e.name, group: e.group }))}
        units={user.profile.units}
      />
    </div>
  );
  });
}
