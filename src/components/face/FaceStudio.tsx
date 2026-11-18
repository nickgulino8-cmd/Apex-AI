"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ScanFace, ShieldCheck, Layers as LayersIcon, Sparkles, AlertTriangle, Plus, X } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { computeMetrics, describe, poseWarning, toPixels, type Metrics, type Pt } from "@/lib/face-metrics";
import { faceLandmarker, loadImage } from "@/lib/vision";
import { PhotoInput } from "@/components/PhotoInput";
import { Notice, Spinner } from "@/components/ui";
import { FaceOverlay, type Layers, type ZoneMark } from "./FaceOverlay";
import { FaceReportView, type CompoundLite } from "./FaceReportView";
import type { FaceReportT } from "./types";

type Detect = { status: "idle" | "loading" | "ok" | "none" | "multi" | "error"; P: Pt[] | null; metrics: Metrics | null; w: number; h: number };

export function FaceStudio({ aiReady, consented, defaultSave, compounds, showRatings, ratingRef }: { aiReady: boolean; consented: boolean; defaultSave: boolean; compounds: CompoundLite; showRatings: boolean; ratingRef: "male" | "female" | null }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);
  const [det, setDet] = useState<Detect>({ status: "idle", P: null, metrics: null, w: 0, h: 0 });
  const [layers, setLayers] = useState<Layers>({ mesh: false, proportions: true, zones: true });
  const [report, setReport] = useState<FaceReportT | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [save, setSave] = useState(defaultSave);
  const [consent, setConsent] = useState(consented);
  const [focus, setFocus] = useState<string | null>(null);
  const [ref, setRef] = useState(ratingRef);
  // Extra shots from the same session steady the rating (averaged); they're never saved.
  const [extras, setExtras] = useState<{ src: string; metrics: Metrics }[]>([]);
  const [adding, setAdding] = useState(false);
  const [extraErr, setExtraErr] = useState<string | null>(null);

  async function addExtra(src: string) {
    setAdding(false);
    setExtraErr(null);
    try {
      const img = await loadImage(src);
      const res = (await faceLandmarker()).detect(img);
      if (res.faceLandmarks.length !== 1) return setExtraErr("That shot didn't show exactly one face. Try again.");
      setExtras((x) => [...x, { src, metrics: computeMetrics(toPixels(res.faceLandmarks[0], img.naturalWidth, img.naturalHeight)) }].slice(0, 2));
    } catch {
      setExtraErr("Couldn't read that shot.");
    }
  }
  const allMetrics = [det.metrics, ...extras.map((e) => e.metrics)].filter((m): m is Metrics => !!m);
  const avgMetrics: Metrics | null = allMetrics.length
    ? (Object.fromEntries(Object.keys(allMetrics[0]).map((k) => [k, allMetrics.reduce((s, m) => s + (m[k as keyof Metrics] as number), 0) / allMetrics.length])) as Metrics)
    : null;

  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    (async () => {
      setDet((d) => ({ ...d, status: "loading" }));
      try {
        const img = await loadImage(photo);
        const lm = await faceLandmarker();
        const res = lm.detect(img);
        if (cancelled) return;
        const w = img.naturalWidth, h = img.naturalHeight;
        if (!res.faceLandmarks.length) return setDet({ status: "none", P: null, metrics: null, w, h });
        if (res.faceLandmarks.length > 1) return setDet({ status: "multi", P: null, metrics: null, w, h });
        const P = toPixels(res.faceLandmarks[0], w, h);
        setDet({ status: "ok", P, metrics: computeMetrics(P), w, h });
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const img = await loadImage(photo).catch(() => null);
          setDet({ status: "error", P: null, metrics: null, w: img?.naturalWidth ?? 1, h: img?.naturalHeight ?? 1 });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [photo]);

  function reset() {
    setPhoto(null);
    setReport(null);
    setErr(null);
    setDet({ status: "idle", P: null, metrics: null, w: 0, h: 0 });
    setExtras([]);
    setAdding(false);
  }

  async function analyse() {
    if (!photo) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ report: FaceReportT }>("/api/face/analyze", { body: { image: photo, extraImages: extras.map((e) => e.src), metrics: avgMetrics, save, consent } });
      setReport(r.report);
      if (!r.report.image_quality.usable) setErr(r.report.image_quality.issues.join(" ") || "The photo wasn't clear enough to analyse.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const marks: ZoneMark[] = report
    ? report.skin.flatMap((s) => s.zones.map((z) => ({ zone: z, label: s.category, tone: s.extent === "moderate" || s.extent === "pronounced" ? "warn" : s.extent === "none_visible" ? "ok" : "accent" }) as ZoneMark))
    : [];
  const warn = det.metrics ? poseWarning(det.metrics) : null;

  if (!photo) {
    return (
      <div className="space-y-4">
        <PhotoInput onPhoto={setPhoto} guide hint="The camera guide checks your angle, distance and lighting, then takes the photo automatically. For best results use even, front-facing light, no filters." />
        <div className="flex gap-3 text-xs text-muted">
          <ShieldCheck size={16} className="shrink-0 text-accent" />
          <p>Landmark measurement runs entirely on your device. Only when you choose <em>Analyse skin</em> is the photo sent to the AI provider for that single analysis. It is never used to identify you, and it&apos;s only stored if you tick &quot;Save to progress&quot;.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <div className="relative">
          <FaceOverlay src={photo} w={det.w || 1} h={det.h || 1} P={det.P} layers={layers} marks={marks} focus={focus} />
          {det.status === "loading" && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/50 text-sm"><span className="flex items-center gap-2"><Spinner /> Mapping 478 landmarks on-device…</span></div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LayersIcon size={14} className="text-dim" />
          {(["proportions", "mesh", "zones"] as const).map((k) => (
            <button key={k} onClick={() => setLayers({ ...layers, [k]: !layers[k] })} className={clsx("chip", layers[k] && "chip-on")}>{k === "zones" ? "Skin zones" : k === "mesh" ? "Landmarks" : "Proportions"}</button>
          ))}
          <button onClick={reset} className="btn-ghost ml-auto py-1.5 text-xs"><RotateCcw size={14} /> New photo</button>
        </div>
        {warn && <Notice tone="warn">{warn}</Notice>}
      </div>

      <div className="space-y-6">
        {det.status === "none" && <Notice tone="warn">No face detected. Use a well-lit, front-facing photo with your whole face in frame.</Notice>}
        {det.status === "multi" && <Notice tone="warn">More than one face detected. Please use a photo of just yourself.</Notice>}
        {det.status === "error" && <Notice tone="warn">On-device landmark detection couldn&apos;t load in this browser. Skin analysis still works; proportion overlays won&apos;t be shown.</Notice>}

        {det.metrics && (
          <details className="group rounded-xl border border-line/60 bg-raised/20">
            <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-sm">
              <span className="flex items-center gap-2"><ScanFace size={14} className="text-accent" /> Measurements{allMetrics.length > 1 ? ` · ${allMetrics.length} shots` : ""}</span>
              <span className="text-[11px] text-dim group-open:hidden">Tap to view</span>
            </summary>
            <div className="divide-y divide-line/40 px-3 pb-2">
              {describe(avgMetrics ?? det.metrics).map((d) => (
                <div key={d.label} className="flex items-baseline justify-between gap-3 py-1.5" title={d.note}>
                  <span className="text-xs text-muted">{d.label}</span><span className="font-mono text-sm tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {!report && det.status !== "multi" && det.status !== "loading" && (
          <div className="rounded-2xl border border-line/70 bg-surface p-5">
            <div className="flex items-center gap-2 font-medium"><Sparkles size={16} className="text-accent" /> AI skin analysis</div>
            <p className="mt-1 text-sm text-muted">{showRatings ? "Rating with how to improve each pillar, skin check and a routine built for you." : "Skin check and a routine built for you."}</p>
            {!aiReady ? (
              <Notice tone="warn"><span className="flex gap-2"><AlertTriangle size={16} className="shrink-0" /> AI analysis needs your Anthropic API key. Add it in Profile → AI. The on-device measurements above work without it.</span></Notice>
            ) : (
              <div className="mt-4 space-y-3">
                {!consented && (
                  <label className="flex items-start gap-2.5 text-xs text-muted">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[rgb(var(--accent))]" />
                    <span>Send this photo to Anthropic (with my key) for this analysis only.</span>
                  </label>
                )}
                {showRatings && (
                  <div className="rounded-xl border border-line/60 bg-raised/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">Rating shots <span className="font-mono text-muted">{1 + extras.length}/3</span></span>
                      {extras.length < 2 && !adding && <button type="button" onClick={() => setAdding(true)} className="btn-ghost py-1 text-xs"><Plus size={13} /> Add shot</button>}
                    </div>
                    <p className="mt-1 text-[11px] text-dim">More shots in the same light = a steadier, averaged score.</p>
                    {extras.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {extras.map((e, i) => (
                          <div key={i} className="relative h-16 w-12 overflow-hidden rounded-lg border border-line">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={e.src} alt={`Extra shot ${i + 1}`} className="h-full w-full object-cover" />
                            <button type="button" onClick={() => setExtras((x) => x.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white" aria-label="Remove shot"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {adding && <div className="mt-3"><PhotoInput onPhoto={addExtra} guide /><button type="button" onClick={() => setAdding(false)} className="mt-2 text-xs text-muted">Cancel</button></div>}
                    {extraErr && <p className="mt-2 text-xs text-bad">{extraErr}</p>}
                  </div>
                )}
                {showRatings && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted">Dimorphism reference:</span>
                    {(["male", "female"] as const).map((r) => (
                      <button key={r} type="button" onClick={async () => { setRef(r); await api("/api/profile", { method: "PATCH", body: { rating_reference: r } }).catch(() => {}); }} className={clsx("chip capitalize", ref === r && "chip-on")}>{r}</button>
                    ))}
                    {!ref && <span className="text-[11px] text-warn">Pick one to score the dimorphism pillar</span>}
                  </div>
                )}
                <label className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="accent-[rgb(var(--accent))]" />
                  Save photo to my private progress gallery (stays on this device)
                </label>
                <button onClick={analyse} disabled={busy || !consent} className="btn-primary w-full">{busy ? <><Spinner /> Analysing, about 20–40 s</> : extras.length ? `Analyse skin + rate ${1 + extras.length} shots` : "Analyse skin"}</button>
              </div>
            )}
          </div>
        )}
        {busy && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>}
        {err && <Notice tone="bad">{err}</Notice>}
        {report && report.image_quality.usable && <FaceReportView report={report} compounds={compounds} onFocus={setFocus} />}
      </div>
    </div>
  );
}
