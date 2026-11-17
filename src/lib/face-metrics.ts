/**
 * Facial measurement maths on MediaPipe Face Landmarker output (478 normalised points).
 * Runs in the browser. Only the small set of aggregate ratios below is ever sent to the
 * server; the landmark coordinates themselves are discarded after drawing the overlay.
 */

export type Pt = { x: number; y: number };
export type Metrics = {
  upperThird: number;
  middleThird: number;
  lowerThird: number;
  asymmetryPct: number;
  jawToCheekRatio: number;
  faceWidthToHeight: number;
  eyeSpacingRatio: number;
  mouthToNoseRatio: number;
  chinToLowerThird: number;
  yawDeg: number;
  rollDeg: number;
};

export const IDX = {
  top: 10,
  glabella: 9,
  subnasale: 2,
  chin: 152,
  lowerLip: 17,
  noseTip: 1,
  cheekL: 234, // image-left face edge
  cheekR: 454,
  jawL: 172,
  jawR: 397,
  eyeOuterL: 33,
  eyeInnerL: 133,
  eyeInnerR: 362,
  eyeOuterR: 263,
  mouthL: 61,
  mouthR: 291,
  noseL: 129,
  noseR: 358,
};

const MIDLINE = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 2, 164, 0, 17, 18, 200, 199, 175, 152];
const PAIRS: [number, number][] = [
  [33, 263], [133, 362], [61, 291], [234, 454], [172, 397], [70, 300], [105, 334], [50, 280],
  [129, 358], [159, 386], [145, 374], [58, 288], [136, 365], [21, 251], [127, 356],
];

/** Approximate centres (landmark groups) and relative radii for annotation zones (image left/right). */
export const ZONE_DEF: Record<string, { pts: number[]; rx: number; ry: number; label: string }> = {
  forehead: { pts: [151, 108, 337, 10], rx: 0.26, ry: 0.09, label: "Forehead" },
  glabella: { pts: [9, 8], rx: 0.07, ry: 0.05, label: "Between brows" },
  nose: { pts: [4, 5, 195], rx: 0.08, ry: 0.12, label: "Nose" },
  image_left_cheek: { pts: [50, 101, 118, 205], rx: 0.13, ry: 0.11, label: "Cheek (image left)" },
  image_right_cheek: { pts: [280, 330, 347, 425], rx: 0.13, ry: 0.11, label: "Cheek (image right)" },
  image_left_under_eye: { pts: [145, 230, 119, 120], rx: 0.09, ry: 0.035, label: "Under-eye (image left)" },
  image_right_under_eye: { pts: [374, 450, 348, 349], rx: 0.09, ry: 0.035, label: "Under-eye (image right)" },
  perioral: { pts: [61, 291, 0, 17], rx: 0.15, ry: 0.08, label: "Around the mouth" },
  chin: { pts: [152, 175, 199, 200], rx: 0.1, ry: 0.06, label: "Chin" },
  image_left_jaw: { pts: [172, 136, 150], rx: 0.07, ry: 0.1, label: "Jaw (image left)" },
  image_right_jaw: { pts: [397, 365, 379], rx: 0.07, ry: 0.1, label: "Jaw (image right)" },
};

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mean = (ps: Pt[]): Pt => ({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length });

export function toPixels(lm: { x: number; y: number }[], w: number, h: number): Pt[] {
  return lm.map((p) => ({ x: p.x * w, y: p.y * h }));
}

/** Least-squares midline x = a*y + b through the central landmarks. */
export function midline(P: Pt[]) {
  const ps = MIDLINE.map((i) => P[i]);
  const my = ps.reduce((s, p) => s + p.y, 0) / ps.length;
  const mx = ps.reduce((s, p) => s + p.x, 0) / ps.length;
  let num = 0, den = 0;
  for (const p of ps) { num += (p.y - my) * (p.x - mx); den += (p.y - my) ** 2; }
  const a = den ? num / den : 0;
  return { a, b: mx - a * my };
}

function reflect(p: Pt, line: { a: number; b: number }): Pt {
  // Line: x - a*y - b = 0  →  normal n = (1, -a)
  const d = (p.x - line.a * p.y - line.b) / (1 + line.a * line.a);
  return { x: p.x - 2 * d, y: p.y + 2 * d * line.a };
}

