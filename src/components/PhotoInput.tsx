"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X, Aperture } from "lucide-react";
import { prepareImage } from "@/lib/client";

/** Upload or capture a photo. Output is a downscaled, metadata-stripped JPEG data URL. */
export function PhotoInput({ onPhoto, facing = "user", hint }: { onPhoto: (dataUrl: string) => void; facing?: "user" | "environment"; hint?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
  }
  async function capture() {
    if (!videoRef.current) return;
    const { dataUrl } = await prepareImage(videoRef.current);
    closeCamera();
    onPhoto(dataUrl);
  }
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
          <div className="h-[70%] w-[50%] rounded-[50%] border-2 border-dashed border-white/40 sm:h-[80%] sm:w-[34%]" />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 p-5">
          <button onClick={closeCamera} className="btn-ghost bg-black/50 text-white" aria-label="Close camera"><X size={18} /></button>
          <button onClick={capture} className="grid h-16 w-16 place-items-center rounded-full border-4 border-white/80 bg-accent text-white" aria-label="Take photo"><Aperture size={26} /></button>
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
