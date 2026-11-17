import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { EXERCISE_BY_ID, GROUP_LABEL, type MuscleGroup } from "@/lib/data/exercises";
import type { Program } from "@/lib/engine/program";
import { Badge } from "@/components/ui";

export function ProgramView({ plan, showStart = true }: { plan: Program; showStart?: boolean }) {
  const maxSets = Math.max(1, ...Object.values(plan.weeklySets).map((v) => v ?? 0));
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{plan.summary}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {plan.days.map((d) => (
          <div key={d.key} className="rounded-2xl border border-line/70 bg-surface p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">{d.focus.map((g) => <Badge key={g}>{GROUP_LABEL[g]}</Badge>)}</div>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted"><Clock size={12} /> ~{d.estMinutes}m</span>
            </div>
            <ol className="space-y-1.5">
              {d.exercises.map((e, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto] items-baseline gap-2 text-sm">
                  <Link href={`/exercises/${e.exerciseId}`} className="truncate hover:text-accent">{i + 1}. {EXERCISE_BY_ID.get(e.exerciseId)?.name}</Link>
                  <span className="font-mono text-xs text-muted">{e.sets} × {e.reps}</span>
                  {e.note && <span className="col-span-2 -mt-1 text-[11px] text-accent">{e.note}</span>}
                </li>
              ))}
            </ol>
            <details className="mt-3 text-xs text-muted">
              <summary className="cursor-pointer select-none text-dim hover:text-fg">Warm-up, effort & mobility</summary>
              <div className="mt-2 space-y-2">
                <div><span className="text-fg">Warm-up:</span> {d.warmup.join(" · ")}</div>
                <div><span className="text-fg">Effort:</span> {d.exercises[0]?.rir}; rest {Math.round((d.exercises[0]?.restSec ?? 90) / 60 * 10) / 10}–{Math.round(Math.max(...d.exercises.map((x) => x.restSec)) / 60 * 10) / 10} min</div>
                {d.mobility.length > 0 && <div><span className="text-fg">Cool-down mobility:</span> {d.mobility.join(" · ")}</div>}
              </div>
            </details>
            {showStart && <Link href={`/fitness/log?day=${d.key}`} className="btn-ghost mt-3 w-full py-2 text-xs"><Play size={13} /> Start this session</Link>}
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line/70 bg-surface p-4">
          <div className="label mb-3">Weekly hard sets per muscle</div>
          <div className="space-y-2">
            {(Object.entries(plan.weeklySets) as [MuscleGroup, number][]).sort((a, b) => b[1] - a[1]).map(([g, n]) => (
              <div key={g} className="grid grid-cols-[96px_1fr_28px] items-center gap-3 text-xs">
                <span className="text-muted">{GROUP_LABEL[g]}</span>
                <div className="h-1.5 rounded-full bg-line/60"><div className="h-full rounded-full bg-accent" style={{ width: `${(n / maxSets) * 100}%` }} /></div>
                <span className="text-right font-mono tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line/70 bg-surface p-4 text-sm">
          <div className="label mb-2">Progression</div>
          <ul className="space-y-1.5 text-fg/90">{plan.progression.map((p) => <li key={p} className="flex gap-2"><span className="text-accent">—</span>{p}</li>)}</ul>
          <div className="label mb-2 mt-4">Recovery</div>
          <ul className="space-y-1.5 text-fg/90">{plan.recovery.map((p) => <li key={p} className="flex gap-2"><span className="text-accent">—</span>{p}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
