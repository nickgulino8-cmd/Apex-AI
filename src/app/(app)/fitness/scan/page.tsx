import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db, json } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { EXERCISES } from "@/lib/data/exercises";
import { PageHeader, Card } from "@/components/ui";
import { PhysiqueScan, type PastScan } from "@/components/fitness/PhysiqueScan";

export const metadata = { title: "Physique scan" };
export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const user = await requireUser();
  const header = <PageHeader eyebrow="Fitness" title="Physique scan" sub="Find which muscle groups look less developed relative to the rest of you, then build that emphasis into your program." />;
  if (user.isMinor)
    return (<div>{header}<Card><div className="flex gap-3"><ShieldCheck className="shrink-0 text-accent" /><p className="text-sm text-muted">Physique photo analysis is only available for adults (18+). Your program already trains every muscle group in a balanced way.</p></div></Card></div>);
  const past = (db.prepare("SELECT id, created_at, report, ratings FROM body_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 12").all(user.id) as { id: string; created_at: string; report: string; ratings: string | null }[])
    .map((r) => ({ id: r.id, created_at: r.created_at, report: { ...json<PastScan["report"]>(r.report, {} as PastScan["report"]), ratings: json(r.ratings, null) } })) as PastScan[];
  return (
    <div>
      {header}
      <PhysiqueScan aiReady={aiConfigured()} consented={!!user.profile.photo_consent_at} exerciseNames={Object.fromEntries(EXERCISES.map((e) => [e.id, e.name]))} past={past} showRatings={user.profile.show_ratings} />
    </div>
  );
}
