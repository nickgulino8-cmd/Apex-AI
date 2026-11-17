"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, Trash2, Check, Timer, Search, Info, X } from "lucide-react";
import { api, localDate } from "@/lib/client";
import { Notice, Spinner } from "@/components/ui";
import { EXERCISE_BY_ID } from "@/lib/data/exercises";
import { suggestLoad, type Suggestion } from "@/lib/engine/progression";

type SetE = { weight: string; reps: string; rpe: string; done: boolean };
type Entry = { exerciseId: string; target?: string; suggestion?: Suggestion | null; sets: SetE[] };
type Ex = { id: string; name: string; group: string };

export function WorkoutLogger({
  dayKey, dayName, planned, last, exercises, units,
}: {
  dayKey: string | null;
  dayName: string | null;
  planned: { exerciseId: string; sets: number; reps: string; rir: string; restSec: number }[];
  last: Record<string, { weight: number; reps: number }[]>;
  exercises: Ex[];
  units: string;
}) {
  const router = useRouter();
  const draftKey = `apex-draft-${dayKey ?? "free"}`;
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const u = (units === "lb" ? "lb" : "kg") as "kg" | "lb";
  const fresh = (): Entry[] =>
    planned.map((p) => {
      const ex = EXERCISE_BY_ID.get(p.exerciseId);
      const suggestion = ex ? suggestLoad(ex, p.reps, last[p.exerciseId], u) : null;
      const prefill = (i: number) =>
        suggestion && suggestion.weight > 0 ? String(suggestion.weight) : last[p.exerciseId]?.[i]?.weight?.toString() ?? last[p.exerciseId]?.[0]?.weight?.toString() ?? "";
      return {
        exerciseId: p.exerciseId,
        target: `${p.sets} × ${p.reps} · ${p.rir}`,
        suggestion,
        sets: Array.from({ length: p.sets }, (_, i) => ({ weight: prefill(i), reps: "", rpe: "", done: false })),
      };
    });
  const [entries, setEntries] = useState<Entry[]>(fresh);
  const [title, setTitle] = useState(dayName?.replace(/^Day \d+ · /, "") ?? "Workout");
  const [date, setDate] = useState(localDate());
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState("");
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [rest, setRest] = useState<number | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Draft persistence (per-device convenience only)
  useEffect(() => {
    try {
      const d = localStorage.getItem(draftKey);
      if (d) { const p = JSON.parse(d); if (p?.entries?.length) { setEntries(p.entries); setNotes(p.notes ?? ""); } }
    } catch { /* storage unavailable */ }
  }, [draftKey]);
  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify({ entries, notes })); } catch { /* ignore */ }
  }, [entries, notes, draftKey]);
  useEffect(() => () => { if (restRef.current) clearInterval(restRef.current); }, []);

  function startRest(sec: number) {
    if (restRef.current) clearInterval(restRef.current);
    setRest(sec);
    restRef.current = setInterval(() => setRest((r) => { if (r === null || r <= 1) { clearInterval(restRef.current!); return null; } return r - 1; }), 1000);
  }
  const upd = (i: number, j: number, p: Partial<SetE>) => setEntries((es) => es.map((e, ei) => (ei !== i ? e : { ...e, sets: e.sets.map((s, sj) => (sj !== j ? s : { ...s, ...p })) })));
  const addSet = (i: number) => setEntries((es) => es.map((e, ei) => (ei !== i ? e : { ...e, sets: [...e.sets, { ...(e.sets.at(-1) ?? { weight: "", reps: "", rpe: "" }), done: false }] })));
  const delSet = (i: number, j: number) => setEntries((es) => es.map((e, ei) => (ei !== i ? e : { ...e, sets: e.sets.filter((_, sj) => sj !== j) })));
  const delEx = (i: number) => setEntries((es) => es.filter((_, ei) => ei !== i));
  const addEx = (id: string) => { setEntries((es) => [...es, { exerciseId: id, sets: [{ weight: last[id]?.[0]?.weight?.toString() ?? "", reps: "", rpe: "", done: false }] }]); setPicker(false); setQ(""); };

  async function save() {
    setErr(null);
    const sets = entries.flatMap((e) =>
      e.sets.filter((s) => s.reps !== "" && Number(s.reps) > 0).map((s) => ({ exercise_id: e.exerciseId, weight: Number(s.weight) || 0, reps: Math.round(Number(s.reps)), rpe: s.rpe ? Number(s.rpe) : null })),
    );
    if (!sets.length) return setErr("Enter reps for at least one set.");
    setBusy(true);
    try {
      await api("/api/workouts", {
        body: { date, title: title || "Workout", program_day: dayKey, duration_min: Math.max(1, Math.round((Date.now() - startedAt) / 60000)), session_rpe: rpe, notes: notes || null, sets },
      });
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      router.push("/fitness?tab=history&saved=1");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const doneCount = entries.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
  const total = entries.reduce((s, e) => s + e.sets.length, 0);
  const filtered = exercises.filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.group.includes(q.toLowerCase())).slice(0, 40);

  return (
    <div className="space-y-4 pb-24">
      <div className="card card-pad grid gap-3 sm:grid-cols-[1fr_auto]">
        <input className="input text-base font-medium" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label="Workout title" />
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={localDate()} aria-label="Date" />
      </div>

      {entries.map((e, i) => {
        const ex = byId.get(e.exerciseId);
        const prev = last[e.exerciseId];
        return (
          <div key={i} className="card card-pad">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <Link href={`/exercises/${e.exerciseId}`} target="_blank" className="font-medium hover:text-accent">{ex?.name ?? e.exerciseId}</Link>
                <div className="mt-0.5 text-xs text-muted">
                  {e.target && <span className="text-accent">{e.target}</span>}
                  {prev && <span>{e.target ? " · " : ""}Last time: {prev.map((p) => `${p.weight}×${p.reps}`).join(", ")}</span>}
                </div>
                {e.suggestion && (
                  <div className={clsx("mt-1.5 inline-flex items-start gap-1.5 rounded-lg border px-2 py-1 text-[11px]",
                    e.suggestion.kind === "increase" ? "border-ok/40 bg-ok/10 text-ok" : e.suggestion.kind === "decrease" ? "border-warn/40 bg-warn/10 text-warn" : "border-line bg-raised/40 text-muted")}>
                    {e.suggestion.weight > 0 && <span className="font-mono font-semibold">{e.suggestion.weight} {u}</span>}
                    <span>{e.suggestion.reason}</span>
                  </div>
                )}
              </div>
              <button onClick={() => delEx(i)} className="text-dim hover:text-bad" aria-label="Remove exercise"><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-[28px_1fr_1fr_1fr_36px_24px] items-center gap-2 text-[11px] text-dim">
              <span>Set</span><span>{units}</span><span>Reps</span><span>RPE</span><span /><span />
            </div>
            {e.sets.map((s, j) => (
              <div key={j} className={clsx("mt-1.5 grid grid-cols-[28px_1fr_1fr_1fr_36px_24px] items-center gap-2 rounded-lg", s.done && "opacity-70")}>
                <span className="font-mono text-xs text-muted">{j + 1}</span>
                <input inputMode="decimal" className="input px-2 py-2 font-mono" value={s.weight} onChange={(x) => upd(i, j, { weight: x.target.value.replace(/[^\d.]/g, "") })} placeholder="0" aria-label="Weight" />
                <input inputMode="numeric" className="input px-2 py-2 font-mono" value={s.reps} onChange={(x) => upd(i, j, { reps: x.target.value.replace(/\D/g, "") })} placeholder="–" aria-label="Reps" />
                <input inputMode="decimal" className="input px-2 py-2 font-mono" value={s.rpe} onChange={(x) => upd(i, j, { rpe: x.target.value.replace(/[^\d.]/g, "").slice(0, 4) })} placeholder="–" aria-label="RPE" />
                <button
                  onClick={() => { upd(i, j, { done: !s.done }); if (!s.done) startRest(planned.find((p) => p.exerciseId === e.exerciseId)?.restSec ?? 90); }}
                  className={clsx("grid h-9 w-9 place-items-center rounded-lg border transition", s.done ? "border-ok bg-ok/20 text-ok" : "border-line text-dim hover:text-fg")}
                  aria-label="Mark set done"
                ><Check size={16} /></button>
                <button onClick={() => delSet(i, j)} className="text-dim hover:text-bad" aria-label="Remove set"><X size={14} /></button>
              </div>
            ))}
            <button onClick={() => addSet(i)} className="btn-ghost mt-3 py-1.5 text-xs"><Plus size={14} /> Add set</button>
          </div>
        );
      })}

      {picker ? (
        <div className="card card-pad">
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
            <input autoFocus className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises or muscle groups" />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {filtered.map((e) => (
              <button key={e.id} onClick={() => addEx(e.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-raised">
                {e.name}<span className="text-xs capitalize text-dim">{e.group}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setPicker(false)} className="btn-ghost mt-3 py-1.5 text-xs">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setPicker(true)} className="btn-ghost w-full"><Plus size={16} /> Add exercise</button>
      )}

      <div className="card card-pad space-y-4">
        <div>
          <div className="mb-2 flex justify-between text-sm"><span>Session effort (RPE)</span><span className="font-mono">{rpe}/10</span></div>
          <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
        </div>
        <textarea className="input min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes: how did it feel? Any technique cues or pain?" maxLength={2000} />
        <div className="flex gap-2 text-xs text-muted"><Info size={14} className="shrink-0" />RPE = rating of perceived exertion. 10 is max effort, 8 means about 2 reps left in reserve.</div>
      </div>
      {err && <Notice tone="bad">{err}</Notice>}

      <div className="fixed inset-x-0 bottom-[64px] z-30 border-t border-line/60 bg-bg/90 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-60">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <span className="font-mono text-xs text-muted">{doneCount}/{total} sets</span>
          {rest !== null && (
            <button onClick={() => setRest(null)} className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 font-mono text-xs text-accent"><Timer size={13} /> {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}</button>
          )}
          <button onClick={save} disabled={busy} className="btn-primary ml-auto">{busy && <Spinner />} Finish & save</button>
        </div>
      </div>
    </div>
  );
}
