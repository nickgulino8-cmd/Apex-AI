"use client";
import { IDX, midline, zoneShapes, type Pt } from "@/lib/face-metrics";

export type Layers = { mesh: boolean; proportions: boolean; zones: boolean };
export type ZoneMark = { zone: string; tone: "accent" | "warn" | "ok"; label: string };

/**
 * Visual annotations drawn as SVG over the photo. Landmark coordinates live only in memory
 * for drawing; they're never uploaded or stored.
 */
export function FaceOverlay({ src, w, h, P, layers, marks, focus }: { src: string; w: number; h: number; P: Pt[] | null; layers: Layers; marks: ZoneMark[]; focus: string | null }) {
  const shapes = P ? zoneShapes(P) : null;
  const line = P ? midline(P) : null;
  const sw = Math.max(1, w / 500);
  const thirds = P ? [P[IDX.top], P[IDX.glabella], P[IDX.subnasale], P[IDX.chin]] : [];
  const xL = P ? P[IDX.cheekL].x - w * 0.04 : 0;
  const xR = P ? P[IDX.cheekR].x + w * 0.04 : 0;
  const color = { accent: "rgb(var(--accent))", warn: "rgb(var(--warn))", ok: "rgb(var(--ok))" };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Your photo" className="block h-auto w-full" />
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" aria-hidden>
        {P && layers.mesh && P.slice(0, 468).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={sw * 0.9} fill="rgb(var(--silver))" opacity={0.45} />)}
        {P && layers.proportions && line && (
          <g stroke="rgb(var(--accent))" strokeWidth={sw * 1.4} fill="none">
            <line x1={line.a * P[IDX.top].y + line.b} y1={P[IDX.top].y - h * 0.04} x2={line.a * P[IDX.chin].y + line.b} y2={P[IDX.chin].y + h * 0.03} strokeDasharray={`${sw * 6} ${sw * 4}`} opacity={0.8} />
            {thirds.map((p, i) => (
              <g key={i}>
                <line x1={xL} x2={xR} y1={p.y} y2={p.y} opacity={0.75} />
                {i < 3 && <text x={xR + sw * 6} y={(p.y + thirds[i + 1].y) / 2} fill="rgb(var(--accent))" stroke="none" fontSize={sw * 13} fontFamily="var(--font-mono)">{["U", "M", "L"][i]}</text>}
              </g>
            ))}
            <line x1={P[IDX.cheekL].x} y1={P[IDX.cheekL].y} x2={P[IDX.cheekR].x} y2={P[IDX.cheekR].y} stroke="rgb(var(--silver))" opacity={0.8} />
            <line x1={P[IDX.jawL].x} y1={P[IDX.jawL].y} x2={P[IDX.jawR].x} y2={P[IDX.jawR].y} stroke="rgb(var(--silver))" opacity={0.8} />
            {[IDX.cheekL, IDX.cheekR, IDX.jawL, IDX.jawR].map((i) => <circle key={i} cx={P[i].x} cy={P[i].y} r={sw * 3} fill="rgb(var(--silver))" stroke="none" />)}
          </g>
        )}
        {shapes && layers.zones &&
          marks.map((m) => {
            const s = shapes[m.zone];
            if (!s) return null;
            const on = !focus || focus === m.zone;
            return (
              <g key={m.zone + m.label} opacity={on ? 1 : 0.25} style={{ transition: "opacity .2s" }}>
                <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} transform={`rotate(${s.rot} ${s.cx} ${s.cy})`} fill={color[m.tone]} fillOpacity={0.14} stroke={color[m.tone]} strokeWidth={sw * 1.6} />
              </g>
            );
          })}
      </svg>
    </div>
  );
}
