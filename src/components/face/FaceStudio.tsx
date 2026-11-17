"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ScanFace, ShieldCheck, Layers as LayersIcon, Sparkles, AlertTriangle } from "lucide-react";
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

export function FaceStudio({ aiReady, consented, defaultSave, compounds }: { aiReady: boolean; consented: boolean; defaultSave: boolean; compounds: CompoundLite }) {
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
  }

  async function analyse() {
    if (!photo) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ report: FaceReportT }>("/api/face/analyze", { body: { image: photo, metrics: det.metrics, save, consent } });
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
        <PhotoInput onPhoto={setPhoto} />
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
          <div>
            <div className="label mb-3 flex items-center gap-2"><ScanFace size={13} /> On-device measurements</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {describe(det.metrics).map((d) => (
                <div key={d.label} className="rounded-xl border border-line/60 bg-raised/30 p-3">
                  <div className="flex items-baseline justify-between gap-2"><span className="text-xs text-muted">{d.label}</span><span className="font-mono text-sm tabular-nums">{d.value}</span></div>
                  <p className="mt-1 text-[11px] leading-snug text-dim">{d.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-dim">These are descriptive measurements, not scores. There&apos;s no &quot;ideal&quot; value. Camera distance, lens and expression all shift them.</p>
          </div>
        )}

        {!report && det.status !== "multi" && det.status !== "loading" && (
          <div className="rounded-2xl border border-line/70 bg-surface p-5">
            <div className="flex items-center gap-2 font-medium"><Sparkles size={16} className="text-accent" /> AI skin analysis</div>
            <p className="mt-1 text-sm text-muted">Texture, blemishes, redness, pigmentation, under-eye and oil/hydration. You&apos;ll get neutral observations, annotated zones and an OTC routine.</p>
            {!aiReady ? (
              <Notice tone="warn"><span className="flex gap-2"><AlertTriangle size={16} className="shrink-0" /> AI analysis isn&apos;t configured on this server (missing ANTHROPIC_API_KEY). On-device measurements above still work.</span></Notice>
            ) : (
              <div className="mt-4 space-y-3">
                {!consented && (
                  <label className="flex items-start gap-2.5 text-xs text-muted">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[rgb(var(--accent))]" />
                    <span>I agree to send this photo to APEX&apos;s AI provider for a one-time skin analysis. It&apos;s not used for identification or to train models through APEX, and I can delete anything saved.</span>
                  </label>
                )}
                <label className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="accent-[rgb(var(--accent))]" />
                  Save photo to my private progress gallery (encrypted)
                </label>
                <button onClick={analyse} disabled={busy || !consent} className="btn-primary w-full">{busy ? <><Spinner /> Analysing — about 20–40 s</> : "Analyse skin"}</button>
              </div>
            )}
          </div>
        )}
        {busy && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>}
        {err && <Notice tone="bad">{err}</Notice>}
        {report && report.image_quality.usable && <FaceReportView report={report} compounds={compounds} onFocus={setFocus} />}
        <p className="text-[11px] leading-relaxed text-dim">APEX describes what&apos;s visible and never rates attractiveness, guesses age or ethnicity, or diagnoses conditions. These observations are not a medical assessment.</p>
      </div>
    </div>
  );
}
