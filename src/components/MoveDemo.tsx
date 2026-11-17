"use client";
import { useEffect, useRef, useState } from "react";
import type { Pattern } from "@/lib/data/exercise-types";

/**
 * Animated movement demonstrations. Each movement pattern is defined by two key poses
 * (start/end) for a simple figure; we interpolate between them with an ease-in-out loop.
 * These illustrate the *pattern* (joint path & range of motion), not a specific body.
 */
type XY = [number, number];
type Pose = Record<string, XY>;
type Def = { segs: [string, string][]; A: Pose; B: Pose; head: string; props?: (p: Pose) => React.ReactNode; scene?: React.ReactNode; note?: string };

const LEG: [string, string][] = [["hip", "knee"], ["knee", "ankle"], ["ankle", "toe"]];
const LEG2: [string, string][] = [["hip", "knee2"], ["knee2", "ankle2"], ["ankle2", "toe2"]];
const TORSO: [string, string][] = [["neck", "hip"]];
const ARM: [string, string][] = [["neck", "elbow"], ["elbow", "hand"]];
const ARM2: [string, string][] = [["neck", "elbow2"], ["elbow2", "hand2"]];
const SIDE = [...TORSO, ...ARM, ...LEG];

const stand: Pose = { head: [100, 38], neck: [100, 54], hip: [100, 108], knee: [100, 144], ankle: [100, 178], toe: [114, 180], elbow: [100, 82], hand: [101, 106] };
const plate = (p: Pose, k = "hand", r = 9) => <circle cx={p[k][0]} cy={p[k][1]} r={r} className="fill-none stroke-silver" strokeWidth={3} />;
const db = (p: Pose, k = "hand") => <rect x={p[k][0] - 8} y={p[k][1] - 3} width={16} height={6} rx={2} className="fill-silver" />;
const ground = <line x1={10} x2={190} y1={182} y2={182} className="stroke-line" strokeWidth={2} />;
const bench = <rect x={40} y={128} width={110} height={8} rx={3} className="fill-line" />;
const up = (p: Pose, dy: number): Pose => Object.fromEntries(Object.entries(p).map(([k, [x, y]]) => [k, [x, y + dy]])) as Pose;

