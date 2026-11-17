import Link from "next/link";
import { ArrowRight, Dumbbell, Quote, Target, BedDouble, Droplets, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { today } from "@/lib/util";
import { activeProgram, dailyEntry, ensureHabits, goalsFor, habitsFor, skincareHistory, workoutData } from "@/lib/repo";
import { analyze, suggestToday } from "@/lib/engine/analytics";
import { dailyContent } from "@/lib/engine/motivation";
import { exerciseName } from "@/lib/data/exercises";
import { Card, SectionHead, Stat, Badge } from "@/components/ui";
import { HabitChecklist, ChallengeToggle, Reflection, SkincareToday, RecoveryForm } from "@/components/home/widgets";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const date = today();
  ensureHabits(user.id, user.profile.faith_content);
  const prog = activeProgram(user.id);
  const { workouts, sets, recovery } = workoutData(user.id, 120);
  const a = analyze(workouts, sets, recovery, date, prog?.plan);
  const sug = suggestToday(prog?.plan ?? null, workouts, sets, date);
  const habits = habitsFor(user.id, date);
  const entry = dailyEntry(user.id, date);
  const goals = goalsFor(user.id).filter((g) => g.status === "active");
  const skin = skincareHistory(user.id, 7, date);
  const rec = recovery.find((r) => r.date === date) ?? null;
  const habitRate = habits.length ? habits.reduce((s, h) => s + h.last7, 0) / (habits.length * 7) : null;
  const hour = new Date().getHours();
  const content = dailyContent({
    name: user.name, date, userId: user.id, faith: user.profile.faith_content, streakWeeks: a.streakWeeks, daysSinceWorkout: a.daysSinceLast,
    todayPlan: sug?.day && !sug.trainedToday ? sug.day.name.replace(/^Day \d+ · /, "") : null, sleepLastNight: rec?.sleep_hours ?? null,
    habitRateWeek: habitRate, activeGoals: goals.map((g) => g.title), hour,
  });
  const weekSessions = a.weeks.at(-1)?.sessions ?? 0;
  const skin7 = skin.reduce((s, d) => s + Number(d.am) + Number(d.pm), 0);
  const faceCount = (db.prepare("SELECT COUNT(*) n FROM face_analyses WHERE user_id = ?").get(user.id) as { n: number }).n;

  return (
    <div className="space-y-6">
      {/* Daily briefing */}
      <section className="relative overflow-hidden rounded-2xl border border-line/70 bg-surface p-6 sm:p-8 animate-fadeUp">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-[90px]" />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40 [mask-image:linear-gradient(to_left,black,transparent_60%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label text-accent">{new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
            <Badge tone="accent">{content.theme.replace("-", " ")}</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{content.greeting}</h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-fg/90">{content.message}</p>
          {content.context.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-muted">{content.context.map((c) => <li key={c}>— {c}</li>)}</ul>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Today's training */}
          <Card>
            <SectionHead label="Training" title={sug?.day ? sug.day.name : "Today"} sub={sug?.reason ?? "Generate a program to get daily recommendations."}
              action={<Link href={sug?.day ? `/fitness/log?day=${sug.day.key}` : "/fitness"} className="btn-primary py-2 text-xs">{sug?.day ? "Start session" : "Build program"} <ArrowRight size={14} /></Link>} />
            {sug?.day && (
              <div className="grid gap-2 sm:grid-cols-2">
                {sug.day.exercises.map((e) => (
                  <Link key={e.exerciseId} href={`/exercises/${e.exerciseId}`} className="flex items-center justify-between rounded-xl border border-line/60 bg-raised/30 px-3 py-2.5 text-sm hover:border-accent/40">
                    <span className="flex items-center gap-2"><Dumbbell size={14} className="text-dim" />{exerciseName(e.exerciseId)}</span>
                    <span className="font-mono text-xs text-muted">{e.sets}×{e.reps}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <div className="label mb-3 flex items-center gap-2"><Quote size={13} /> Quote of the day</div>
              <blockquote className="text-[15px] leading-relaxed">“{content.quote.text}”</blockquote>
              <div className="mt-3 text-xs text-muted">— {content.quote.author}{content.quote.source ? `, ${content.quote.source}` : ""}</div>
            </Card>
            <Card>
              <div className="label mb-3 flex items-center gap-2"><Target size={13} /> Daily challenge</div>
              <p className="text-[15px] leading-relaxed">{content.challenge.text}</p>
              <ChallengeToggle date={date} done={!!entry.challenge_done} />
            </Card>
          </div>

          <Card>
            <SectionHead label="Reflection" title="Think before the day thinks for you" />
            <Reflection date={date} initial={entry.reflection ?? ""} prompt={content.reflection} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <SectionHead label="Discipline" title="Daily habits" />
            <HabitChecklist habits={habits} date={date} />
          </Card>
          <Card>
            <SectionHead label="Skin" title="Routine check-in" action={<Link href="/skincare/routine" className="text-xs text-accent">View routine</Link>} />
            <SkincareToday date={date} am={!!skin.at(-1)?.am} pm={!!skin.at(-1)?.pm} />
          </Card>
          <Card>
            <SectionHead label="Recovery" title={<span className="flex items-center gap-2"><BedDouble size={18} className="text-dim" /> Sleep & readiness</span>} />
            <RecoveryForm date={date} initial={rec} />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="This week" value={weekSessions} unit={`/ ${prog?.plan.days.length ?? "–"} sessions`} />
        <Stat label="Training streak" value={a.streakWeeks} unit="weeks" />
        <Stat label="Skincare (7d)" value={skin7} unit="/ 14" />
        <Stat label="Active goals" value={goals.length} hint={<Link href="/progress#goals" className="text-accent">Manage</Link>} />
      </div>

      {faceCount === 0 && !user.isMinor && (
        <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><Sparkles className="text-accent" size={20} /><div><div className="font-medium">Run your first skin analysis</div><div className="text-sm text-muted">Neutral observations and an evidence-based routine. You decide whether to save the photo.</div></div></div>
          <Link href="/face" className="btn-ghost text-xs"><Droplets size={14} /> Open Face</Link>
        </Card>
      )}
    </div>
  );
}
