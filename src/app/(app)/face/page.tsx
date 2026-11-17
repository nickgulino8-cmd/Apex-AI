import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db, json } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { compoundLite } from "@/lib/compound-lite";
import { PageHeader, Card } from "@/components/ui";
import { FaceStudio } from "@/components/face/FaceStudio";
import { FaceHistory, type FaceAnalysis } from "@/components/face/FaceHistory";
import { Tabs } from "@/components/Tabs";

export const metadata = { title: "Face" };
export const dynamic = "force-dynamic";

export default async function FacePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const tab = (await searchParams).tab === "history" ? "history" : "analyse";
  const header = (
    <PageHeader eyebrow="Face" title="Facial observations & skin analysis" sub="On-device facial measurements, AI skin analysis and a four-pillar facial rating, with progress tracked over time." />
  );
  if (user.isMinor)
    return (
      <div>
        {header}
        <Card>
          <div className="flex gap-3"><ShieldCheck className="shrink-0 text-accent" />
            <div>
              <div className="font-medium">Photo analysis is available from age 18</div>
              <p className="mt-1 text-sm text-muted">This is an extra privacy safeguard for younger users. You can still use the <Link className="text-accent" href="/skincare">ingredient database</Link>, the <Link className="text-accent" href="/skincare/routine">routine builder</Link> and the <Link className="text-accent" href="/coach?mode=appearance">skincare coach</Link>. If a skin concern is bothering you, a parent or doctor can help you see a dermatologist.</p>
            </div>
          </div>
        </Card>
      </div>
    );

  const rows = db.prepare("SELECT id, created_at, photo_id, metrics, report, ratings FROM face_analyses WHERE user_id = ? ORDER BY created_at DESC").all(user.id) as {
    id: string; created_at: string; photo_id: string | null; metrics: string; report: string; ratings: string | null;
  }[];
  const items: FaceAnalysis[] = rows.map((r) => ({ id: r.id, created_at: r.created_at, photo_id: r.photo_id, metrics: json(r.metrics, null), report: { ...json<FaceAnalysis["report"]>(r.report, {} as FaceAnalysis["report"]), ratings: json(r.ratings, null) } }));
  const compounds = compoundLite();

  return (
    <div>
      {header}
      <Tabs active={tab} tabs={[{ key: "analyse", label: "Analyse", href: "/face" }, { key: "history", label: `History & compare (${items.length})`, href: "/face?tab=history" }]} />
      {tab === "analyse" ? (
        <FaceStudio aiReady={aiConfigured()} consented={!!user.profile.photo_consent_at} defaultSave={user.profile.save_photos} compounds={compounds} showRatings={user.profile.show_ratings} ratingRef={user.profile.rating_reference} />
      ) : (
        <FaceHistory items={items} compounds={compounds} />
      )}
    </div>
  );
}
