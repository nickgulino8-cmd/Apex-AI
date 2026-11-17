import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { COMPOUNDS, ACCESS_LABEL } from "@/lib/data/compounds";
import { PageHeader } from "@/components/ui";
import { Database } from "@/components/skincare/Database";
import { Tabs } from "@/components/Tabs";

export const metadata = { title: "Skincare" };

export default function SkincarePage() {
  const items = COMPOUNDS.map((c) => ({
    id: c.id, name: c.name, aka: c.aka ?? [], category: c.category, access: c.access, accessLabel: ACCESS_LABEL[c.access], what: c.what,
    evidenceLevel: c.evidenceLevel, highRisk: !!c.highRisk, concerns: c.concerns,
  }));
  const categories = [...new Set(COMPOUNDS.map((c) => c.category))];
  return (
    <div>
      <PageHeader eyebrow="Skincare" title="Ingredient & treatment education" sub={`${COMPOUNDS.length} entries covering skincare actives, dermatology treatments and medications with skin or hormonal effects, each with mechanism, evidence, side effects and references.`}
        action={<Link href="/skincare/routine" className="btn-primary">Routine builder <ArrowRight size={16} /></Link>} />
      <Tabs active="db" tabs={[{ key: "db", label: "Database", href: "/skincare" }, { key: "routine", label: "Routine builder", href: "/skincare/routine" }]} />
      <div className="mb-5 flex gap-3 rounded-xl border border-line/60 bg-surface p-4 text-[13px] text-muted">
        <Info size={16} className="mt-0.5 shrink-0 text-accent" />
        <p>This is an <strong className="text-fg">educational database, not a prescribing tool</strong>. It never gives doses, cycles or stacking advice. Prescription medicines, hormones and cancer drugs should only be used under a qualified clinician&apos;s care, never for cosmetic experimentation.</p>
      </div>
      <Database items={items} categories={categories} />
    </div>
  );
}
