"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Trash2, Brain, ShieldCheck, Moon, Sun } from "lucide-react";
import { api } from "@/lib/client";
import { Chips, Slider, Toggle } from "@/components/forms/Choice";
import { Notice, Spinner } from "@/components/ui";
import { GOAL_OPTIONS, EQUIP_OPTIONS } from "@/lib/options";
import type { Profile } from "@/lib/auth";

export function ProfileForm({ name, email, age, isMinor, profile, memories, aiReady }: { name: string; email: string; age: number; isMinor: boolean; profile: Profile; memories: { id: string; content: string }[]; aiReady: boolean }) {
  const router = useRouter();
  const [p, setP] = useState({ ...profile, name });
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [theme, setTheme] = useState(() => (typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "light" : "dark"));
  const u = (x: Partial<typeof p>) => { setP({ ...p, ...x }); setState("idle"); };

  async function save() {
    setState("saving");
    setErr(null);
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: { name: p.name, experience: p.experience, equipment: p.equipment, days_per_week: p.days_per_week, session_minutes: p.session_minutes, goals: p.goals, preferences: { ...p.preferences, injuries: p.preferences.injuries || undefined },
          faith_content: p.faith_content, units: p.units, ai_memory: p.ai_memory, save_photos: p.save_photos },
      });
      setState("saved");
      router.refresh();
    } catch (e) { setErr((e as Error).message); setState("idle"); }
  }
  function setThemeMode(t: "dark" | "light") {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("apex-theme", t); } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <section className="card card-pad space-y-5">
        <h2 className="h2">Account</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label mb-1.5 block">Name</span><input className="input" value={p.name} onChange={(e) => u({ name: e.target.value })} maxLength={60} /></label>
          <label><span className="label mb-1.5 block">Email</span><input className="input opacity-70" value={email} disabled /></label>
        </div>
        {isMinor && <Notice><span className="flex gap-2"><ShieldCheck size={16} className="shrink-0 text-accent" /> Because you&apos;re {age}, photo analysis, photo storage and AI memory are disabled as extra safeguards.</span></Notice>}
      </section>

      <section className="card card-pad space-y-5">
        <h2 className="h2">Training</h2>
        <div><div className="label mb-2">Experience</div><Chips options={[{ v: "beginner", l: "Beginner" }, { v: "intermediate", l: "Intermediate" }, { v: "advanced", l: "Advanced" }] as const} value={[p.experience]} onChange={([experience]) => u({ experience })} /></div>
        <div><div className="label mb-2">Goals</div><Chips multi max={3} options={GOAL_OPTIONS} value={p.goals as never} onChange={(goals) => goals.length && u({ goals })} /></div>
        <div><div className="label mb-2">Equipment</div><Chips multi options={EQUIP_OPTIONS} value={p.equipment as never} onChange={(equipment) => u({ equipment })} /></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><div className="label mb-2">Days per week</div><Slider min={2} max={6} value={p.days_per_week} onChange={(days_per_week) => u({ days_per_week })} suffix=" d" /></div>
          <div><div className="label mb-2">Session length</div><Slider min={30} max={120} step={5} value={p.session_minutes} onChange={(session_minutes) => u({ session_minutes })} suffix=" m" /></div>
        </div>
        <label className="block"><span className="label mb-1.5 block">Injuries / limitations</span><textarea className="input min-h-[70px]" value={p.preferences.injuries ?? ""} onChange={(e) => u({ preferences: { ...p.preferences, injuries: e.target.value } })} maxLength={500} /></label>
        <p className="text-xs text-dim">Changing these doesn&apos;t rewrite your active program. Regenerate it in Fitness → Program builder.</p>
      </section>

      <section className="card card-pad">
        <h2 className="h2 mb-2">Personalisation</h2>
        <div className="divide-y divide-line/60">
          <Toggle checked={p.faith_content} onChange={(faith_content) => u({ faith_content })} label="Faith-based motivation" hint="Scripture and faith reflections in your daily briefing." />
          <div className="flex items-center justify-between py-3"><span className="text-sm">Units</span><Chips options={[{ v: "kg", l: "kg" }, { v: "lb", l: "lb" }] as const} value={[p.units]} onChange={([units]) => u({ units })} /></div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm">Appearance</span>
            <div className="flex gap-1.5">
              <button onClick={() => setThemeMode("dark")} className={`chip ${theme === "dark" ? "chip-on" : ""}`}><Moon size={13} /> Dark</button>
              <button onClick={() => setThemeMode("light")} className={`chip ${theme === "light" ? "chip-on" : ""}`}><Sun size={13} /> Light</button>
            </div>
          </div>
        </div>
      </section>

      <section className="card card-pad space-y-4">
        <h2 className="h2">Privacy & data</h2>
        <div className="divide-y divide-line/60">
          <Toggle checked={p.save_photos} disabled={isMinor} onChange={(save_photos) => u({ save_photos })} label="Pre-tick “Save photo” on analyses" hint="Off by default. Saved photos are encrypted (AES-256-GCM), stored privately and never used for identification." />
          <Toggle checked={p.ai_memory} disabled={isMinor} onChange={(ai_memory) => u({ ai_memory })} label="AI coach memory" hint="The coach proposes things to remember. Nothing is saved without your tap. Turning this off deletes all memories." />
        </div>
        {profile.ai_memory && memories.length > 0 && (
          <div className="rounded-xl border border-line/60 p-3">
            <div className="label mb-2 flex items-center gap-1.5"><Brain size={12} /> What the coach remembers</div>
            <ul className="space-y-1.5">
              {memories.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{m.content}</span>
                  <button onClick={async () => { await api(`/api/memories?id=${m.id}`, { method: "DELETE" }); router.refresh(); }} className="text-dim hover:text-bad" aria-label="Forget"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <a href="/api/account/export" className="btn-ghost text-xs"><Download size={14} /> Export my data (JSON)</a>
          <button onClick={async () => { if (confirm("Delete ALL saved photos permanently? Analyses keep their text reports.")) { await api("/api/account?scope=photos", { method: "DELETE" }); router.refresh(); } }} className="btn-ghost text-xs"><Trash2 size={14} /> Delete all photos</button>
          <button
            onClick={async () => {
              const pw = prompt("This permanently deletes your account and ALL data. Enter your password to confirm:");
              if (!pw) return;
              try { await api("/api/account", { method: "DELETE", body: { password: pw } }); window.location.href = "/register"; } catch (e) { alert((e as Error).message); }
            }}
            className="btn-danger text-xs"
          ><Trash2 size={14} /> Delete account</button>
        </div>
        <p className="text-xs text-dim">AI features: {aiReady ? "enabled. Photos you choose to analyse are sent to Anthropic's API for that request only." : "not configured on this server."}</p>
      </section>

      <div className="sticky bottom-20 z-20 flex items-center justify-end gap-3 lg:bottom-4">
        {err && <span className="text-sm text-bad">{err}</span>}
        <button onClick={save} disabled={state === "saving"} className="btn-primary shadow-2xl">{state === "saving" ? <Spinner /> : state === "saved" ? <Check size={16} /> : null} {state === "saved" ? "Saved" : "Save changes"}</button>
      </div>
    </div>
  );
}
