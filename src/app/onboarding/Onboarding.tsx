"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ageFrom } from "@/lib/util";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { Chips, Slider, Toggle } from "@/components/forms/Choice";
import { Spinner } from "@/components/ui";
import { GOAL_OPTIONS, EQUIP_OPTIONS, SKIN_TYPES, CONCERN_OPTIONS } from "@/lib/options";

export function Onboarding({ existing: existingProp }: { existing: { name: string; isMinor: boolean } | null }) {
  // Freeze at mount: the profile gets created mid-flow, which must not reshape the steps.
  const [existing] = useState(existingProp);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [who, setWho] = useState({ name: existing?.name ?? "", birthDate: "" });
  const age = who.birthDate ? ageFrom(who.birthDate) : null;
  const isMinor = existing ? existing.isMinor : age !== null && age < 18;
  const name = who.name || "there";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [s, set] = useState({
    experience: "beginner" as "beginner" | "intermediate" | "advanced",
    goals: ["hypertrophy"] as string[],
    equipment: ["dumbbell", "bench"] as string[],
    days: 3,
    minutes: 60,
    injuries: "",
    skinType: "unknown",
    concerns: [] as string[],
    sensitive: false,
    pregnancy: false,
    faith: true,
    units: "kg" as "kg" | "lb",
    memory: false,
  });
  const u = (p: Partial<typeof s>) => set((x) => ({ ...x, ...p }));

  async function demo() {
    setBusy(true);
    try {
      await api("/api/setup", { body: { demo: true } });
      router.replace("/home");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setErr(null);
    try {
      if (!existing) await api("/api/setup", { body: { name: who.name, birthDate: who.birthDate } });
      await api("/api/profile", {
        method: "PATCH",
        body: {
          experience: s.experience, goals: s.goals, equipment: s.equipment, days_per_week: s.days, session_minutes: s.minutes,
          preferences: { injuries: s.injuries || undefined }, skin_type: s.skinType, skin_concerns: s.concerns, skin_sensitive: s.sensitive,
          pregnancy_flag: s.pregnancy, faith_content: s.faith, units: s.units, ai_memory: isMinor ? false : s.memory,
        },
      });
      await api("/api/program", {
        body: { save: true, config: { experience: s.experience, days: s.days, minutes: s.minutes, equipment: s.equipment, goal: s.goals[0], split: "auto", emphasis: [], avoid: [], likes: [] } },
      });
      await api("/api/skincare/routine", { body: { skinType: s.skinType, concerns: s.concerns, sensitive: s.sensitive, pregnancy: s.pregnancy, save: true } });
      await api("/api/profile", { method: "PATCH", body: { onboarded: true } });
      router.replace("/home");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const aboutYou = {
    title: "Welcome to APEX",
    body: (
      <div className="space-y-5">
        <p className="text-sm text-muted">Everything you enter stays on this phone. There&apos;s no account and no server.</p>
        <Field label="First name"><input className="input" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} maxLength={60} autoComplete="given-name" /></Field>
        <Field label="Date of birth (used for age-appropriate safeguards)"><input className="input" type="date" value={who.birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setWho({ ...who, birthDate: e.target.value })} /></Field>
        {age !== null && age < 13 && <div className="text-sm text-bad">APEX AI is for people aged 13 and older.</div>}
        <button type="button" onClick={demo} disabled={busy} className="text-xs text-accent underline-offset-2 hover:underline">Just exploring? Load sample data instead</button>
      </div>
    ),
  };
  const steps = [
    ...(existing ? [] : [aboutYou]),
    {
      title: "How do you train?",
      body: (
        <div className="space-y-6">
          <Field label="Experience">
            <Chips options={[{ v: "beginner", l: "Under 1 year" }, { v: "intermediate", l: "1–3 years" }, { v: "advanced", l: "3+ years" }] as const} value={[s.experience]} onChange={([v]) => u({ experience: v })} />
          </Field>
          <Field label="Primary goals (up to 2)"><Chips multi max={2} options={GOAL_OPTIONS} value={s.goals as never} onChange={(v) => u({ goals: v.length ? v : s.goals })} /></Field>
          <Field label="Days per week"><Slider min={2} max={6} value={s.days} onChange={(days) => u({ days })} suffix=" days" /></Field>
          <Field label="Minutes per session"><Slider min={30} max={120} step={5} value={s.minutes} onChange={(minutes) => u({ minutes })} suffix=" min" /></Field>
        </div>
      ),
    },
    {
      title: "What equipment do you have?",
      body: (
        <div className="space-y-6">
          <Field label="Select everything available — bodyweight is always included"><Chips multi options={EQUIP_OPTIONS} value={s.equipment as never} onChange={(equipment) => u({ equipment })} /></Field>
          <Field label="Injuries or movements to avoid (optional)">
            <textarea className="input min-h-[80px]" maxLength={500} value={s.injuries} onChange={(e) => u({ injuries: e.target.value })} placeholder="e.g. left shoulder gets irritated by overhead pressing" />
          </Field>
          <Field label="Units"><Chips options={[{ v: "kg", l: "Kilograms" }, { v: "lb", l: "Pounds" }] as const} value={[s.units]} onChange={([units]) => u({ units })} /></Field>
        </div>
      ),
    },
    {
      title: "Your skin",
      body: (
        <div className="space-y-6">
          <Field label="Skin type">
            <div className="grid gap-2 sm:grid-cols-2">
              {SKIN_TYPES.map((t) => (
                <button key={t.v} type="button" onClick={() => u({ skinType: t.v })} className={`rounded-xl border p-3 text-left transition ${s.skinType === t.v ? "border-accent bg-accent/10" : "border-line bg-raised/40 hover:border-line/80"}`}>
                  <div className="text-sm font-medium">{t.l}</div>
                  <div className="text-xs text-muted">{t.d}</div>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Concerns"><Chips multi options={CONCERN_OPTIONS} value={s.concerns as never} onChange={(concerns) => u({ concerns })} /></Field>
          <div className="divide-y divide-line/60 rounded-xl border border-line/60 px-4">
            <Toggle checked={s.sensitive} onChange={(sensitive) => u({ sensitive })} label="My skin reacts easily" />
            <Toggle checked={s.pregnancy} onChange={(pregnancy) => u({ pregnancy })} label="Pregnant, breastfeeding or trying to conceive" hint="Removes retinoids and flags ingredients to check with your clinician." />
          </div>
        </div>
      ),
    },
    {
      title: "Personalisation & privacy",
      body: (
        <div className="space-y-4">
          <div className="divide-y divide-line/60 rounded-xl border border-line/60 px-4">
            <Toggle checked={s.faith} onChange={(faith) => u({ faith })} label="Include faith-based content" hint="Scripture, reflection and faith habits in your daily motivation." />
            <Toggle
              checked={s.memory && !isMinor}
              disabled={isMinor}
              onChange={(memory) => u({ memory })}
              label="Let the AI coach remember preferences"
              hint={isMinor ? "Not available for users under 18." : "The coach will propose things to remember; nothing is saved without your approval. You can view and delete memories anytime."}
            />
          </div>
          <div className="flex gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-fg/90">
            <ShieldCheck className="mt-0.5 shrink-0 text-accent" size={18} />
            <div>
              Photos are <strong>off by default</strong>. When you analyse one, you choose whether to save it. Saved photos are encrypted, private to you and deletable anytime. Photos are never used to identify you, and no facial biometric template is stored.
              {isMinor && <div className="mt-2 text-warn">Because you&apos;re under 18, photo analysis is disabled as an extra safeguard.</div>}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const last = step === steps.length - 1;
  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />
      <div className="relative w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="label">Welcome, {name.split(" ")[0]}</div>
          <div className="flex gap-1.5">{steps.map((_, i) => <span key={i} className={`h-1 w-8 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />)}</div>
        </div>
        <div key={step} className="card card-pad animate-fadeUp">
          <h1 className="h1 mb-6">{steps[step].title}</h1>
          {steps[step].body}
          {err && <div className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{err}</div>}
          <div className="mt-8 flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || busy}><ArrowLeft size={16} /> Back</button>
            {last ? (
              <button className="btn-primary" onClick={finish} disabled={busy}>{busy ? <Spinner /> : null} Build my plan</button>
            ) : (
              <button className="btn-primary" disabled={!existing && step === 0 && (!who.name.trim() || age === null || age < 13)} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={16} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-2.5">{label}</div>
      {children}
    </div>
  );
}
