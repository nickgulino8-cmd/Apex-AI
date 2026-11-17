"use client";
import { useLocalView, useSP } from "@/components/Local";
import { EXERCISES, available, MUSCLE_GROUPS, type MuscleGroup } from "@/lib/data/exercises";
import { PageHeader } from "@/components/ui";
import { Library } from "@/components/exercises/Library";


export default function ExercisesPage() {
  const searchParams = useSP();
  return useLocalView((user) => {
  const g = searchParams.group;
  const items = EXERCISES.map((e) => ({ id: e.id, name: e.name, group: e.group, primary: e.primary, equipment: e.equipment, difficulty: e.difficulty, mechanics: e.mechanics, pattern: e.pattern, owned: available(e, user.profile.equipment) }));
  return (
    <div>
      <PageHeader eyebrow="Exercises" title="Exercise library" sub={`${EXERCISES.length} exercises across ${MUSCLE_GROUPS.length} muscle groups, each with step-by-step technique, common mistakes, form cues, safety notes, alternatives and an animated movement demo.`} />
      <Library items={items} initialGroup={MUSCLE_GROUPS.includes(g as MuscleGroup) ? (g as MuscleGroup) : null} />
    </div>
  );
  });
}
