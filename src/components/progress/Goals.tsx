"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { Bar, Empty, Badge } from "@/components/ui";

type G = { id: string; title: string; category: string; target_date: string | null; progress: number; status: string };
const CATS = ["fitness", "skin", "discipline", "faith", "personal", "career"];

export function Goals({ goals }: { goals: G[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", category: "fitness", target_date: "" });
  const patch = async (id: string, b: object) => { await api("/api/goals", { method: "PATCH", body: { id, ...b } }); router.refresh(); };

  return (
    <div className="space-y-3">
      {goals.length === 0 && !open && <Empty title="No goals yet" body="Set a long-term target. Make it something you control, like consistency or a skill, not a number on a scale." />}
      {goals.map((g) => (
        <div key={g.id} className="rounded-xl border border-line/60 bg-raised/30 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className={g.status === "done" ? "text-muted line-through" : "font-medium"}>{g.title}</div>
              <div className="mt-1 flex gap-1.5"><Badge>{g.category}</Badge>{g.target_date && <Badge>by {g.target_date}</Badge>}{g.status === "done" && <Badge tone="ok">Done</Badge>}</div>
            </div>
            <div className="flex gap-2">
              {g.status !== "done" && <button onClick={() => patch(g.id, { status: "done", progress: 100 })} className="text-dim hover:text-ok" aria-label="Mark done"><Check size={16} /></button>}
              <button onClick={async () => { if (confirm("Delete goal?")) { await api(`/api/goals?id=${g.id}`, { method: "DELETE" }); router.refresh(); } }} className="text-dim hover:text-bad" aria-label="Delete"><Trash2 size={15} /></button>
            </div>
          </div>
          {g.status !== "done" && (
            <div className="mt-3 flex items-center gap-3">
              <Bar value={g.progress / 100} />
              <input type="range" min={0} max={100} step={5} defaultValue={g.progress} onMouseUp={(e) => patch(g.id, { progress: Number((e.target as HTMLInputElement).value) })} onTouchEnd={(e) => patch(g.id, { progress: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => patch(g.id, { progress: Number((e.target as HTMLInputElement).value) })} className="w-24 accent-[rgb(var(--accent))]" aria-label="Progress" />
              <span className="w-9 text-right font-mono text-xs">{g.progress}%</span>
            </div>
          )}
        </div>
      ))}
      {open ? (
        <form onSubmit={async (e) => { e.preventDefault(); await api("/api/goals", { body: { ...f, target_date: f.target_date || null } }); setF({ title: "", category: "fitness", target_date: "" }); setOpen(false); router.refresh(); }} className="space-y-2 rounded-xl border border-line/60 p-3">
          <input required autoFocus className="input" placeholder="e.g. Train 4×/week for 12 weeks" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} />
          <div className="flex gap-2">
            <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <input type="date" className="input" value={f.target_date} onChange={(e) => setF({ ...f, target_date: e.target.value })} />
          </div>
          <div className="flex gap-2"><button className="btn-primary py-2 text-xs">Add goal</button><button type="button" onClick={() => setOpen(false)} className="btn-ghost py-2 text-xs">Cancel</button></div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-ghost py-1.5 text-xs"><Plus size={14} /> New goal</button>
      )}
    </div>
  );
}
