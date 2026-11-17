"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Check } from "lucide-react";
import { api } from "@/lib/client";
import { Chips, Slider } from "@/components/forms/Choice";
import { Notice, Spinner } from "@/components/ui";
import { GOAL_OPTIONS, EQUIP_OPTIONS, SPLIT_OPTIONS } from "@/lib/options";
import { GROUP_LABEL, MUSCLE_GROUPS } from "@/lib/data/exercises";
import type { Program, ProgramConfig } from "@/lib/engine/program";
import { ProgramView } from "./ProgramView";

export function ProgramBuilder({ initial, exercises }: { initial: ProgramConfig; exercises: { id: string; name: string }[] }) {
  const router = useRouter();
  const [cfg, setCfg] = useState(initial);
  const [preview, setPreview] = useState<Program | null>(null);
  const [busy, setBusy] = useState<"p" | "s" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const u = (p: Partial<ProgramConfig>) => { setCfg({ ...cfg, ...p }); setSaved(false); };

  async function go(save: boolean) {
    setBusy(save ? "s" : "p");
    setErr(null);
    try {
      const r = await api<{ plan: Program }>("/api/program", { body: { config: cfg, save } });
      setPreview(r.plan);
      if (save) { setSaved(true); router.refresh(); }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card card-pad grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <F label="Experience"><Chips options={[{ v: "beginner", l: "Beginner" }, { v: "intermediate", l: "Intermediate" }, { v: "advanced", l: "Advanced" }] as const} value={[cfg.experience]} onChange={([experience]) => u({ experience })} /></F>
          <F label="Primary goal"><Chips options={GOAL_OPTIONS} value={[cfg.goal]} onChange={([goal]) => u({ goal })} /></F>
          <F label="Split"><Chips options={SPLIT_OPTIONS} value={[cfg.split]} onChange={([split]) => u({ split })} /></F>
          <F label="Days per week"><Slider min={2} max={6} value={cfg.days} onChange={(days) => u({ days })} suffix=" d" /></F>
          <F label="Minutes per session"><Slider min={30} max={120} step={5} value={cfg.minutes} onChange={(minutes) => u({ minutes })} suffix=" m" /></F>
        </div>
        <div className="space-y-5">
          <F label="Equipment"><Chips multi options={EQUIP_OPTIONS} value={cfg.equipment as never} onChange={(equipment) => u({ equipment })} /></F>
          <F label="Emphasise (up to 4)"><Chips multi max={4} options={MUSCLE_GROUPS.map((g) => ({ v: g, l: GROUP_LABEL[g] }))} value={cfg.emphasis} onChange={(emphasis) => u({ emphasis })} /></F>
          <F label="Exercises to avoid">
            <select className="input" value="" onChange={(e) => e.target.value && u({ avoid: [...new Set([...cfg.avoid, e.target.value])] })}>
              <option value="">Add an exercise to avoid…</option>
              {exercises.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            {cfg.avoid.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{cfg.avoid.map((id) => <button key={id} onClick={() => u({ avoid: cfg.avoid.filter((x) => x !== id) })} className="chip">{exercises.find((x) => x.id === id)?.name} ✕</button>)}</div>}
          </F>
          <F label="Favourite exercises (prioritised)">
            <select className="input" value="" onChange={(e) => e.target.value && u({ likes: [...new Set([...cfg.likes, e.target.value])] })}>
              <option value="">Add a favourite…</option>
              {exercises.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            {cfg.likes.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{cfg.likes.map((id) => <button key={id} onClick={() => u({ likes: cfg.likes.filter((x) => x !== id) })} className="chip chip-on">{exercises.find((x) => x.id === id)?.name} ✕</button>)}</div>}
          </F>
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button onClick={() => go(false)} disabled={!!busy} className="btn-ghost">{busy === "p" ? <Spinner /> : <Wand2 size={16} />} Generate preview</button>
          <button onClick={() => go(true)} disabled={!!busy} className="btn-primary">{busy === "s" ? <Spinner /> : saved ? <Check size={16} /> : null} {saved ? "Active program updated" : "Save as active program"}</button>
        </div>
        {err && <div className="md:col-span-2"><Notice tone="bad">{err}</Notice></div>}
      </div>
      {preview && <ProgramView plan={preview} showStart={saved} />}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="label mb-2.5">{label}</div>{children}</div>;
}