const DEFS: Record<Pattern, Def> = {
  squat: {
    segs: SIDE, head: "head", scene: ground,
    A: { ...stand, elbow: [88, 64], hand: [96, 56] },
    B: { head: [118, 76], neck: [112, 90], hip: [76, 136], knee: [116, 140], ankle: [100, 178], toe: [114, 180], elbow: [98, 98], hand: [106, 92] },
    props: (p) => plate(p, "neck", 11),
  },
  hinge: {
    segs: SIDE, head: "head", scene: ground,
    A: stand,
    B: { head: [148, 86], neck: [134, 92], hip: [82, 110], knee: [104, 144], ankle: [100, 178], toe: [114, 180], elbow: [132, 118], hand: [130, 142] },
    props: (p) => plate(p, "hand", 11),
  },
  lunge: {
    segs: [...SIDE, ...LEG2], head: "head", scene: ground,
    A: { ...stand, knee2: [100, 144], ankle2: [100, 178], toe2: [114, 180] },
    B: { head: [104, 66], neck: [104, 82], hip: [100, 134], knee: [128, 146], ankle: [126, 178], toe: [140, 180], elbow: [104, 108], hand: [105, 130], knee2: [84, 172], ankle2: [60, 176], toe2: [52, 180] },
    props: (p) => db(p),
  },
  "bench-press": {
    segs: [["neck", "hip"], ...ARM, ["hip", "knee"], ["knee", "ankle"]], head: "head", scene: <>{ground}{bench}</>,
    A: { head: [52, 120], neck: [64, 122], hip: [124, 122], knee: [154, 112], ankle: [158, 180], elbow: [70, 100], hand: [72, 76] },
    B: { head: [52, 120], neck: [64, 122], hip: [124, 122], knee: [154, 112], ankle: [158, 180], elbow: [58, 124], hand: [72, 110] },
    props: (p) => plate(p, "hand", 8),
  },
  "overhead-press": {
    segs: SIDE, head: "head", scene: ground,
    A: { ...stand, elbow: [110, 70], hand: [106, 56] },
    B: { ...stand, elbow: [104, 34], hand: [102, 12] },
    props: (p) => plate(p, "hand", 8),
  },
  pushup: {
    segs: SIDE, head: "head", scene: ground,
    A: { head: [162, 120], neck: [150, 126], hip: [104, 146], knee: [72, 160], ankle: [40, 174], toe: [36, 182], elbow: [150, 152], hand: [150, 180] },
    B: { head: [164, 156], neck: [150, 162], hip: [104, 168], knee: [72, 174], ankle: [40, 178], toe: [36, 182], elbow: [130, 162], hand: [150, 180] },
  },
  dip: {
    segs: SIDE, head: "head",
    scene: <><line x1={80} x2={130} y1={112} y2={112} className="stroke-silver" strokeWidth={4} /><line x1={125} x2={125} y1={112} y2={182} className="stroke-line" strokeWidth={3} />{ground}</>,
    A: { head: [104, 52], neck: [102, 68], hip: [100, 124], knee: [92, 154], ankle: [74, 160], toe: [70, 168], elbow: [102, 92], hand: [103, 112] },
    B: { head: [108, 78], neck: [104, 94], hip: [100, 148], knee: [92, 176], ankle: [74, 180], toe: [70, 186], elbow: [82, 92], hand: [103, 112] },
  },
  fly: {
    segs: [["neck", "hip"], ...ARM, ["hip", "knee"], ["knee", "ankle"]], head: "head", scene: <>{ground}{bench}</>,
    A: { head: [52, 120], neck: [64, 122], hip: [124, 122], knee: [154, 112], ankle: [158, 180], elbow: [70, 98], hand: [72, 76] },
    B: { head: [52, 120], neck: [64, 122], hip: [124, 122], knee: [154, 112], ankle: [158, 180], elbow: [58, 112], hand: [44, 124] },
    props: (p) => db(p),
  },
  row: {
    segs: SIDE, head: "head", scene: ground,
    A: { head: [150, 84], neck: [134, 92], hip: [86, 112], knee: [104, 144], ankle: [100, 178], toe: [114, 180], elbow: [132, 118], hand: [132, 142] },
    B: { head: [150, 84], neck: [134, 92], hip: [86, 112], knee: [104, 144], ankle: [100, 178], toe: [114, 180], elbow: [110, 98], hand: [124, 118] },
    props: (p) => plate(p, "hand", 10),
  },
  "pull-vertical": {
    segs: SIDE, head: "head", scene: <line x1={60} x2={140} y1={18} y2={18} className="stroke-silver" strokeWidth={4} />,
    A: { head: [104, 46], neck: [100, 60], hip: [100, 116], knee: [100, 150], ankle: [100, 180], toe: [108, 186], elbow: [100, 40], hand: [100, 18] },
    B: { head: [106, 12], neck: [102, 30], hip: [100, 86], knee: [100, 120], ankle: [100, 150], toe: [108, 156], elbow: [86, 36], hand: [100, 18] },
  },
  "hip-thrust": {
    segs: SIDE, head: "head", scene: <><rect x={30} y={118} width={34} height={64} rx={3} className="fill-line" />{ground}</>,
    A: { head: [48, 112], neck: [60, 118], hip: [96, 164], knee: [126, 142], ankle: [130, 178], toe: [142, 180], elbow: [80, 140], hand: [96, 160] },
    B: { head: [48, 112], neck: [60, 118], hip: [100, 120], knee: [132, 126], ankle: [130, 178], toe: [142, 180], elbow: [82, 112], hand: [100, 118] },
    props: (p) => plate(p, "hip", 12),
  },
  "leg-extension": {
    segs: SIDE, head: "head", scene: <><rect x={70} y={124} width={56} height={8} rx={3} className="fill-line" /><rect x={66} y={60} width={8} height={70} rx={3} className="fill-line" />{ground}</>,
    A: { head: [84, 50], neck: [86, 66], hip: [90, 120], knee: [126, 120], ankle: [128, 164], toe: [138, 168], elbow: [92, 96], hand: [100, 120] },
    B: { head: [84, 50], neck: [86, 66], hip: [90, 120], knee: [126, 120], ankle: [168, 112], toe: [174, 102], elbow: [92, 96], hand: [100, 120] },
  },
  "leg-curl": {
    segs: SIDE, head: "head", scene: <>{ground}{bench}</>,
    A: { head: [36, 118], neck: [50, 122], hip: [104, 122], knee: [144, 122], ankle: [184, 122], toe: [190, 116], elbow: [42, 132], hand: [34, 128] },
    B: { head: [36, 118], neck: [50, 122], hip: [104, 122], knee: [144, 122], ankle: [154, 84], toe: [164, 80], elbow: [42, 132], hand: [34, 128] },
  },
  "calf-raise": {
    segs: SIDE, head: "head", scene: ground,
    A: stand,
    B: { ...up(stand, -12), toe: [114, 180] },
    props: (p) => db(p),
  },
  curl: {
    segs: SIDE, head: "head", scene: ground,
    A: stand,
    B: { ...stand, elbow: [101, 84], hand: [114, 64] },
    props: (p) => db(p),
  },
  pushdown: {
    segs: SIDE, head: "head", scene: <>{ground}<rect x={150} y={10} width={10} height={172} rx={2} className="fill-line" /></>,
    A: { ...stand, head: [104, 40], neck: [102, 56], elbow: [104, 84], hand: [122, 70] },
    B: { ...stand, head: [104, 40], neck: [102, 56], elbow: [104, 84], hand: [110, 108] },
    props: (p) => <line x1={p.hand[0]} y1={p.hand[1]} x2={150} y2={14} className="stroke-dim" strokeWidth={1.5} strokeDasharray="3 3" />,
  },
  "overhead-extension": {
    segs: SIDE, head: "head", scene: ground,
    A: { ...stand, elbow: [104, 26], hand: [86, 44] },
    B: { ...stand, elbow: [104, 26], hand: [106, 4] },
    props: (p) => db(p),
  },
  "lateral-raise": {
    segs: [["neck", "hip"], ["neck", "sh"], ["sh", "elbow"], ["elbow", "hand"], ["neck", "sh2"], ["sh2", "elbow2"], ["elbow2", "hand2"], ["hip", "knee"], ["knee", "ankle"], ["hip", "knee2"], ["knee2", "ankle2"]],
    head: "head", scene: ground, note: "Front view",
    A: { head: [100, 36], neck: [100, 52], sh: [86, 58], sh2: [114, 58], hip: [100, 108], knee: [92, 144], ankle: [90, 180], knee2: [108, 144], ankle2: [110, 180], elbow: [82, 84], hand: [82, 106], elbow2: [118, 84], hand2: [118, 106] },
    B: { head: [100, 36], neck: [100, 52], sh: [86, 58], sh2: [114, 58], hip: [100, 108], knee: [92, 144], ankle: [90, 180], knee2: [108, 144], ankle2: [110, 180], elbow: [60, 62], hand: [38, 66], elbow2: [140, 62], hand2: [162, 66] },
    props: (p) => <>{db(p, "hand")}{db(p, "hand2")}</>,
  },
  crunch: {
    segs: SIDE, head: "head", scene: ground,
    A: { head: [42, 168], neck: [56, 172], hip: [104, 174], knee: [130, 146], ankle: [150, 176], toe: [162, 180], elbow: [70, 160], hand: [60, 166] },
    B: { head: [62, 140], neck: [70, 152], hip: [104, 174], knee: [130, 146], ankle: [150, 176], toe: [162, 180], elbow: [84, 146], hand: [74, 146] },
  },
  "leg-raise": {
    segs: SIDE, head: "head", scene: <line x1={60} x2={140} y1={18} y2={18} className="stroke-silver" strokeWidth={4} />,
    A: { head: [104, 46], neck: [100, 60], hip: [100, 116], knee: [100, 150], ankle: [100, 182], toe: [108, 186], elbow: [100, 40], hand: [100, 18] },
    B: { head: [100, 46], neck: [98, 60], hip: [96, 116], knee: [130, 100], ankle: [132, 136], toe: [140, 140], elbow: [100, 40], hand: [100, 18] },
  },
  plank: {
    segs: SIDE, head: "head", scene: ground, note: "Isometric hold",
    A: { head: [160, 138], neck: [148, 144], hip: [102, 158], knee: [72, 166], ankle: [40, 174], toe: [36, 182], elbow: [146, 180], hand: [162, 180] },
    B: { head: [160, 137], neck: [148, 143], hip: [102, 156], knee: [72, 165], ankle: [40, 174], toe: [36, 182], elbow: [146, 180], hand: [162, 180] },
  },
  carry: {
    segs: [...SIDE, ...LEG2], head: "head", scene: ground,
    A: { ...stand, knee: [110, 144], ankle: [116, 178], toe: [128, 180], knee2: [92, 144], ankle2: [84, 178], toe2: [96, 182] },
    B: { ...stand, knee: [92, 144], ankle: [84, 178], toe: [96, 182], knee2: [110, 144], ankle2: [116, 178], toe2: [128, 180] },
    props: (p) => plate(p, "hand", 10),
  },
  "wrist-curl": {
    segs: [["elbow", "wrist"], ["wrist", "hand"]], head: "elbow", scene: <rect x={50} y={124} width={86} height={10} rx={3} className="fill-line" />, note: "Forearm on bench, side view",
    A: { elbow: [70, 118], wrist: [128, 118], hand: [142, 134] },
    B: { elbow: [70, 118], wrist: [128, 118], hand: [140, 100] },
    props: (p) => db(p),
  },
};

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * t);

