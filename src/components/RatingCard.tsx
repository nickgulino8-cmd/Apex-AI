"use client";
import { useState } from "react";
import clsx from "clsx";
import { Info, Star, ChevronDown } from "lucide-react";
import type { RatingT, ImproveT } from "@/components/face/types";

const LABEL: Record<string, string> = {
  harmony: "Harmony", angularity: "Angularity", dimorphism: "Dimorphism", features: "Features",
  proportions: "Proportions", development: "Development", symmetry: "Symmetry", definition: "Definition",
};
const IMPACT: Record<ImproveT["impact"], string> = { small: "text-muted", moderate: "text-accent", large: "text-ok" };
const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - 1) / 9) * 100))}%`;

export function RatingCard({ rating, title, error }: { rating: RatingT | null | undefined; title: string; error?: string | null }) {
  // Weakest pillar opens by default: that's where improvement pays off most.
  const weakest = rating?.pillars.filter((p) => p.score > 0).reduce((a, b) => (b.score < a.score ? b : a), rating.pillars[0])?.pillar;
  const [open, setOpen] = useState<string | null>(weakest ?? null);
  if (!rating) {
    if (!error) return null;
    return <div className="rounded-xl border border-line/60 bg-raised/30 p-3 text-xs text-muted"><Info size={13} className="mr-1.5 inline" />Rating: {error}</div>;
  }
  const { overall } = rating;
  const legacy = !rating.pillars.some((p) => p.improve?.length) && rating.modifiable?.length ? rating.modifiable : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-surface p-5 glow animate-fadeUp">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/15 blur-[60px]" />
      <div className="relative">
        <div className="label mb-3 flex items-center gap-1.5 text-accent"><Star size={12} /> {title}</div>
        <div className="flex items-end gap-5">
          <div className="font-mono text-5xl font-semibold tabular-nums">{overall.score.toFixed(1)}</div>
          <div className="min-w-0 flex-1 pb-1.5">
            <div className="relative h-2 rounded-full bg-line/60">
              <div className="absolute inset-y-0 rounded-full bg-accent/35" style={{ left: pct(overall.low), right: `calc(100% - ${pct(overall.high)})` }} />
              <div className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-accent" style={{ left: pct(overall.score) }} />
              <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-silver/60" style={{ left: pct(5.5) }} />
            </div>
            <div className="mt-1 text-[11px] text-dim">Range {overall.low.toFixed(1)}–{overall.high.toFixed(1)} · 5.5 is average</div>
          </div>
        </div>
        <p className="mt-3 text-sm"><span className="text-accent">Leans toward {LABEL[rating.leans_toward] ?? rating.leans_toward}.</span> <span className="text-fg/85">{rating.leans_summary}</span></p>

        <div className="mt-4 space-y-2">
          {rating.pillars.map((p) => {
            const isOpen = open === p.pillar;
            const lead = p.pillar === rating.leans_toward;
            return (
              <div key={p.pillar} className={clsx("rounded-xl border", lead ? "border-accent/50 bg-accent/[0.06]" : "border-line/60 bg-raised/30")}>
                <button onClick={() => setOpen(isOpen ? null : p.pillar)} className="w-full p-3 text-left" aria-expanded={isOpen}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{LABEL[p.pillar] ?? p.pillar}{lead && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Strongest</span>}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums">{p.score ? p.score.toFixed(1) : "–"}</span>
                      <ChevronDown size={14} className={clsx("text-dim transition", isOpen && "rotate-180")} />
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-line/60"><div className="h-full rounded-full bg-accent" style={{ width: pct(p.score || 1) }} /></div>
                </button>
                {isOpen && (
                  <div className="space-y-2.5 border-t border-line/50 px-3 pb-3 pt-2.5 animate-fadeUp">
                    <p className="text-[12px] text-muted">{p.evidence}{p.note ? ` ${p.note}` : ""}</p>
                    {p.improve?.length ? (
                      <div>
                        <div className="label mb-1.5">How to improve</div>
                        <ol className="space-y-2">
                          {p.improve.map((m, i) => (
                            <li key={i} className="flex gap-2.5 text-sm">
                              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-accent/50 font-mono text-[10px] text-accent">{i + 1}</span>
                              <span className="min-w-0 flex-1">
                                <span className="font-medium">{m.action}</span>
                                <span className={clsx("ml-1.5 text-[10px] uppercase tracking-wide", IMPACT[m.impact])}>{m.impact}</span>
                                <span className="block text-[13px] text-fg/80">{m.detail}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {legacy && (
          <ul className="mt-3 space-y-1 text-sm">{legacy.map((m) => <li key={m.area + m.suggestion}><span className="font-medium">{m.area}:</span> <span className="text-fg/80">{m.suggestion}</span></li>)}</ul>
        )}
        {rating.strengths.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{rating.strengths.slice(0, 3).map((s) => <span key={s} className="chip">{s}</span>)}</div>}
        <p className="mt-3 text-[11px] text-dim">AI estimate from {rating.caveats.some((c) => /Averaged across/.test(c)) ? "several photos" : "one photo"}. Lighting and angle shift it. Not a measure of your worth.</p>
      </div>
    </div>
  );
}
