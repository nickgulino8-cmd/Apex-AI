"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, CalendarDays, AlertTriangle, Stethoscope, Check } from "lucide-react";
import { api } from "@/lib/client";
import { Chips, Toggle } from "@/components/forms/Choice";
import { Notice, Spinner } from "@/components/ui";
import { SKIN_TYPES, CONCERN_OPTIONS } from "@/lib/options";
import type { Routine, Step } from "@/lib/engine/routine";

type Input = { skinType: string; concerns: string[]; sensitive: boolean; pregnancy: boolean };

export function RoutineBuilder({ initial, saved, names }: { initial: Input; saved: Routine | null; names: Record<string, string> }) {
  const router = useRouter();
  const [inp, setInp] = useState(initial);
  const [routine, setRoutine] = useState<Routine | null>(saved);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(save: boolean) {
    setBusy(save ? "save" : "preview");
    setErr(null);
    try {
      const r = await api<{ routine: Routine }>("/api/skincare/routine", { body: { ...inp, save } });
      setRoutine(r.routine);
      setSavedOk(save);
      if (save) router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const u = (p: Partial<Input>) => { setInp({ ...inp, ...p }); setSavedOk(false); };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="card card-pad h-fit space-y-6">
        <div>
          <div className="label mb-2.5">Skin type</div>
          <Chips options={SKIN_TYPES.map((t) => ({ v: t.v, l: t.l }))} value={[inp.skinType] as never} onChange={([v]) => u({ skinType: v })} />
        </div>
        <div>
          <div className="label mb-2.5">Concerns</div>
          <Chips multi options={CONCERN_OPTIONS} value={inp.concerns as never} onChange={(concerns) => u({ concerns })} />
        </div>
        <div className="divide-y divide-line/60 rounded-xl border border-line/60 px-4">
          <Toggle checked={inp.sensitive} onChange={(sensitive) => u({ sensitive })} label="Sensitive / reactive skin" />
          <Toggle checked={inp.pregnancy} onChange={(pregnancy) => u({ pregnancy })} label="Pregnant, breastfeeding or trying" hint="Removes retinoids." />
        </div>
        <div className="flex gap-2">
          <button onClick={() => run(false)} disabled={!!busy} className="btn-ghost flex-1">{busy === "preview" && <Spinner />} Preview</button>
          <button onClick={() => run(true)} disabled={!!busy} className="btn-primary flex-1">{busy === "save" ? <Spinner /> : savedOk ? <Check size={16} /> : null} {savedOk ? "Saved" : "Save routine"}</button>
        </div>
        {err && <Notice tone="bad">{err}</Notice>}
      </div>

      <div className="space-y-4">
        {!routine ? (
          <div className="card card-pad text-sm text-muted">Choose your skin type and concerns, then preview a routine.</div>
        ) : (
          <>
            <RoutineCol title="Morning" icon={<Sun size={16} />} steps={routine.am} names={names} />
            <RoutineCol title="Evening" icon={<Moon size={16} />} steps={routine.pm} names={names} />
            {routine.weekly.length > 0 && <RoutineCol title="Weekly" icon={<CalendarDays size={16} />} steps={routine.weekly} names={names} />}
            {routine.warnings.map((w) => <Notice key={w} tone="warn"><span className="flex gap-2"><AlertTriangle size={16} className="shrink-0" />{w}</span></Notice>)}
            <div className="card card-pad">
              <div className="label mb-2">Guidance</div>
              <ul className="space-y-1.5 text-sm text-fg/90">{routine.notes.map((n) => <li key={n} className="flex gap-2"><span className="text-accent">—</span>{n}</li>)}</ul>
            </div>
            {routine.dermatologist.length > 0 && (
              <div className="rounded-2xl border border-warn/30 bg-warn/5 p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Stethoscope size={16} className="text-warn" /> When to see a dermatologist</div>
                <ul className="space-y-2 text-[13px] text-fg/90">{routine.dermatologist.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RoutineCol({ title, icon, steps, names }: { title: string; icon: React.ReactNode; steps: Step[]; names: Record<string, string> }) {
  return (
    <div className="card card-pad">
      <div className="mb-4 flex items-center gap-2 font-medium"><span className="text-accent">{icon}</span>{title}</div>
      <ol className="relative space-y-4 border-l border-line pl-5">
        {steps.map((s, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[27px] top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-accent bg-bg" />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="label">{s.step}</span>
              {s.frequency && <span className="text-[11px] text-warn">{s.frequency}</span>}
            </div>
            <div className="mt-0.5 text-sm font-medium">{s.product}</div>
            <p className="mt-0.5 text-[13px] text-muted">{s.how}</p>
            {s.compoundId && names[s.compoundId] && <Link href={`/skincare/${s.compoundId}`} className="mt-1 inline-block text-xs text-accent">About {names[s.compoundId]} →</Link>}
          </li>
        ))}
      </ol>
    </div>
  );
}
