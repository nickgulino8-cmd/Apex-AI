"use client";
import { localFetch } from "./local-fetch";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/** Fetch wrapper: JSON in/out, throws ApiError with the server's message. */
export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const res = await localFetch(url, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const d = data as { error?: string; code?: string; issues?: string[] } | null;
    throw new ApiError(res.status, d?.issues?.length ? `${d.error}: ${d.issues.join("; ")}` : d?.error ?? `Request failed (${res.status})`, d?.code);
  }
  return data as T;
}

export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Load an image file/blob, downscale to max 1280px and re-encode as JPEG.
 * Re-encoding through a canvas strips EXIF metadata (including GPS location) before upload.
 */
export async function prepareImage(src: Blob | HTMLVideoElement, max = 1280): Promise<{ dataUrl: string; width: number; height: number }> {
  let source: CanvasImageSource;
  let w: number, h: number;
  if (src instanceof HTMLVideoElement) {
    source = src;
    w = src.videoWidth;
    h = src.videoHeight;
  } else {
    const bmp = await createImageBitmap(src, { imageOrientation: "from-image" });
    source = bmp;
    w = bmp.width;
    h = bmp.height;
  }
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  if (src instanceof HTMLVideoElement) {
    // Mirror selfie camera frames so they match what the user saw.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.88), width: canvas.width, height: canvas.height };
}