export function computeMetrics(P: Pt[]): Metrics {
  const g = (k: keyof typeof IDX) => P[IDX[k]];
  const upper = dist(g("top"), g("glabella"));
  const middle = dist(g("glabella"), g("subnasale"));
  const lower = dist(g("subnasale"), g("chin"));
  const total = upper + middle + lower;
  const faceW = dist(g("cheekL"), g("cheekR"));
  const faceH = dist(g("top"), g("chin"));
  const line = midline(P);
  const asym = PAIRS.reduce((s, [l, r]) => s + dist(P[l], reflect(P[r], line)), 0) / PAIRS.length;
  const eyeW = (dist(g("eyeOuterL"), g("eyeInnerL")) + dist(g("eyeInnerR"), g("eyeOuterR"))) / 2;
  const mid = mean([g("cheekL"), g("cheekR")]);
  const yawOffset = Math.max(-1, Math.min(1, ((g("noseTip").x - mid.x) / (faceW / 2)) * 1.6));
  return {
    upperThird: upper / total,
    middleThird: middle / total,
    lowerThird: lower / total,
    asymmetryPct: (asym / faceW) * 100,
    jawToCheekRatio: dist(g("jawL"), g("jawR")) / faceW,
    faceWidthToHeight: faceW / faceH,
    eyeSpacingRatio: dist(g("eyeInnerL"), g("eyeInnerR")) / eyeW,
    mouthToNoseRatio: dist(g("mouthL"), g("mouthR")) / dist(g("noseL"), g("noseR")),
    chinToLowerThird: dist(g("lowerLip"), g("chin")) / lower,
    yawDeg: (Math.asin(yawOffset) * 180) / Math.PI,
    rollDeg: (Math.atan2(g("eyeOuterR").y - g("eyeOuterL").y, g("eyeOuterR").x - g("eyeOuterL").x) * 180) / Math.PI,
  };
}

export function zoneShapes(P: Pt[]) {
  const faceW = dist(P[IDX.cheekL], P[IDX.cheekR]);
  const roll = Math.atan2(P[IDX.eyeOuterR].y - P[IDX.eyeOuterL].y, P[IDX.eyeOuterR].x - P[IDX.eyeOuterL].x) * (180 / Math.PI);
  return Object.fromEntries(
    Object.entries(ZONE_DEF).map(([k, z]) => {
      const c = mean(z.pts.map((i) => P[i]));
      return [k, { cx: c.x, cy: c.y, rx: z.rx * faceW, ry: z.ry * faceW * 1.4, rot: roll, label: z.label }];
    }),
  ) as Record<string, { cx: number; cy: number; rx: number; ry: number; rot: number; label: string }>;
}

/** Neutral, plain-language descriptions of the measurements (no ideals, no rankings). */
export function describe(m: Metrics): { label: string; value: string; note: string }[] {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return [
    { label: "Facial thirds", value: `${pct(m.upperThird)} · ${pct(m.middleThird)} · ${pct(m.lowerThird)}`, note: "Upper (mesh top to brows) · middle (brows to nose base) · lower (nose base to chin). The mesh stops below the hairline, so the upper third reads short." },
    { label: "Landmark asymmetry", value: `${m.asymmetryPct.toFixed(1)}%`, note: "Average left–right landmark offset as a share of face width. Every face has some asymmetry, and head turn or expression changes this number." },
    { label: "Jaw-to-cheekbone width", value: m.jawToCheekRatio.toFixed(2), note: "Width at the jaw angles relative to width at the cheekbones." },
    { label: "Width-to-height", value: m.faceWidthToHeight.toFixed(2), note: "Cheekbone width relative to mesh-top-to-chin height." },
    { label: "Eye spacing", value: m.eyeSpacingRatio.toFixed(2), note: "Distance between inner eye corners relative to average eye width." },
    { label: "Mouth-to-nose width", value: m.mouthToNoseRatio.toFixed(2), note: "Mouth corner width relative to nose width." },
    { label: "Chin share of lower third", value: pct(m.chinToLowerThird), note: "Lower lip to chin, as a share of nose-base-to-chin." },
  ];
}

export function poseWarning(m: Metrics): string | null {
  if (Math.abs(m.yawDeg) > 12) return `Head is turned about ${Math.abs(Math.round(m.yawDeg))}°. Face the camera straight on for comparable measurements.`;
  if (Math.abs(m.rollDeg) > 8) return `Head is tilted about ${Math.abs(Math.round(m.rollDeg))}°. Keep your head level.`;
  return null;
}
