"use client";
import { useLocalView } from "@/components/Local";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldAlert, XCircle, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { EXERCISE_BY_ID, GROUP_LABEL, available, videoSearchUrl } from "@/lib/data/exercises";
import { e1rm } from "@/lib/engine/analytics";
import { Badge, Card } from "@/components/ui";
import { MoveDemo } from "@/components/MoveDemo";
import { Anatomy } from "@/components/Anatomy";

export function ExerciseView({ id }: { id: string }) {
  return useLocalView((user) => {
  const e = EXERCISE_BY_ID.get(id)!;
  const best = db
    .prepare(`SELECT s.weight, s.reps, w.date FROM workout_sets s JOIN workouts w ON w.id = s.workout_id WHERE w.user_id = ? AND s.exercise_id = ? AND s.reps BETWEEN 1 AND 12 AND s.weight > 0`)
    .all(user.id, e.id) as { weight: number; reps: number; date: string }[];
  const top = best.sort((a, b) => e1rm(b.weight, b.reps) - e1rm(a.weight, a.reps))[0];
  const owned = available(e, user.profile.equipment);

  return (
    <div className="space-y-6">
      <Link href={`/exercises?group=${e.group}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={15} /> {GROUP_LABEL[e.group]}</Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <MoveDemo pattern={e.pattern} />
          <a href={videoSearchUrl(e)} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full text-xs">Watch video demonstrations (opens YouTube search) <ExternalLink size={13} /></a>
          <Card>
            <div className="label mb-2">Muscles worked</div>
            <Anatomy labels={GROUP_LABEL} values={{ [e.group]: 1 }} />
            <div className="mt-3 text-sm"><span className="text-muted">Primary:</span> {e.primary.join(", ")}</div>
            {e.secondary.length > 0 && <div className="mt-1 text-sm"><span className="text-muted">Secondary:</span> {e.secondary.join(", ")}</div>}
          </Card>
        </div>
        <div className="space-y-5">
          <header>
            <div className="label mb-2 text-accent">{GROUP_LABEL[e.group]}</div>
            <h1 className="h1">{e.name}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone={e.difficulty === "beginner" ? "ok" : e.difficulty === "intermediate" ? "accent" : "warn"}>{e.difficulty}</Badge>
              <Badge>{e.mechanics}</Badge>
              {e.equipment.map((q) => <Badge key={q}>{q}</Badge>)}
              {!owned && <Badge tone="warn">Not in your equipment list</Badge>}
            </div>
            {top && <p className="mt-3 text-sm text-muted">Your best: <span className="font-mono text-fg">{top.weight}{user.profile.units} × {top.reps}</span> on {top.date} (est. 1RM {Math.round(e1rm(top.weight, top.reps))}{user.profile.units})</p>}
          </header>
          <Card>
            <div className="label mb-3">How to do it</div>
            <ol className="space-y-3">
              {e.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-accent/50 font-mono text-xs text-accent">{i + 1}</span>{s}</li>
              ))}
            </ol>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <div className="label mb-3">Common mistakes</div>
              <ul className="space-y-2 text-sm">{e.mistakes.map((m) => <li key={m} className="flex gap-2"><XCircle size={15} className="mt-0.5 shrink-0 text-bad" />{m}</li>)}</ul>
            </Card>
            <Card>
              <div className="label mb-3">Form cues</div>
              <ul className="space-y-2 text-sm">{e.cues.map((m) => <li key={m} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" />{m}</li>)}</ul>
            </Card>
          </div>
          <div className="flex gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm">
            <ShieldAlert size={18} className="shrink-0 text-warn" />
            <div className="space-y-1">{e.safety.map((s) => <p key={s}>{s}</p>)}<p className="text-muted">Stop if you feel sharp or joint pain, and see a qualified professional if it persists.</p></div>
          </div>
          <Card>
            <div className="label mb-3">Alternatives</div>
            <div className="flex flex-wrap gap-2">
              {e.alternatives.map((id) => EXERCISE_BY_ID.get(id)).filter(Boolean).map((a) => (
                <Link key={a!.id} href={`/exercises/${a!.id}`} className="chip px-3 py-1.5 hover:border-accent/50 hover:text-fg">{a!.name}{!available(a!, user.profile.equipment) && <span className="text-dim"> · needs equipment</span>}</Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
  });
}
