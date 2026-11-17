import Link from "next/link";
import { Plus, ScanLine } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeProgram } from "@/lib/repo";
import { EXERCISES, exerciseName } from "@/lib/data/exercises";
import { HYPERTROPHY_EDUCATION, STRENGTH_EDUCATION, MOBILITY_EDUCATION, type ProgramConfig } from "@/lib/engine/program";
import { PageHeader, Card, Empty, Notice } from "@/components/ui";
import { Tabs } from "@/components/Tabs";
import { ProgramView } from "@/components/fitness/ProgramView";
import { ProgramBuilder } from "@/components/fitness/ProgramBuilder";
import { HistoryList, type HistItem } from "@/components/fitness/HistoryList";

export const metadata = { title: "Fitness" };
export const dynamic = "force-dynamic";

export default async function FitnessPage({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = ["program", "builder", "history", "learn"].includes(sp.tab ?? "") ? sp.tab! : "program";
  const prog = activeProgram(user.id);
  const p = user.profile;
  const initial: ProgramConfig = prog?.config ?? {
    experience: p.experience, days: p.days_per_week, minutes: p.session_minutes, equipment: p.equipment, goal: (p.goals[0] ?? "general") as ProgramConfig["goal"],
    split: "auto", emphasis: [], avoid: [], likes: [],
  };

  let history: HistItem[] = [];
  if (tab === "history") {
    const ws = db.prepare("SELECT id, date, title, duration_min, session_rpe, notes FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 60").all(user.id) as Omit<HistItem, "exercises">[];
    const st = db.prepare("SELECT exercise_id, weight, reps FROM workout_sets WHERE workout_id = ? ORDER BY set_index");
    history = ws.map((w) => {
      const sets = st.all(w.id) as { exercise_id: string; weight: number; reps: number }[];
      const ids = [...new Set(sets.map((s) => s.exercise_id))];
      return { ...w, exercises: ids.map((id) => ({ name: exerciseName(id), sets: sets.filter((s) => s.exercise_id === id).map((s) => (s.weight ? `${s.weight}×${s.reps}` : `${s.reps}`)).join(", ") })) };
    });
  }

  return (
    <div>
      <PageHeader eyebrow="Fitness" title="AI-structured training" sub="Programs built from your experience, schedule, equipment and goals using evidence-based volume, frequency and progression."
        action={<div className="flex gap-2"><Link href="/fitness/scan" className="btn-ghost"><ScanLine size={16} /> Physique scan</Link><Link href="/fitness/log" className="btn-primary"><Plus size={16} /> Log workout</Link></div>} />
      <Tabs active={tab} tabs={[
        { key: "program", label: "Active program", href: "/fitness" },
        { key: "builder", label: "Program builder", href: "/fitness?tab=builder" },
        { key: "history", label: "Workout history", href: "/fitness?tab=history" },
        { key: "learn", label: "Training science", href: "/fitness?tab=learn" },
      ]} />
      {sp.saved && tab === "history" && <div className="mb-4"><Notice tone="ok">Workout saved. Nice work.</Notice></div>}
      {tab === "program" && (prog ? <ProgramView plan={prog.plan} /> : <Empty title="No active program" body="Build one in under a minute." action={<Link href="/fitness?tab=builder" className="btn-primary">Open builder</Link>} />)}
      {tab === "builder" && <ProgramBuilder initial={initial} exercises={EXERCISES.map((e) => ({ id: e.id, name: e.name })).sort((a, b) => a.name.localeCompare(b.name))} />}
      {tab === "history" && <HistoryList items={history} />}
      {tab === "learn" && (
        <div className="space-y-8">
          {[["Hypertrophy (muscle growth)", HYPERTROPHY_EDUCATION], ["Strength development", STRENGTH_EDUCATION], ["Mobility & flexibility", MOBILITY_EDUCATION]].map(([title, items]) => (
            <section key={title as string}>
              <h2 className="h2 mb-3">{title as string}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {(items as { title: string; body: string }[]).map((x) => <Card key={x.title}><div className="mb-1.5 font-medium">{x.title}</div><p className="text-sm leading-relaxed text-muted">{x.body}</p></Card>)}
              </div>
            </section>
          ))}
          <p className="text-xs text-dim">Summaries reflect the general consensus of exercise-science reviews (e.g. ACSM position stands and meta-analyses on volume, frequency and proximity to failure). Individual responses vary.</p>
        </div>
      )}
    </div>
  );
}
