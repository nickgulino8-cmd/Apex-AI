"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import clsx from "clsx";
import { Anatomy } from "@/components/Anatomy";
import { Badge, Empty } from "@/components/ui";
import { GROUP_LABEL, MUSCLE_GROUPS, EQUIPMENT, type MuscleGroup } from "@/lib/data/exercise-types";
import { MoveDemo } from "@/components/MoveDemo";
import type { Pattern } from "@/lib/data/exercise-types";

export type ExCard = { id: string; name: string; group: MuscleGroup; primary: string[]; equipment: string[]; difficulty: string; mechanics: string; pattern: Pattern; owned: boolean };

export function Library({ items, initialGroup }: { items: ExCard[]; initialGroup: MuscleGroup | null }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<MuscleGroup | null>(initialGroup);
  const [equip, setEquip] = useState<string | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const counts = useMemo(() => Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, items.filter((e) => e.group === g).length])), [items]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((e) =>
      (!group || e.group === group) && (!equip || e.equipment.includes(equip)) && (!diff || e.difficulty === diff) && (!mine || e.owned) &&
      (!s || [e.name, e.group, ...e.primary, ...e.equipment].join(" ").toLowerCase().includes(s)));
  }, [items, q, group, equip, diff, mine]);
  const maxCount = Math.max(...Object.values(counts));

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-4">
          <div className="label mb-2">Tap a muscle</div>
          <Anatomy selected={group} onSelect={(g) => setGroup(group === g ? null : g)} labels={GROUP_LABEL} values={Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, counts[g] / maxCount * 0.5]))} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_GROUPS.map((g) => <button key={g} onClick={() => setGroup(group === g ? null : g)} className={clsx("chip", group === g && "chip-on")}>{GROUP_LABEL[g]} <span className="text-dim">{counts[g]}</span></button>)}
        </div>
      </aside>
      <div>
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, muscle or equipment" className="input pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="input w-auto py-2" value={equip ?? ""} onChange={(e) => setEquip(e.target.value || null)} aria-label="Equipment">
              <option value="">Any equipment</option>
              {EQUIPMENT.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select className="input w-auto py-2" value={diff ?? ""} onChange={(e) => setDiff(e.target.value || null)} aria-label="Difficulty">
              <option value="">Any level</option>
              <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
            </select>
            <button onClick={() => setMine(!mine)} className={clsx("chip px-3", mine && "chip-on")}>My equipment only</button>
            {(group || equip || diff || mine || q) && <button onClick={() => { setGroup(null); setEquip(null); setDiff(null); setMine(false); setQ(""); }} className="chip px-3"><X size={12} /> Clear</button>}
          </div>
        </div>
        <div className="mb-3 text-xs text-dim">{list.length} exercises{group ? ` · ${GROUP_LABEL[group]}` : ""}</div>
        {list.length === 0 ? <Empty title="No exercises match" body="Loosen a filter to see more." /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((e) => (
              <Link key={e.id} href={`/exercises/${e.id}`} className="group overflow-hidden rounded-2xl border border-line/70 bg-surface transition hover:-translate-y-0.5 hover:border-accent/40">
                <div className="border-b border-line/60 [&>div>div]:rounded-none [&>div>div]:border-0"><MoveDemo pattern={e.pattern} hoverOnly /></div>
                <div className="p-3.5">
                  <div className="font-medium group-hover:text-accent">{e.name}</div>
                  <div className="mt-0.5 truncate text-xs text-muted">{e.primary.join(", ")}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone={e.difficulty === "beginner" ? "ok" : e.difficulty === "intermediate" ? "accent" : "warn"}>{e.difficulty}</Badge>
                    <Badge>{e.mechanics}</Badge>
                    {!e.owned && <Badge tone="neutral">needs {e.equipment.filter((x) => x !== "bodyweight").join(", ")}</Badge>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
