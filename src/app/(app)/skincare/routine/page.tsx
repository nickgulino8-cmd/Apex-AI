import { requireUser } from "@/lib/auth";
import { skincareHistory, skincareRoutine } from "@/lib/repo";
import { today } from "@/lib/util";
import { COMPOUNDS } from "@/lib/data/compounds";
import { PageHeader, Card, SectionHead, Ring } from "@/components/ui";
import { Tabs } from "@/components/Tabs";
import { RoutineBuilder } from "@/components/skincare/RoutineBuilder";

export const metadata = { title: "Routine builder" };
export const dynamic = "force-dynamic";

export default async function RoutinePage() {
  const user = await requireUser();
  const p = user.profile;
  const hist = skincareHistory(user.id, 28, today());
  const done = hist.reduce((s, d) => s + Number(d.am) + Number(d.pm), 0);
  const names = Object.fromEntries(COMPOUNDS.map((c) => [c.id, c.name]));
  return (
    <div>
      <PageHeader eyebrow="Skincare" title="Routine builder" sub="Morning and evening routines from your skin type and concerns, following dermatologist guidance on ingredient compatibility. Only OTC products go into the routine." />
      <Tabs active="routine" tabs={[{ key: "db", label: "Database", href: "/skincare" }, { key: "routine", label: "Routine builder", href: "/skincare/routine" }]} />
      <RoutineBuilder initial={{ skinType: p.skin_type, concerns: p.skin_concerns, sensitive: p.skin_sensitive, pregnancy: p.pregnancy_flag }} saved={skincareRoutine(user.id)} names={names} />
      <Card className="mt-6">
        <SectionHead label="Consistency" title="Last 28 days" sub="Check in from Home each morning and evening." action={<Ring value={done / 56} size={56} />} />
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
          {hist.map((d) => (
            <div key={d.date} title={`${d.date}: AM ${d.am ? "✓" : "–"} · PM ${d.pm ? "✓" : "–"}`} className="overflow-hidden rounded-md border border-line/60">
              <div className={`h-3 ${d.am ? "bg-accent" : "bg-raised"}`} />
              <div className={`h-3 ${d.pm ? "bg-accent/60" : "bg-raised/60"}`} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-[11px] text-dim"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-accent" /> AM</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-accent/60" /> PM</span></div>
      </Card>
    </div>
  );
}
