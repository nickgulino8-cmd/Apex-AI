"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Trash2, GitCompareArrows, ImageOff, ChevronDown } from "lucide-react";
import { api } from "@/lib/client";
import { Badge, Empty } from "@/components/ui";
import { describe, type Metrics } from "@/lib/face-metrics";
import { FaceReportView, type CompoundLite } from "./FaceReportView";
import type { FaceReportT, Extent } from "./types";

export type FaceAnalysis = { id: string; created_at: string; photo_id: string | null; metrics: Metrics | null; report: FaceReportT };

const EXTENT_RANK: Record<Extent, number> = { none_visible: 0, minimal: 1, mild: 2, moderate: 3, pronounced: 4 };
const CATS = ["acne_blemishes", "redness", "pigmentation", "texture", "under_eye", "oil_dryness"] as const;
const CAT_LABEL: Record<string, string> = { acne_blemishes: "Blemishes", redness: "Redness", pigmentation: "Pigmentation", texture: "Texture", under_eye: "Under-eye", oil_dryness: "Oil & hydration" };
const fmt = (s: string) => new Date(s.replace(" ", "T") + "Z").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function FaceHistory({ items, compounds }: { items: FaceAnalysis[]; compounds: CompoundLite }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  async function del(id: string) {
    if (!confirm("Delete this analysis and its saved photo? This can't be undone.")) return;
    await api(`/api/analyses/face/${id}`, { method: "DELETE" });
    setSel((s) => s.filter((x) => x !== id));
    router.refresh();
  }
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]));

  if (!items.length) return <Empty title="No analyses yet" body="Your analyses appear here so you can compare skin observations over time." />;
  const [a, b] = sel.map((id) => items.find((x) => x.id === id)!).sort((x, y) => x.created_at.localeCompare(y.created_at));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Select two analyses to compare. You can compare ratings, skin features and measurements.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((x) => (
          <div key={x.id} className={clsx("rounded-2xl border bg-surface p-3 transition", sel.includes(x.id) ? "border-accent" : "border-line/70")}>
            <button onClick={() => toggle(x.id)} className="block w-full text-left">
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-raised">
                {x.photo_id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/photos/${x.photo_id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-dim"><span className="flex items-center gap-1.5"><ImageOff size={14} /> Photo not saved</span></div>
                )}
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-sm font-medium">{fmt(x.created_at)}</span>
                <span className="flex items-center gap-1.5">
                  {x.report.ratings && <span className="font-mono text-sm text-accent">{x.report.ratings.overall.score.toFixed(1)}</span>}
                  {sel.includes(x.id) && <Badge tone="accent">Selected</Badge>}
                </span>
              </div>
            </button>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setOpen(open === x.id ? null : x.id)} className="btn-ghost flex-1 py-1.5 text-xs">Report <ChevronDown size={14} className={clsx("transition", open === x.id && "rotate-180")} /></button>
              <button onClick={() => del(x.id)} className="btn-ghost py-1.5 text-xs text-muted hover:text-bad" aria-label="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="card card-pad">
          <FaceReportView report={items.find((x) => x.id === open)!.report} compounds={compounds} onFocus={() => {}} />
        </div>
      )}

      {a && b && (
        <div className="card card-pad animate-fadeUp">
          <div className="mb-4 flex items-center gap-2 font-medium"><GitCompareArrows size={18} className="text-accent" /> {fmt(a.created_at)} → {fmt(b.created_at)}</div>
          {a.photo_id && b.photo_id && (
            <div className="mb-6 grid grid-cols-2 gap-3">
              {[a, b].map((x) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={x.id} src={`/api/photos/${x.photo_id}`} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
              ))}
            </div>
          )}
          {a.report.ratings && b.report.ratings && (
            <>
              <div className="label mb-2">Rating</div>
              <div className="mb-6 divide-y divide-line/60 rounded-xl border border-line/60 text-sm">
                {[{ pillar: "overall", score: a.report.ratings.overall.score }, ...a.report.ratings.pillars].map((p) => {
                  const bv = p.pillar === "overall" ? b.report.ratings!.overall.score : b.report.ratings!.pillars.find((x) => x.pillar === p.pillar)?.score ?? 0;
                  const d = bv - p.score;
                  return (
                    <div key={p.pillar} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 p-3">
                      <span className="capitalize">{p.pillar}</span>
                      <span className="font-mono tabular-nums text-muted">{p.score.toFixed(1)} → {bv.toFixed(1)}</span>
                      <Badge tone={Math.abs(d) < 0.3 ? "neutral" : d > 0 ? "ok" : "warn"}>{Math.abs(d) < 0.3 ? "Within noise" : `${d > 0 ? "+" : ""}${d.toFixed(1)}`}</Badge>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div className="label mb-2">Visible skin features</div>
          <div className="mb-6 divide-y divide-line/60 rounded-xl border border-line/60">
            {CATS.map((c) => {
              const ea = a.report.skin.find((s) => s.category === c)?.extent;
              const eb = b.report.skin.find((s) => s.category === c)?.extent;
              if (!ea && !eb) return null;
              const d = ea && eb ? EXTENT_RANK[eb] - EXTENT_RANK[ea] : 0;
              return (
                <div key={c} className="grid grid-cols-[1fr_auto] items-center gap-3 p-3 text-sm sm:grid-cols-[160px_1fr_auto]">
                  <span>{CAT_LABEL[c]}</span>
                  <span className="hidden text-muted sm:block">{(ea ?? "—").replace("_", " ")} → {(eb ?? "—").replace("_", " ")}</span>
                  <Badge tone={d < 0 ? "ok" : d > 0 ? "warn" : "neutral"}>{d < 0 ? "Less visible" : d > 0 ? "More visible" : "Similar"}</Badge>
                </div>
              );
            })}
          </div>
          {a.metrics && b.metrics && (
            <>
              <div className="label mb-2">Measurements</div>
              <div className="divide-y divide-line/60 rounded-xl border border-line/60 text-sm">
                {describe(a.metrics).map((m, i) => (
                  <div key={m.label} className="grid grid-cols-[1fr_auto] gap-3 p-3 sm:grid-cols-[200px_1fr]">
                    <span className="text-muted">{m.label}</span>
                    <span className="text-right font-mono tabular-nums sm:text-left">{m.value} → {describe(b.metrics!)[i].value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-dim">Facial structure doesn&apos;t change meaningfully week to week. Measurement differences mostly reflect camera angle, distance and expression.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
