"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
import clsx from "clsx";
import { Badge, Empty } from "@/components/ui";

export type CompoundCard = { id: string; name: string; aka: string[]; category: string; access: string; accessLabel: string; what: string; evidenceLevel: string; highRisk: boolean; concerns: string[] };

const EV_TONE = { strong: "ok", moderate: "accent", limited: "neutral", mixed: "warn" } as const;

export function Database({ items, categories }: { items: CompoundCard[]; categories: string[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [access, setAccess] = useState<"all" | "otc" | "rx">("all");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((c) => {
      if (cat && c.category !== cat) return false;
      if (access === "otc" && !(c.access === "otc" || c.access === "otc-and-rx")) return false;
      if (access === "rx" && c.access === "otc") return false;
      return !s || [c.name, ...c.aka, c.what, c.category, ...c.concerns].join(" ").toLowerCase().includes(s);
    });
  }, [items, q, cat, access]);

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-5 space-y-3 bg-bg/90 px-4 py-3 backdrop-blur lg:top-0 lg:mx-0 lg:px-0">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ingredients, drugs, concerns… e.g. niacinamide, acne, aromatase" className="input pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {(["all", "otc", "rx"] as const).map((a) => (
            <button key={a} onClick={() => setAccess(a)} className={clsx("chip whitespace-nowrap", access === a && "chip-on")}>{a === "all" ? "All access" : a === "otc" ? "Available OTC" : "Prescription / controlled"}</button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-line" />
          <button onClick={() => setCat(null)} className={clsx("chip whitespace-nowrap", !cat && "chip-on")}>All categories</button>
          {categories.map((c) => <button key={c} onClick={() => setCat(cat === c ? null : c)} className={clsx("chip whitespace-nowrap", cat === c && "chip-on")}>{c}</button>)}
        </div>
      </div>
      <div className="mb-3 text-xs text-dim">{list.length} entries</div>
      {list.length === 0 ? (
        <Empty title="No matches" body="Try a different term or clear the filters." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Link key={c.id} href={`/skincare/${c.id}`} className="group flex flex-col rounded-2xl border border-line/70 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/40">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="font-medium leading-snug group-hover:text-accent">{c.name}</div>
                {c.highRisk && <ShieldAlert size={16} className="shrink-0 text-warn" aria-label="High-risk medication" />}
              </div>
              <p className="line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted">{c.what}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={c.access === "otc" ? "ok" : c.access === "otc-and-rx" ? "accent" : "warn"}>{c.accessLabel}</Badge>
                <Badge tone={EV_TONE[c.evidenceLevel as keyof typeof EV_TONE]}>Evidence: {c.evidenceLevel}</Badge>
              </div>
              <div className="mt-2 text-[11px] text-dim">{c.category}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
