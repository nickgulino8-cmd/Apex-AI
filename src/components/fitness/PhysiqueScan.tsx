"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { RotateCcw, Sparkles, Info, Dna, Activity, Wand2, Check, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { poseLandmarker, loadImage } from "@/lib/vision";
import { PhotoInput } from "@/components/PhotoInput";
import { Anatomy } from "@/components/Anatomy";
import { Badge, Notice, Spinner } from "@/components/ui";
import { RatingCard } from "@/components/RatingCard";
import { GROUP_LABEL, type MuscleGroup } from "@/lib/data/exercises";
import type { BodyReportT } from "@/components/face/types";

const DEV = { less_developed: 1, balanced: 0.45, more_developed: 0.15, cannot_assess: undefined } as const;
const DEV_LABEL = { less_developed: "Less developed (relative)", balanced: "Balanced", more_developed: "More developed (relative)", cannot_assess: "Can't assess" };
const POSE_LINKS: [number, number][] = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

type Shot = { view: "front" | "back"; src: string; pose: { x: number; y: number }[] | null; w: number; h: number };
export type PastScan = { id: string; created_at: string; report: BodyReportT };

export function PhysiqueScan({ aiReady, consented, exerciseNames, past, showRatings }: { aiReady: boolean; consented: boolean; exerciseNames: Record<string, string>; past: PastScan[]; showRatings: boolean }) {
  const router = useRouter();
  const [shots, setShots] = useState<Shot[]>([]);
  const [adding, setAdding] = useState<"front" | "back">("front");
  const [report, setReport] = useState<BodyReportT | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [consent, setConsent] = useState(consented);
  const [save, setSave] = useState(false);
  const [applied, setApplied] = useState(false);
  const [sel, setSel] = useState<MuscleGroup | null>(null);

  async function addShot(src: string) {
    const img = await loadImage(src);
    let pose: Shot["pose"] = null;
    try {
      const r = (await poseLandmarker()).detect(img);
      if (r.landmarks[0]) pose = r.landmarks[0].map((p) => ({ x: p.x * img.naturalWidth, y: p.y * img.naturalHeight }));
    } catch (e) { console.warn(e); }
    setShots((s) => [...s.filter((x) => x.view !== adding), { view: adding, src, pose, w: img.naturalWidth, h: img.naturalHeight }]);
    if (adding === "front") setAdding("back");
  }

  async function analyse() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ report: BodyReportT }>("/api/body/analyze", { body: { images: shots.map((s) => ({ image: s.src, view: s.view })), save, consent } });
      setReport(r.report);
      if (!r.report.image_quality.usable) setErr(r.report.image_quality.issues.join(" ") || "Photos weren't clear enough.");
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function applyEmphasis(groups: MuscleGroup[]) {
    await api("/api/program/emphasis", { body: { emphasis: groups.slice(0, 4) } });
    setApplied(true);
    router.refresh();
  }

  const values = report ? Object.fromEntries(report.groups.map((g) => [g.group, DEV[g.relative_development]])) : undefined;
  const selObs = report?.groups.find((g) => g.group === sel);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(["front", "back"] as const).map((v) => {
              const s = shots.find((x) => x.view === v);
              return (
                <button key={v} onClick={() => setAdding(v)} className={clsx("relative aspect-[3/4] overflow-hidden rounded-2xl border bg-raised/30 text-left", adding === v ? "border-accent" : "border-line/70")}>
                  {s ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.src} alt={`${v} view`} className="absolute inset-0 h-full w-full object-cover" />
                      {s.pose && (
                        <svg viewBox={`0 0 ${s.w} ${s.h}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
                          {POSE_LINKS.map(([a, b]) => <line key={`${a}-${b}`} x1={s.pose![a].x} y1={s.pose![a].y} x2={s.pose![b].x} y2={s.pose![b].y} stroke="rgb(var(--accent))" strokeWidth={s.w / 160} strokeLinecap="round" opacity={0.85} />)}
                          {[11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].map((i) => <circle key={i} cx={s.pose![i].x} cy={s.pose![i].y} r={s.w / 110} fill="rgb(var(--fg))" />)}
                        </svg>
                      )}
                    </>
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted">{v === "front" ? "Front (required)" : "Back (optional)"}</div>
                  )}
                  <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] capitalize text-white">{v}</span>
                </button>
              );
            })}
          </div>
          <PhotoInput onPhoto={addShot} facing="environment" hint={`Adding the ${adding} view. Relaxed stance, arms slightly away from the body, even lighting, fitted clothing or shirtless so muscles are visible.`} />
          {shots.length > 0 && <button onClick={() => { setShots([]); setReport(null); setAdding("front"); }} className="btn-ghost py-1.5 text-xs"><RotateCcw size={14} /> Start over</button>}
        </div>

        <div className="space-y-4">
          {!report && (
            <div className="card card-pad space-y-3">
              <div className="flex items-center gap-2 font-medium"><Sparkles size={16} className="text-accent" /> Muscle balance scan</div>
              <p className="text-sm text-muted">The AI compares how developed each visible muscle group looks <em>relative to your own other groups</em>, notes posture, and recommends what to emphasise{showRatings ? ". You also get a physique rating across four pillars: proportions, development, symmetry and definition" : ""}. No body-fat percentage estimates.</p>
              {!aiReady ? (
                <Notice tone="warn">AI analysis isn&apos;t configured on this server (missing ANTHROPIC_API_KEY). The on-device pose overlay still works.</Notice>
              ) : (
                <>
                  {!consented && (
                    <label className="flex items-start gap-2.5 text-xs text-muted">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[rgb(var(--accent))]" />
                      <span>I agree to send these photos to APEX&apos;s AI provider for a one-time analysis. They aren&apos;t used for identification, and anything saved can be deleted.</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="accent-[rgb(var(--accent))]" /> Save photos to my private progress gallery</label>
                  <button onClick={analyse} disabled={busy || !consent || !shots.some((s) => s.view === "front")} className="btn-primary w-full">{busy ? <><Spinner /> Analysing…</> : "Run scan"}</button>
                </>
              )}
              {busy && <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="skeleton h-14" />)}</div>}
            </div>
          )}
          {err && <Notice tone="bad">{err}</Notice>}
          {report && report.image_quality.usable && (
            <div className="card card-pad space-y-5 animate-fadeUp">
              <p className="text-[15px] leading-relaxed">{report.summary}</p>
              <Anatomy values={values} selected={sel} onSelect={setSel} labels={GROUP_LABEL} />
              <div className="flex items-center gap-3 text-[11px] text-dim"><span className="h-2 w-6 rounded bg-accent" /> Brighter = more emphasis suggested <span className="h-2 w-6 rounded bg-accent/20" /> Balanced/developed</div>
              {selObs && (
                <div className="rounded-xl border border-line/60 bg-raised/30 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between"><span className="font-medium">{GROUP_LABEL[sel!]}</span><Badge>{DEV_LABEL[selObs.relative_development]}</Badge></div>
                  <p className="text-muted">{selObs.observation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {report && report.image_quality.usable && <RatingCard rating={report.ratings} error={report.rating_error} title="Physique rating · four pillars" />}
      {report && report.image_quality.usable && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card card-pad">
            <div className="label mb-3">Training priorities</div>
            <div className="space-y-3">
              {report.priorities.map((p) => (
                <div key={p.group} className="rounded-xl border border-line/60 bg-raised/30 p-3.5">
                  <div className="font-medium">{GROUP_LABEL[p.group as MuscleGroup]}</div>
                  <p className="mt-0.5 text-[13px] text-muted">{p.why}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{p.exercise_ids.map((id) => <Link key={id} href={`/exercises/${id}`} className="chip hover:text-fg">{exerciseNames[id] ?? id}</Link>)}</div>
                </div>
              ))}
            </div>
            {report.priorities.length > 0 && (
              <button onClick={() => applyEmphasis(report.priorities.map((p) => p.group as MuscleGroup))} disabled={applied} className="btn-primary mt-4 w-full">
                {applied ? <><Check size={16} /> Program updated</> : <><Wand2 size={16} /> Add these as emphasis in my program</>}
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div className="card card-pad">
              <div className="label mb-3 flex items-center gap-2"><Activity size={13} /> Group-by-group</div>
              <div className="divide-y divide-line/60">
                {report.groups.filter((g) => g.visibility !== "not_visible").map((g) => (
                  <div key={g.group} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{GROUP_LABEL[g.group as MuscleGroup]}</span><Badge tone={g.relative_development === "less_developed" ? "accent" : "neutral"}>{DEV_LABEL[g.relative_development]}</Badge></div>
                    <p className="mt-0.5 text-[13px] text-muted">{g.observation}</p>
                  </div>
                ))}
              </div>
            </div>
            {report.posture.length > 0 && (
              <div className="card card-pad"><div className="label mb-2">Posture notes</div><ul className="space-y-1 text-sm text-fg/90">{report.posture.map((x) => <li key={x}>— {x}</li>)}</ul></div>
            )}
            {report.structure_notes.length > 0 && (
              <div className="rounded-2xl border border-line/70 bg-surface p-5">
                <div className="label mb-2 flex items-center gap-2"><Dna size={13} /> Muscle shape & insertions</div>
                <ul className="space-y-1.5 text-sm text-fg/90">{report.structure_notes.map((x) => <li key={x}>— {x}</li>)}</ul>
                <p className="mt-3 flex gap-2 text-xs text-muted"><Info size={14} className="mt-0.5 shrink-0" />Insertion points and muscle-belly length are set by genetics. Training can&apos;t change them, a photo can&apos;t reliably judge them, and they don&apos;t stop a muscle from growing. There&apos;s no such thing as a &quot;bad&quot; insertion.</p>
              </div>
            )}
            {report.professional.length > 0 && <Notice tone="warn">{report.professional.map((p) => p.reason).join(" ")}</Notice>}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div className="label mb-3">Previous scans</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{new Date(p.created_at.replace(" ", "T") + "Z").toLocaleDateString()}{p.report.ratings && <span className="ml-2 font-mono text-accent">{p.report.ratings.overall.score.toFixed(1)}</span>}</span>
                  <button onClick={async () => { if (confirm("Delete this scan and any saved photo?")) { await api(`/api/analyses/body/${p.id}`, { method: "DELETE" }); router.refresh(); } }} className="text-dim hover:text-bad" aria-label="Delete scan"><Trash2 size={14} /></button>
                </div>
                <p className="line-clamp-3 text-xs text-muted">{p.report.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">{p.report.priorities.map((x) => <Badge key={x.group} tone="accent">{GROUP_LABEL[x.group as MuscleGroup]}</Badge>)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
