import { computeMetrics, IDX, type Pt } from "./face-metrics";

/** Live checks for a consistent, comparable face photo. Pure function; inputs are pixels. */
export type Check = { key: string; label: string; ok: boolean; hint: string };

export function evaluateFrame(
  faces: Pt[][],
  frame: { w: number; h: number },
  light: { mean: number; leftRight: number } | null,
): Check[] {
  if (faces.length !== 1) {
    return [{ key: "face", label: "One face in frame", ok: false, hint: faces.length ? "Only you in the photo" : "Look at the camera" }];
  }
  const P = faces[0];
  const m = computeMetrics(P);
  const faceW = Math.hypot(P[IDX.cheekR].x - P[IDX.cheekL].x, P[IDX.cheekR].y - P[IDX.cheekL].y) / frame.w;
  const nose = P[IDX.noseTip];
  const offX = Math.abs(nose.x / frame.w - 0.5);
  const offY = Math.abs(nose.y / frame.h - 0.5);
  return [
    { key: "face", label: "One face in frame", ok: true, hint: "" },
    { key: "yaw", label: "Facing straight", ok: Math.abs(m.yawDeg) <= 6, hint: m.yawDeg > 0 ? "Turn your head slightly the other way" : "Turn your head slightly" },
    { key: "roll", label: "Head level", ok: Math.abs(m.rollDeg) <= 4, hint: "Straighten your head" },
    { key: "dist", label: "Distance", ok: faceW >= 0.32 && faceW <= 0.62, hint: faceW < 0.32 ? "Move closer" : "Move back a little" },
    { key: "center", label: "Centered", ok: offX <= 0.1 && offY <= 0.14, hint: "Center your face in the oval" },
    { key: "bright", label: "Bright enough", ok: !light || (light.mean >= 70 && light.mean <= 215), hint: light && light.mean > 215 ? "Too bright: avoid direct light" : "Find brighter, even light" },
    { key: "even", label: "Even lighting", ok: !light || light.leftRight <= 0.22, hint: "Light is coming from one side: face the light source" },
  ];
}

/** Mean luminance of a face box and its left/right imbalance (0 = perfectly even). */
export function measureLight(ctx: CanvasRenderingContext2D, src: CanvasImageSource, box: { x: number; y: number; w: number; h: number }) {
  const N = 24;
  ctx.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, N, N);
  const d = ctx.getImageData(0, 0, N, N).data;
  let l = 0, r = 0;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (x < N / 2) l += lum;
      else r += lum;
    }
  const half = (N * N) / 2;
  const mean = (l + r) / (N * N);
  return { mean, leftRight: mean ? Math.abs(l / half - r / half) / mean : 0 };
}
