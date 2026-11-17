"use client";
import { useRouter } from "next/navigation";
import { Trash2, Lock } from "lucide-react";
import { api } from "@/lib/client";
import { LocalPhoto } from "@/components/LocalPhoto";
import { Empty } from "@/components/ui";

export function Gallery({ photos }: { photos: { id: string; kind: string; created_at: string }[] }) {
  const router = useRouter();
  if (!photos.length) return <Empty icon={<Lock size={20} />} title="No saved photos" body="Photos are only saved when you tick “Save to progress” during an analysis." />;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {photos.map((p) => (
        <div key={p.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-line/60 bg-raised">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <LocalPhoto id={p.id} alt={`${p.kind} photo`} loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 px-2 py-1.5 text-[10px] text-white">
            <span className="capitalize">{p.kind} · {new Date(p.created_at.replace(" ", "T") + "Z").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            <button onClick={async () => { if (confirm("Permanently delete this photo?")) { await api(`/api/photos/${p.id}`, { method: "DELETE" }); router.refresh(); } }} aria-label="Delete photo" className="opacity-80 hover:text-bad"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
