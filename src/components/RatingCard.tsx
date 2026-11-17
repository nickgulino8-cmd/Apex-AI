"use client";
import clsx from "clsx";
import { Info, TrendingUp, Star } from "lucide-react";
import type { RatingT } from "@/components/face/types";

const LABEL: Record<string, string> = {
  harmony: "Harmony", angularity: "Angularity", dimorphism: "Dimorphism", features: "Features",
  proportions: "Proportions", development: "Development", symmetry: "Symmetry", definition: "Definition",
};
const BLURB: Record<string, string> = {
  harmony: "How well features fit together: thirds, symmetry, balance",
  angularity: "Definition of bone structure: jaw, chin, cheekbones",
  dimorphism: "Expression of the selected reference sex's characteristics",
  features: "Individual features: eyes, brows, nose, lips, skin, hair",
  proportions: "Shoulder-to-waist and upper/lower balance",
  development: "Overall visible muscle development",
  symmetry: "Left/right balance",
  definition: "Visible muscle separation",
};
const IMPACT = { small: "text-muted", moderate: "text-accent", large: "text-ok" };

export function RatingCard({ rating, title, error }: { rating: RatingT | null | undefined; title: string; error?: string | null }) {
  if (!rating) {
    if (!error) return null;
    return <div className="rounded-xl border border-line/60 bg-raised/30 p-3 text-xs text-muted"><Info size={13} className="mr-1.5 inline" />Rating: {error}</div>;
  }
  const { overall } = rating;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - 1) / 9) * 100))}%`;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-surface p-5 glow animate-fadeUp">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/15 blur-[60px]" />
      <div className="relative">
        <div className="label mb-3 flex items-center gap-1.5 text-accent"><Star size={12} /> {title}</div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <div className="font-mono text-5xl font-semibold tabular-nums">{overall.score.toFixed(1)}</div>
            <div className="mt-1 text-xs text-muted">Likely range {overall.low.toFixed(1)}–{overall.high.toFixed(1)} · scale 1–10, 5.5 = average</div>
          </div>
          <div className="min-w-[180px] flex-1">
            <div className="relative h-2 rounded-full bg-line/60">
              <div className="absolute inset-y-0 rounded-full bg-accent/35" style={{ left: pct(overall.low), right: `calc(100% - ${pct(overall.high)})` }} />
              <div className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-accent" style={{ left: pct(overall.score) }} />
              <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-silver/60" style={{ left: pct(5.5) }} title="Average" />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-dim"><span>1</span><span>5.5</span><span>10</span></div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {rating.pillars.map((p) => {
            const lead = p.pillar === rating.leans_toward;
            return (
              <div key={p.pillar} className={clsx("rounded-xl border p-3", lead ? "border-accent/60 bg-accent/10" : "border-line/60 bg-raised/30")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{LABEL[p.pillar] ?? p.pillar}{lead && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Leans here</span>}</span>
                  <span className="font-mono text-sm tabular-nums">{p.score ? p.score.toFixed(1) : "–"}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-line/60"><div className="h-full rounded-full bg-accent" style={{ width: pct(p.score || 1) }} /></div>
                <div className="mt-1.5 text-[11px] text-dim">{BLURB[p.pillar]}</div>
                <p className="mt-1.5 text-[13px] leading-snug text-muted">{p.evidence}</p>
                {p.note && <p className="mt-1 text-[12px] italic text-dim">{p.note}</p>}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm"><span className="text-accent">Leans toward {LABEL[rating.leans_toward] ?? rating.leans_toward}.</span> <span className="text-fg/90">{rating.leans_summary}</span></p>

        {rating.strengths.length > 0 && (
          <div className="mt-4">
            <div className="label mb-1.5">Strengths</div>
            <div className="flex flex-wrap gap-1.5">{rating.strengths.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </div>
        )}
        {rating.modifiable.length > 0 && (
          <div className="mt-4">
            <div className="label mb-1.5 flex items-center gap-1.5"><TrendingUp size={12} /> What you can change</div>
            <ul className="space-y-1.5">
              {rating.modifiable.map((m) => (
                <li key={m.area + m.suggestion} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                  <span><span className="font-medium">{m.area}:</span> <span className="text-fg/85">{m.suggestion}</span></span>
                  <span className={clsx("text-[11px] uppercase tracking-wide", IMPACT[m.impact])}>{m.impact}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-dim">
          {rating.caveats.join(" ")} Ratings are a subjective AI estimate from one photo, so lighting, lens, angle and expression shift them. They aren&apos;t a measure of your worth. Turn them off anytime in Profile.
        </p>
      </div>
    </div>
  );
}
