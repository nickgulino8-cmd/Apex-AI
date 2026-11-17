"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, Plus, Trash2, Sun, Moon, Flame } from "lucide-react";
import { api } from "@/lib/client";
import { Spinner, Bar } from "@/components/ui";

type Habit = { id: string; name: string; category: string; done: boolean; last7: number };

export function HabitChecklist({ habits: initial, date }: { habits: Habit[]; date: string }) {
  const [habits, setHabits] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [edit, setEdit] = useState(false);
  const router = useRouter();
  const [, start] = useTransition();
  const done = habits.filter((h) => h.done).length;

  async function toggle(h: Habit) {
    const next = !h.done;
    setHabits((xs) => xs.map((x) => (x.id === h.id ? { ...x, done: next, last7: x.last7 + (next ? 1 : -1) } : x)));
    try {
      await api("/api/habits", { method: "PATCH", body: { habitId: h.id, date, done: next } });
    } catch {
      setHabits((xs) => xs.map((x) => (x.id === h.id ? h : x)));
    }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api("/api/habits", { body: { name } });
    setName("");
    setAdding(false);
    start(() => router.refresh());
  }
  async function remove(id: string) {
    setHabits((xs) => xs.filter((x) => x.id !== id));
    await api(`/api/habits?id=${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <Bar value={habits.length ? done / habits.length : 0} />
        <span className="shrink-0 font-mono text-xs text-muted tabular-nums">{done}/{habits.length}</span>
      </div>
      <ul className="space-y-1.5">
        {habits.map((h) => (
          <li key={h.id} className="group flex items-center gap-3">
            <button
              onClick={() => toggle(h)}
              className={clsx("flex flex-1 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition", h.done ? "border-accent/40 bg-accent/10" : "border-line/60 bg-raised/30 hover:border-line")}
              aria-pressed={h.done}
            >
              <span className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded-md border transition", h.done ? "border-accent bg-accent text-white" : "border-line")}>
                {h.done && <Check size={13} strokeWidth={3} />}
              </span>
              <span className={clsx("flex-1", h.done && "text-muted line-through decoration-dim")}>{h.name}</span>
              <span className="flex gap-0.5" title={`${h.last7}/7 in the last week`}>
                {Array.from({ length: 7 }, (_, i) => <span key={i} className={clsx("h-3 w-1 rounded-full", i < h.last7 ? "bg-accent/70" : "bg-line")} />)}
              </span>
            </button>
            {edit && <button onClick={() => remove(h.id)} className="text-dim hover:text-bad" aria-label={`Remove ${h.name}`}><Trash2 size={15} /></button>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        {adding ? (
          <form onSubmit={add} className="flex flex-1 gap-2">
            <input autoFocus className="input py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit" maxLength={80} />
            <button className="btn-primary py-2">Add</button>
          </form>
        ) : (
          <>
            <button onClick={() => setAdding(true)} className="btn-ghost py-1.5 text-xs"><Plus size={14} /> Add habit</button>
            <button onClick={() => setEdit(!edit)} className="btn-ghost py-1.5 text-xs">{edit ? "Done" : "Edit"}</button>
          </>
        )}
      </div>
    </div>
  );
}

export function ChallengeToggle({ date, done: initial }: { date: string; done: boolean }) {
  const [done, setDone] = useState(initial);
  return (
    <button
      onClick={async () => {
        setDone(!done);
        await api("/api/daily", { body: { date, challenge_done: !done } }).catch(() => setDone(done));
      }}
      className={clsx("btn mt-4 w-full border", done ? "border-ok/40 bg-ok/10 text-ok" : "border-line bg-raised/40 hover:bg-raised")}
    >
      {done ? <><Check size={16} /> Challenge complete</> : <><Flame size={16} /> Mark complete</>}
    </button>
  );
}

export function Reflection({ date, initial, prompt }: { date: string; initial: string; prompt: string }) {
  const [text, setText] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  async function save() {
    setState("saving");
    await api("/api/daily", { body: { date, reflection: text } });
    setState("saved");
  }
  return (
    <div>
      <p className="text-sm italic text-fg/90">{prompt}</p>
      <textarea value={text} onChange={(e) => { setText(e.target.value); setState("idle"); }} className="input mt-3 min-h-[96px] resize-y" placeholder="Write a few honest lines…" maxLength={4000} />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-dim">Private to you.</span>
        <button onClick={save} disabled={state === "saving"} className="btn-ghost py-1.5 text-xs">
          {state === "saving" ? <Spinner /> : state === "saved" ? <Check size={14} className="text-ok" /> : null} {state === "saved" ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function SkincareToday({ date, am: a, pm: p }: { date: string; am: boolean; pm: boolean }) {
  const [am, setAm] = useState(a);
  const [pm, setPm] = useState(p);
  const toggle = async (slot: "am" | "pm", v: boolean, set: (b: boolean) => void) => {
    set(v);
    await api("/api/skincare/log", { body: { date, slot, done: v } }).catch(() => set(!v));
  };
  const Btn = ({ on, slot, set, icon }: { on: boolean; slot: "am" | "pm"; set: (b: boolean) => void; icon: React.ReactNode }) => (
    <button onClick={() => toggle(slot, !on, set)} className={clsx("flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm transition", on ? "border-accent/50 bg-accent/10 text-fg" : "border-line/60 bg-raised/30 text-muted hover:text-fg")}>
      {icon} {slot.toUpperCase()} {on && <Check size={14} className="text-accent" />}
    </button>
  );
  return (
    <div className="flex gap-2">
      <Btn on={am} slot="am" set={setAm} icon={<Sun size={16} />} />
      <Btn on={pm} slot="pm" set={setPm} icon={<Moon size={16} />} />
    </div>
  );
}

export function RecoveryForm({ date, initial }: { date: string; initial: { sleep_hours: number | null; sleep_quality: number | null; energy: number | null; soreness: number | null } | null }) {
  const [v, setV] = useState({ sleep_hours: initial?.sleep_hours ?? 7.5, sleep_quality: initial?.sleep_quality ?? 3, energy: initial?.energy ?? 3, soreness: initial?.soreness ?? 2 });
  const [saved, setSaved] = useState(!!initial);
  const [busy, setBusy] = useState(false);
  const Scale = ({ k, label }: { k: "sleep_quality" | "energy" | "soreness"; label: string }) => (
    <div>
      <div className="mb-1.5 text-xs text-muted">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => { setV({ ...v, [k]: n }); setSaved(false); }} className={clsx("h-8 flex-1 rounded-lg border text-xs font-mono", v[k] === n ? "border-accent bg-accent/15 text-fg" : "border-line/60 text-muted")}>{n}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex justify-between text-xs text-muted"><span>Sleep last night</span><span className="font-mono text-fg">{v.sleep_hours} h</span></div>
        <input type="range" min={0} max={12} step={0.5} value={v.sleep_hours} onChange={(e) => { setV({ ...v, sleep_hours: Number(e.target.value) }); setSaved(false); }} className="w-full accent-[rgb(var(--accent))]" />
      </div>
      <Scale k="sleep_quality" label="Sleep quality" />
      <Scale k="energy" label="Energy" />
      <Scale k="soreness" label="Soreness (5 = very sore)" />
      <button
        disabled={busy}
        onClick={async () => { setBusy(true); await api("/api/recovery", { body: { date, ...v } }); setBusy(false); setSaved(true); }}
        className="btn-ghost w-full py-2 text-xs"
      >
        {busy ? <Spinner /> : saved ? <Check size={14} className="text-ok" /> : null} {saved ? "Logged" : "Log recovery"}
      </button>
    </div>
  );
}
