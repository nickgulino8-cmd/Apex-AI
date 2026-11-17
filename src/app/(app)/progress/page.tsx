"use client";
import { useLocalView } from "@/components/Local";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { db, json } from "@/lib/db";
import { today, addDays } from "@/lib/util";
import { activeProgram, goalsFor, habitHistory, skincareHistory, workoutData } from "@/lib/repo";
import { analyze } from "@/lib/engine/analytics";
import { GROUP_LABEL, MUSCLE_GROUPS } from "@/lib/data/exercises";
import { PageHeader, Card, SectionHead, Stat, Ring } from "@/components/ui";
import { Anatomy } from "@/components/Anatomy";
import { SessionsChart, StrengthChart, SleepChart, Heatmap, RatingTrend } from "@/components/progress/Charts";
import { Goals } from "@/components/progress/Goals";
import { Gallery } from "@/components/progress/Gallery";


export default function ProgressPage() {
  return useLocalView((user) => {
  const d = today();
  const prog = activeProgram(user.id);
  const { workouts, sets, recovery } = workoutData(user.id, 365);
  const a = analyze(workouts, sets, recovery, d, prog?.plan);
  const habits = habitHistory(user.id, 84, d);
  const skin = skincareHistory(user.id, 84, d);
  const goals = goalsFor(user.id);
  const photos = db.prepare("SELECT id, kind, created_at FROM photos WHERE user_id = ? ORDER BY created_at DESC").all(user.id) as { id: string; kind: string; created_at: string }[];
  const showRatings = user.profile.show_ratings && !user.isMinor;
  const ratingPoints = showRatings
    ? (db.prepare("SELECT created_at, ratings FROM face_analyses WHERE user_id = ? AND ratings IS NOT NULL ORDER BY created_at").all(user.id) as { created_at: string; ratings: string }[])
        .map((r) => ({ date: r.created_at.slice(0, 10), ...json<{ overall: { score: number; low: number; high: number } }>(r.ratings, { overall: { score: 0, low: 0, high: 0 } }).overall }))
    : [];
  const trained = new Set(a.trainedDays);
  const trainDays = Array.from({ length: 84 }, (_, i) => { const x = addDays(d, i - 83); return { date: x, value: trained.has(x) ? 1 : 0, max: 1 }; });
  const sleep = Array.from({ length: 30 }, (_, i) => { const x = addDays(d, i - 29); return { date: x, hours: recovery.find((r) => r.date === x)?.sleep_hours ?? null }; });
  const maxSets = Math.max(1, ...MUSCLE_GROUPS.map((g) => a.last28[g]));
  const habit28 = habits.slice(-28);
  const habitRate = habit28.reduce((s, h) => s + h.done, 0) / Math.max(1, habit28.reduce((s, h) => s + h.total, 0));
  const skinRate = skin.slice(-28).reduce((s, x) => s + Number(x.am) + Number(x.pm), 0) / 56;
  const icon = { good: <CheckCircle2 size={16} className="text-ok" />, warn: <AlertTriangle size={16} className="text-warn" />, info: <Info size={16} className="text-accent" /> };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Progress" title="Your trajectory" sub="Consistency, strength, recovery, habits and appearance, tracked over time." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Workouts (12 mo)" value={a.totalWorkouts} />
        <Stat label="Streak" value={a.streakWeeks} unit="weeks" />
        <Stat label="Habit completion (28d)" value={`${Math.round(habitRate * 100)}%`} />
        <Stat label="Skincare adherence (28d)" value={`${Math.round(skinRate * 100)}%`} />
      </div>

      <Card>
        <SectionHead label="Intelligent analysis" title="What your training data shows" />
        <div className="grid gap-2 md:grid-cols-2">
          {a.insights.map((i) => (
            <div key={i.title} className="flex gap-3 rounded-xl border border-line/60 bg-raised/30 p-3.5">
              <span className="mt-0.5 shrink-0">{icon[i.kind]}</span>
              <div><div className="text-sm font-medium">{i.title}</div><p className="mt-0.5 text-[13px] text-muted">{i.body}</p></div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><SectionHead label="Consistency" title="Sessions per week" sub="Last 12 weeks. The dashed line is your plan." /><SessionsChart data={a.weeks} target={prog?.plan.days.length ?? null} /></Card>
        <Card><SectionHead label="Strength" title="Strength progression" /><StrengthChart lifts={a.lifts} units={user.profile.units} /></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHead label="Volume" title="Hard sets per muscle — last 28 days" />
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <Anatomy labels={GROUP_LABEL} values={Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, a.last28[g] / maxSets]))} />
            <div className="space-y-1.5">
              {MUSCLE_GROUPS.map((g) => (
                <div key={g} className="grid grid-cols-[80px_1fr_28px] items-center gap-2 text-xs">
                  <span className="text-muted">{GROUP_LABEL[g]}</span>
                  <div className="h-1.5 rounded-full bg-line/60"><div className="h-full rounded-full bg-accent" style={{ width: `${(a.last28[g] / maxSets) * 100}%` }} /></div>
                  <span className="text-right font-mono tabular-nums">{a.last28[g]}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card><SectionHead label="Recovery" title="Sleep — last 30 days" sub={a.avgSleep != null ? `7-day average: ${a.avgSleep.toFixed(1)} h` : undefined} /><SleepChart data={sleep} /></Card>
      </div>

      {showRatings && <Card><SectionHead label="Face" title="Facial rating over time" sub="Overall score per analysis. Use consistent lighting and angle for meaningful comparisons." /><RatingTrend points={ratingPoints} /></Card>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card><SectionHead label="Training days" title="Last 12 weeks" /><Heatmap days={trainDays} kind="training" /></Card>
        <Card><SectionHead label="Daily habits" title="Completion" action={<Ring value={habitRate} size={48} />} /><Heatmap days={habits.map((h) => ({ date: h.date, value: h.done, max: h.total }))} kind="habits" /></Card>
        <Card><SectionHead label="Skincare" title="AM + PM check-ins" action={<Ring value={skinRate} size={48} />} /><Heatmap days={skin.map((s) => ({ date: s.date, value: Number(s.am) + Number(s.pm), max: 2 }))} kind="skincare" /></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><div id="goals" /><SectionHead label="Goals" title="Personal goals" /><Goals goals={goals} /></Card>
        <Card><SectionHead label="Private" title="Progress photos" sub="Encrypted, visible only to you. Delete anytime." /><Gallery photos={photos} /></Card>
      </div>
    </div>
  );
  });
}
