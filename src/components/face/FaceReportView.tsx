"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Stethoscope, ShieldAlert, Sun, Moon, CalendarDays, Check, ChevronDown } from "lucide-react";
import { Badge, Spinner } from "@/components/ui";
import { RatingCard } from "@/components/RatingCard";
import { api } from "@/lib/client";
import { currentUser } from "@/lib/auth";
import { buildRoutine, type SkinType } from "@/lib/engine/routine";
import type { Concern } from "@/lib/data/compounds";
import type { FaceReportT } from "./types";

export type CompoundLite = Record<string, { name: string; access: string; rx: boolean }>;

const EXTENT_DOT = { none_visible: "bg-ok", minimal: "bg-ok", mild: "bg-accent", moderate: "bg-warn", pronounced: "bg-bad" } as const;
const CAT_LABEL: Record<string, string> = {
  texture: "Texture", acne_blemishes: "Blemishes", redness: "Redness", pigmentation: "Pigmentation", under_eye: "Under-eye", oil_dryness: "Oil / hydration", general: "Overall",
};
const TYPE_LABEL: Record<string, string> = { oily: "oily", dry: "dry", combination: "combination", normal: "normal", sensitive: "sensitive", unknown: "your" };

export function FaceReportView({ report, compounds, onFocus }: { report: FaceReportT; compounds: CompoundLite; onFocus: (zone: string | null) => void }) {
  const skin = report.skin.filter((s) => s.extent !== "none_visible" || s.category === "general");
  const rx = report.prescription_options ?? [];
  return (
    <div className="space-y-5">
      <RatingCard rating={report.ratings} error={report.rating_error} title="Facial rating" />

      <section>
        <div className="label mb-2">Skin</div>
        <p className="mb-3 text-[15px] leading-relaxed text-fg/90">{report.summary}</p>
        <div className="divide-y divide-line/50 rounded-xl border border-line/60 bg-raised/20">
          {skin.map((s, i) => (
            <button key={i} type="button" onClick={() => onFocus(s.zones[0] ?? null)} onMouseEnter={() => onFocus(s.zones[0] ?? null)} onMouseLeave={() => onFocus(null)}
              className="flex w-full items-start gap-3 p-3 text-left">
              <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", EXTENT_DOT[s.extent])} />
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium">{CAT_LABEL[s.category]}</span>
                <span className="ml-2 text-[11px] text-dim">{s.extent.replace("_", " ")}</span>
                <span className="block text-[13px] text-muted">{s.observation}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <RoutineFromReport report={report} />

      {report.professional.length > 0 && (
        <div className="rounded-xl border border-warn/30 bg-warn/5 p-3.5">
          {report.professional.map((p, i) => (
            <p key={i} className="flex gap-2 text-[13px] text-fg/90">
              {p.urgency === "prompt" ? <ShieldAlert size={14} className="mt-0.5 shrink-0 text-bad" /> : <Stethoscope size={14} className="mt-0.5 shrink-0 text-warn" />}
              {p.reason}
            </p>
          ))}
        </div>
      )}

      {rx.length > 0 && (
        <details className="group rounded-xl border border-line/60 bg-raised/20">
          <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-sm">
            <span className="flex items-center gap-2"><Stethoscope size={15} className="text-accent" /> Prescription options <span className="text-dim">({rx.length})</span></span>
            <ChevronDown size={15} className="text-dim transition group-open:rotate-180" />
          </summary>
          <div className="space-y-2 px-3 pb-3">
            <p className="text-[11px] text-dim">Need a prescription. Bring these to a dermatologist, who decides what fits you.</p>
            {rx.map((o) => (
              <div key={o.compound_id + o.for_concern} className="rounded-lg border border-line/50 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/skincare/${o.compound_id}`} className="text-sm font-medium hover:text-accent">{compounds[o.compound_id]?.name ?? o.compound_id}</Link>
                  <Badge>{o.for_concern}</Badge>
                </div>
                <p className="mt-1 text-[13px] text-fg/85">{o.why}</p>
                <p className="mt-0.5 text-[12px] text-muted">{o.expect}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** Builds an AM/PM routine from what the analysis detected, with one-tap save. */
function RoutineFromReport({ report }: { report: FaceReportT }) {
  const user = currentUser();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const detected = report.detected_skin_type && report.detected_skin_type !== "unknown" ? report.detected_skin_type : null;
  const skinType = (detected ?? user.profile.skin_type) as SkinType;
  const concerns = (report.detected_concerns?.length ? report.detected_concerns : user.profile.skin_concerns) as Concern[];
  if (!detected && !report.detected_concerns) return null; // older report without detection
  const sensitive = user.profile.skin_sensitive || skinType === "sensitive";
  const r = buildRoutine({ skinType, concerns, sensitive, pregnancy: user.profile.pregnancy_flag, age: user.age });
  const row = (label: string, icon: React.ReactNode, steps: { step: string; product: string; frequency?: string }[]) => (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">{icon} {label}</div>
      <ol className="space-y-1">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="w-4 shrink-0 font-mono text-[11px] text-dim">{i + 1}</span>
            <span>{s.product}{s.frequency && <span className="text-[11px] text-warn"> · {s.frequency}</span>}</span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <section className="rounded-2xl border border-line/70 bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="label">Your routine</div>
          <div className="mt-0.5 text-sm text-fg/90">
            For {TYPE_LABEL[skinType]} skin{concerns.length ? ` · ${concerns.map((c) => c.replace("-", " ")).join(", ")}` : ""}
            {detected && detected !== user.profile.skin_type && <span className="text-[11px] text-dim"> (detected; you&apos;d set {user.profile.skin_type})</span>}
          </div>
        </div>
        <button
          disabled={busy || saved}
          onClick={async () => {
            setBusy(true);
            await api("/api/skincare/routine", { body: { skinType, concerns, sensitive, pregnancy: user.profile.pregnancy_flag, save: true } }).catch(() => {});
            setBusy(false);
            setSaved(true);
          }}
          className={clsx("btn shrink-0 py-1.5 text-xs", saved ? "border border-ok/40 bg-ok/10 text-ok" : "btn-primary")}
        >
          {busy ? <Spinner /> : saved ? <Check size={14} /> : null} {saved ? "Saved" : "Use this routine"}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {row("Morning", <Sun size={13} />, r.am)}
        {row("Evening", <Moon size={13} />, r.pm)}
      </div>
      {r.weekly.length > 0 && <div className="mt-3">{row("Weekly", <CalendarDays size={13} />, r.weekly)}</div>}
      {r.warnings[0] && <p className="mt-3 text-[12px] text-warn">{r.warnings[0]}</p>}
      <Link href="/skincare/routine" className="mt-2 inline-block text-xs text-accent">Details & how to use each step →</Link>
    </section>
  );
}
