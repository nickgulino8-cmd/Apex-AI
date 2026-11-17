"use client";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { Empty } from "@/components/ui";

export type HistItem = { id: string; date: string; title: string; duration_min: number | null; session_rpe: number | null; notes: string | null; exercises: { name: string; sets: string }[] };

export function HistoryList({ items }: { items: HistItem[] }) {
  const router = useRouter();
  if (!items.length) return <Empty title="No workouts logged" body="Start a session from your program and it will show up here." />;
  return (
    <div className="space-y-3">
      {items.map((w) => (
        <div key={w.id} className="card card-pad">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{w.title}</div>
              <div className="text-xs text-muted">
                {new Date(w.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                {w.duration_min ? ` · ${w.duration_min} min` : ""}{w.session_rpe ? ` · RPE ${w.session_rpe}` : ""}
              </div>
            </div>
            <button
              onClick={async () => { if (confirm("Delete this workout?")) { await api(`/api/workouts/${w.id}`, { method: "DELETE" }); router.refresh(); } }}
              className="text-dim hover:text-bad" aria-label="Delete workout"
            ><Trash2 size={16} /></button>
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-2">
            {w.exercises.map((e) => <div key={e.name} className="flex justify-between gap-3"><span className="truncate text-fg/90">{e.name}</span><span className="shrink-0 font-mono text-xs text-muted">{e.sets}</span></div>)}
          </div>
          {w.notes && <p className="mt-2 text-xs italic text-muted">{w.notes}</p>}
        </div>
      ))}
    </div>
  );
}
