import { notFound } from "next/navigation";
import { EXERCISES, EXERCISE_BY_ID } from "@/lib/data/exercises";
import { ExerciseView } from "./ExerciseView";

export function generateStaticParams() {
  return EXERCISES.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: EXERCISE_BY_ID.get((await params).id)?.name ?? "Exercise" };
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!EXERCISE_BY_ID.has(id)) notFound();
  return <ExerciseView id={id} />;
}
