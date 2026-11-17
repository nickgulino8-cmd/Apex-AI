"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X, Aperture, Check as CheckIcon } from "lucide-react";
import clsx from "clsx";
import { prepareImage } from "@/lib/client";
import { faceLandmarkerVideo } from "@/lib/vision";
import { toPixels } from "@/lib/face-metrics";
import { evaluateFrame, measureLight, type Check } from "@/lib/capture-guide";

/** Upload or capture a photo. Output is a downscaled, metadata-stripped JPEG data URL. */
export function PhotoInput({ onPhoto, facing = "user", hint, guide = false }: { onPhoto: (dataUrl: string) => void; facing?: "user" | "environment"; hint?: string; guide?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [hold, setHold] = useState(0); // 0–1 progress toward auto-capture

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);
  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  async function openCamera() {
    setErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      setStream(s);
    } catch {
      setErr("Camera unavailable. Check browser permissions, or upload a photo instead.");
    }
  }
  function closeCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setChecks(null);
    setHold(0);
  }
  async function capture() {
    if (!videoRef.current) return;
    const { dataUrl } = await prepareImage(videoRef.current);
    closeCamera();
    onPhoto(dataUrl);
  }
  // Live capture guide: checks pose, distance, centering and lighting, then auto-captures.
  useEffect(() => {
    if (!stream || !guide) return;
    let alive = true;
    let raf = 0;
    let lm: Awaited<ReturnType<typeof faceLandmarkerVideo>> | null = null;
    let lastT = 0, lastLight = 0, okSince: number | null = null;
    let light: { mean: number; leftRight: number } | null = null;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    faceLandmarkerVideo().then((l) => { lm = l; }).catch(() => setChecks(null));
    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      const v = videoRef.current;
      if (!lm || !v || v.readyState < 2 || t - lastT < 110) return;
      lastT = t;
      const res = lm.detectForVideo(v, t);
      const faces = res.faceLandmarks.map((f) => toPixels(f, v.videoWidth, v.videoHeight));
      if (faces.length === 1 && ctx && t - lastLight > 400) {
        const xs = faces[0].map((p) => p.x), ys = faces[0].map((p) => p.y);
        const x = Math.max(0, Math.min(...xs)), y = Math.max(0, Math.min(...ys));
        light = measureLight(ctx, v, { x, y, w: Math.max(1, Math.max(...xs) - x), h: Math.max(1, Math.max(...ys) - y) });
        lastLight = t;
      }
      const cs = evaluateFrame(faces, { w: v.videoWidth, h: v.videoHeight }, light);
      setChecks(cs);
      if (cs.every((c) => c.ok)) {
        okSince ??= t;
        const p = Math.min(1, (t - okSince) / 1000);
        setHold(p);
        if (p >= 1) { alive = false; void capture(); }
      } else { okSince = null; setHold(0); }
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, guide]);

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type)) return setErr("Please choose a JPEG, PNG or WebP image.");
    if (f.size > 25 * 1024 * 1024) return setErr("That file is too large (25 MB max).");
    try {
      const { dataUrl } = await prepareImage(f);
      onPhoto(dataUrl);
    } catch {
      setErr("Couldn't read that image. Try a JPEG or PNG.");
    }
  }

  if (stream)
    return (
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full -scale-x-100 object-cover sm:aspect-video" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className={clsx("h-[70%] w-[50%] rounded-[50%] border-2 transition-colors sm:h-[80%] sm:w-[34%]", !guide || !checks ? "border-dashed border-white/40" : checks.every((c) => c.ok) ? "border-solid border-ok" : "border-dashed border-warn/80")} />
        </div>
        {guide && checks && (
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4 text-center text-white">
            <div className="text-sm font-medium">{checks.find((c) => !c.ok)?.hint ?? (hold > 0 ? "Hold still…" : "Looks good")}</div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {checks.map((c) => (
                <span key={c.key} className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]", c.ok ? "bg-ok/25 text-ok" : "bg-white/10 text-white/70")}>
                  {c.ok && <CheckIcon size={10} />}{c.label}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 p-5">
          <button onClick={closeCamera} className="btn-ghost bg-black/50 text-white" aria-label="Close camera"><X size={18} /></button>
          <button onClick={capture} className="relative grid h-16 w-16 place-items-center rounded-full border-4 border-white/80 bg-accent text-white" aria-label="Take photo">
            <Aperture size={26} />
            {guide && hold > 0 && (
              <svg className="absolute -inset-1.5 -rotate-90" viewBox="0 0 76 76"><circle cx="38" cy="38" r="35" fill="none" stroke="rgb(var(--ok))" strokeWidth="4" strokeDasharray={220} strokeDashoffset={220 * (1 - hold)} /></svg>
            )}
          </button>
          {guide && checks && !checks.every((c) => c.ok) && <button onClick={capture} className="text-xs text-white/70 underline">Take anyway</button>}
        </div>
      </div>
    );

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
        className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-line bg-raised/20 px-6 py-12 text-center"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-raised"><Camera className="text-accent" size={24} /></div>
        <div>
          <div className="font-medium">Add a photo</div>
          <div className="mt-1 max-w-sm text-sm text-muted">{hint ?? "Even, front-facing light. No filters or makeup for the most accurate skin observations."}</div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={openCamera} className="btn-primary"><Camera size={16} /> Use camera</button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost"><Upload size={16} /> Upload</button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {err && <div className="mt-3 text-sm text-bad">{err}</div>}
    </div>
  );
}