export function MoveDemo({ pattern, className, hoverOnly = false }: { pattern: Pattern; className?: string; hoverOnly?: boolean }) {
  const def = DEFS[pattern];
  const [t, setT] = useState(hoverOnly ? 0.25 : 0);
  const [playing, setPlaying] = useState(!hoverOnly);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - t * 2600;
    const tick = (now: number) => {
      setT(((now - start) / 2600) % 1);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const k = ease(t);
  const P: Pose = Object.fromEntries(Object.keys(def.A).map((j) => {
    const a = def.A[j], b = def.B[j] ?? a;
    return [j, [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]];
  }));
  const isHead = def.head === "head";

  return (
    <div className={className} onMouseEnter={hoverOnly ? () => setPlaying(true) : undefined} onMouseLeave={hoverOnly ? () => setPlaying(false) : undefined}>
      <div className="relative overflow-hidden rounded-2xl border border-line/70 bg-[radial-gradient(ellipse_at_top,rgb(var(--accent)/0.12),transparent_60%)]">
        <svg viewBox="0 0 200 200" className="h-auto w-full" role="img" aria-label={`Animated demonstration of the ${pattern.replace("-", " ")} movement pattern`}>
          <g opacity={0.12}>
            {def.segs.map(([a, b], i) => def.B[a] && def.B[b] && <line key={i} x1={def.B[a][0]} y1={def.B[a][1]} x2={def.B[b][0]} y2={def.B[b][1]} className="stroke-accent" strokeWidth={6} strokeLinecap="round" />)}
          </g>
          {def.scene}
          {def.segs.map(([a, b], i) => P[a] && P[b] && <line key={i} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} className="stroke-fg" strokeWidth={6} strokeLinecap="round" />)}
          {Object.entries(P).filter(([j]) => j !== "head").map(([j, [x, y]]) => <circle key={j} cx={x} cy={y} r={2.6} className="fill-accent" />)}
          {isHead && <circle cx={P.head[0]} cy={P.head[1]} r={10} className="fill-fg" />}
          {def.props?.(P)}
        </svg>
        {!hoverOnly && <button onClick={() => setPlaying(!playing)} className="absolute bottom-2 right-2 rounded-lg border border-line bg-bg/70 px-2 py-1 text-[11px] text-muted backdrop-blur hover:text-fg">{playing ? "Pause" : "Play"}</button>}
        {def.note && <span className="absolute left-2 top-2 rounded-md bg-bg/70 px-2 py-0.5 text-[10px] text-muted">{def.note}</span>}
      </div>
    </div>
  );
}
