"use client";
import clsx from "clsx";
import type { MuscleGroup } from "@/lib/data/exercises";

/**
 * Stylised, clickable muscle map (front + back). Each region carries a muscle group;
 * `fill` maps a group to a 0–1 intensity (or a colour token) for heatmaps.
 */
type Shape = { g: MuscleGroup; d?: string; e?: [number, number, number, number, number?] };

const mirror = (shapes: Shape[]): Shape[] =>
  shapes.flatMap((s) => [s, s.e ? { g: s.g, e: [200 - s.e[0], s.e[1], s.e[2], s.e[3], s.e[4] ? -s.e[4] : undefined] as Shape["e"] } : { g: s.g, d: mirrorPath(s.d!) }]);

function mirrorPath(d: string) {
  // Mirror absolute x coordinates around x=100 for simple M/L/Q/Z paths.
  return d.replace(/([MLQ])\s*([\d.\s,]+)/g, (_, cmd: string, nums: string) => {
    const n = nums.trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < n.length; i += 2) n[i] = 200 - n[i];
    return `${cmd}${n.join(" ")} `;
  });
}

const FRONT: Shape[] = [
  ...mirror([
    { g: "shoulders", e: [63, 78, 13, 12] },
    { g: "chest", d: "M99 72 L78 72 Q66 82 70 99 Q84 110 99 104 Z" },
    { g: "biceps", e: [57, 110, 8, 18, -6] },
    { g: "forearms", e: [49, 152, 7, 20, 10] },
    { g: "quadriceps", e: [86, 222, 14, 38, 3] },
    { g: "calves", e: [86, 302, 8, 24, 2] },
  ]),
  { g: "abdominals", d: "M86 108 Q100 104 114 108 L113 168 Q100 176 87 168 Z" },
];

const BACK: Shape[] = [
  { g: "back", d: "M100 60 L82 68 L70 90 L78 132 L100 152 L122 132 L130 90 L118 68 Z" },
  ...mirror([
    { g: "shoulders", e: [63, 78, 13, 12] },
    { g: "triceps", e: [57, 110, 8, 18, -6] },
    { g: "forearms", e: [49, 152, 7, 20, 10] },
    { g: "glutes", e: [88, 178, 13, 14] },
    { g: "hamstrings", e: [87, 228, 13, 32, 3] },
    { g: "calves", e: [86, 298, 10, 24, 2] },
  ]),
];

function Silhouette() {
  return (
    <g fill="rgb(var(--raised))" stroke="rgb(var(--line))" strokeWidth={1}>
      <circle cx={100} cy={32} r={17} />
      <rect x={92} y={46} width={16} height={16} rx={4} />
      <path d="M72 64 Q100 56 128 64 L140 70 Q148 78 146 96 L132 102 L128 170 Q126 188 120 196 L80 196 Q74 188 72 170 L68 102 L54 96 Q52 78 60 70 Z" />
      {[0, 1].map((m) => (
        <g key={m} transform={m ? "translate(200 0) scale(-1 1)" : undefined}>
          <path d="M54 90 Q44 94 46 124 L40 174 L50 178 L62 128 L66 100 Z" />
          <path d="M80 194 L74 260 L76 330 L94 330 L96 262 L100 200 Z" />
        </g>
      ))}
    </g>
  );
}

function Region({ s, value, selected, onSelect, label }: { s: Shape; value: number | undefined; selected: boolean; onSelect?: (g: MuscleGroup) => void; label: string }) {
  const op = value === undefined ? 0.18 : 0.15 + value * 0.75;
  const common = {
    fill: "rgb(var(--accent))",
    fillOpacity: selected ? 0.95 : op,
    stroke: selected ? "rgb(var(--fg))" : "rgb(var(--accent))",
    strokeOpacity: selected ? 0.9 : 0.5,
    strokeWidth: selected ? 1.5 : 0.8,
    className: clsx("transition-all duration-200", onSelect && "cursor-pointer hover:fill-opacity-80"),
    onClick: onSelect ? () => onSelect(s.g) : undefined,
    role: onSelect ? "button" : undefined,
    "aria-label": label,
  } as const;
  if (s.e) {
    const [cx, cy, rx, ry, rot] = s.e;
    return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} {...common}><title>{label}</title></ellipse>;
  }
  return <path d={s.d} {...common}><title>{label}</title></path>;
}

export function Anatomy({
  values, selected, onSelect, labels, className,
}: {
  values?: Partial<Record<MuscleGroup, number>>;
  selected?: MuscleGroup | null;
  onSelect?: (g: MuscleGroup) => void;
  labels: Record<MuscleGroup, string>;
  className?: string;
}) {
  return (
    <div className={clsx("grid grid-cols-2 gap-2", className)}>
      {([["Front", FRONT], ["Back", BACK]] as const).map(([name, shapes]) => (
        <figure key={name} className="text-center">
          <svg viewBox="30 10 140 330" className="mx-auto h-auto w-full max-w-[220px] drop-shadow-[0_0_24px_rgb(var(--accent)/0.15)]">
            <Silhouette />
            {shapes.map((s, i) => (
              <Region key={i} s={s} value={values?.[s.g]} selected={selected === s.g} onSelect={onSelect} label={labels[s.g]} />
            ))}
          </svg>
          <figcaption className="label mt-1">{name}</figcaption>
        </figure>
      ))}
    </div>
  );
}
