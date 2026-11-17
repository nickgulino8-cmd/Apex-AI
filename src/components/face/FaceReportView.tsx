"use client";
import Link from "next/link";
import { Stethoscope, Sparkles, Info, ShieldAlert, Leaf } from "lucide-react";
import { Badge } from "@/components/ui";
import type { FaceReportT } from "./types";

export type CompoundLite = Record<string, { name: string; access: string; rx: boolean }>;

const EXTENT_TONE = { none_visible: "ok", minimal: "ok", mild: "neutral", moderate: "warn", pronounced: "warn" } as const;
const CAT_LABEL: Record<string, string> = {
  texture: "Texture", acne_blemishes: "Blemishes", redness: "Redness", pigmentation: "Pigmentation", under_eye: "Under-eye", oil_dryness: "Oil & hydration", general: "Overall skin",
};
const FEATURE_LABEL: Record<string, string> = {
  facial_thirds: "Facial thirds", symmetry: "Symmetry", jawline_chin: "Jawline & chin", cheekbones: "Cheekbones", contours: "Contours", proportions: "Proportions",
};
export const ZONE_LABEL: Record<string, string> = {
  forehead: "forehead", glabella: "between brows", nose: "nose", image_left_cheek: "cheek (L)", image_right_cheek: "cheek (R)", image_left_under_eye: "under-eye (L)",
  image_right_under_eye: "under-eye (R)", perioral: "around mouth", chin: "chin", image_left_jaw: "jaw (L)", image_right_jaw: "jaw (R)",
};

export function FaceReportView({ report, compounds, onFocus }: { report: FaceReportT; compounds: CompoundLite; onFocus: (zone: string | null) => void }) {
  return (
    <div className="space-y-6">
      <p className="text-[15px] leading-relaxed text-fg/90">{report.summary}</p>
      {report.image_quality.issues.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-line/60 bg-raised/30 p-3 text-xs text-muted"><Info size={14} className="mt-0.5 shrink-0" />{report.image_quality.issues.join(" ")}</div>
      )}

      <div>
        <div className="label mb-3">Skin observations</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {report.skin.map((s, i) => (
            <div key={i} className="rounded-xl border border-line/60 bg-raised/30 p-3.5" onMouseEnter={() => onFocus(s.zones[0] ?? null)} onMouseLeave={() => onFocus(null)}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{CAT_LABEL[s.category]}</span>
                <Badge tone={EXTENT_TONE[s.extent]}>{s.extent.replace("_", " ")}</Badge>
              </div>
              <p className="text-[13px] leading-relaxed text-muted">{s.observation}</p>
              {s.zones.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.zones.map((z) => <button key={z} onMouseEnter={() => onFocus(z)} onFocus={() => onFocus(z)} className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent">{ZONE_LABEL[z]}</button>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="label mb-3">Structure — neutral observations</div>
        <div className="divide-y divide-line/60 rounded-xl border border-line/60">
          {report.structure.map((s, i) => (
            <div key={i} className="grid gap-1 p-3.5 sm:grid-cols-[140px_1fr]">
              <span className="text-sm font-medium">{FEATURE_LABEL[s.feature]}</span>
              <span className="text-[13px] leading-relaxed text-muted">{s.observation}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="label mb-3 flex items-center gap-2"><Sparkles size={13} /> Evidence-based options to consider (OTC)</div>
        <div className="space-y-2">
          {report.recommendations.map((r, i) => (
            <div key={i} className="rounded-xl border border-line/60 bg-raised/30 p-3.5">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-medium">{r.concern}</span>
                <Badge tone={r.priority === "foundation" ? "accent" : "neutral"}>{r.priority}</Badge>
              </div>
              <p className="text-[13px] text-muted">{r.rationale}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.compound_ids.map((c) => compounds[c] && (
                  <Link key={c} href={`/skincare/${c}`} className="chip hover:border-accent/50 hover:text-fg">{compounds[c].name}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Link href="/skincare/routine" className="mt-3 inline-flex text-sm text-accent">Build a full AM/PM routine →</Link>
      </div>

      {report.habits.length > 0 && (
        <div>
          <div className="label mb-3 flex items-center gap-2"><Leaf size={13} /> Habits that support skin health</div>
          <ul className="space-y-1.5 text-sm text-fg/90">{report.habits.map((h, i) => <li key={i} className="flex gap-2"><span className="text-accent">—</span>{h}</li>)}</ul>
        </div>
      )}

      {(report.dermatologist_topics.length > 0 || report.professional.length > 0) && (
        <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Stethoscope size={16} className="text-warn" /> When to see a dermatologist</div>
          {report.professional.map((p, i) => (
            <p key={i} className="mb-1.5 flex gap-2 text-[13px] text-fg/90">
              {p.urgency === "prompt" && <ShieldAlert size={14} className="mt-0.5 shrink-0 text-bad" />}
              {p.reason}
            </p>
          ))}
          {report.dermatologist_topics.length > 0 && (
            <>
              <p className="mt-3 text-xs text-muted">Prescription treatments you could ask a dermatologist about (education only; they&apos;ll decide what fits you):</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {report.dermatologist_topics.map((c) => compounds[c] && <Link key={c} href={`/skincare/${c}`} className="chip hover:text-fg">{compounds[c].name}</Link>)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
