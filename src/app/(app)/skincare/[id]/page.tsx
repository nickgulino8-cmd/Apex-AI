import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldAlert, Stethoscope } from "lucide-react";
import { COMPOUND_BY_ID, ACCESS_LABEL, CONCERN_LABEL, references } from "@/lib/data/compounds";
import { Badge, Card } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: COMPOUND_BY_ID.get((await params).id)?.name ?? "Not found" };
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="label mb-2">{title}</div>
      <ul className="space-y-1.5 text-sm text-fg/90">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="text-accent">—</span><span>{x}</span></li>)}</ul>
    </div>
  );
}

export default async function CompoundPage({ params }: { params: Promise<{ id: string }> }) {
  const c = COMPOUND_BY_ID.get((await params).id);
  if (!c) notFound();
  const rx = c.access !== "otc";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/skincare" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={15} /> Database</Link>
      <header>
        <div className="label mb-2 text-accent">{c.category}</div>
        <h1 className="h1">{c.name}</h1>
        {c.aka && <p className="mt-1 text-sm text-muted">Also known as: {c.aka.join(", ")}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone={c.access === "otc" ? "ok" : c.access === "otc-and-rx" ? "accent" : "warn"}>{ACCESS_LABEL[c.access]}</Badge>
          <Badge tone="neutral">Evidence: {c.evidenceLevel}</Badge>
          {c.concerns.map((k) => <Badge key={k}>{CONCERN_LABEL[k]}</Badge>)}
        </div>
      </header>

      {c.highRisk && (
        <div className="flex gap-3 rounded-xl border border-warn/40 bg-warn/5 p-4 text-sm">
          <ShieldAlert className="shrink-0 text-warn" size={20} />
          <p><strong>High-risk medication.</strong> This entry is for education only. It must not be used for cosmetic, physique or performance purposes. Decisions about it belong with a qualified physician who can examine you and monitor your health. APEX does not provide dosing, cycling or sourcing information.</p>
        </div>
      )}

      <Card className="space-y-5">
        <div><div className="label mb-2">What it is</div><p className="text-[15px] leading-relaxed">{c.what}</p></div>
        <div><div className="label mb-2">Medical purpose</div><p className="text-sm leading-relaxed text-fg/90">{c.purpose}</p></div>
        <div><div className="label mb-2">Mechanism of action</div><p className="text-sm leading-relaxed text-fg/90">{c.mechanism}</p></div>
        <div><div className="label mb-2">Evidence</div><p className="text-sm leading-relaxed text-fg/90">{c.evidence}</p></div>
      </Card>

      <Card className="grid gap-6 sm:grid-cols-2">
        <List title="Known side effects" items={c.sideEffects} />
        <List title="Contraindications" items={c.contraindications.length ? c.contraindications : ["None major listed. Stop if you have a reaction."]} />
        <List title="Potential interactions" items={c.interactions.length ? c.interactions : ["No significant interactions commonly reported."]} />
        <div className="space-y-4">
          <div><div className="label mb-2">Age</div><p className="text-sm text-fg/90">{c.age}</p></div>
          <div><div className="label mb-2">Pregnancy & breastfeeding</div><p className="text-sm text-fg/90">{c.pregnancy}</p></div>
          <div><div className="label mb-2">Prescription required</div><p className="text-sm text-fg/90">{rx ? "Yes. " + ACCESS_LABEL[c.access] : "No"}</p></div>
        </div>
      </Card>

      {rx && (
        <div className="flex gap-3 rounded-xl border border-line/60 bg-surface p-4 text-sm text-muted">
          <Stethoscope size={18} className="shrink-0 text-accent" />
          <p>If you think this might be relevant to you, talk to a dermatologist, GP or pharmacist. Bring a list of your current medications and supplements.</p>
        </div>
      )}

      <Card>
        <div className="label mb-3">References</div>
        <ul className="space-y-2">
          {references(c).map((r) => (
            <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">{r.label} <ExternalLink size={13} /></a></li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-dim">Links open the named authoritative database pre-searched for this entry. Summaries are educational and may not reflect every country&apos;s labeling. Last content review: 2026.</p>
      </Card>
    </div>
  );
}
