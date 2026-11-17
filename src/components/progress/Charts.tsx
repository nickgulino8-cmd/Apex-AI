"use client";
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, ReferenceLine } from "recharts";
import { Empty } from "@/components/ui";

const AX = { stroke: "rgb(var(--dim))", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeOpacity={0.5} />;
const fmtWeek = (s: string) => new Date(s + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Tip({ active, payload, label, unit, labelFmt }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string; labelFmt?: (s: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="text-muted">{label && (labelFmt ? labelFmt(label) : label)}</div>
      <div className="mt-0.5 font-mono text-sm text-fg">{payload[0].value}{unit}</div>
    </div>
  );
}

export function SessionsChart({ data, target }: { data: { week: string; sessions: number }[]; target: number | null }) {
  return (
    <div className="h-52">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap={6}>
          {GRID}
          <XAxis dataKey="week" tickFormatter={fmtWeek} {...AX} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} {...AX} />
          {target && <ReferenceLine y={target} stroke="rgb(var(--silver))" strokeDasharray="4 4" label={{ value: "plan", fill: "rgb(var(--muted))", fontSize: 10, position: "insideTopRight" }} />}
          <Tooltip cursor={{ fill: "rgb(var(--raised))" }} content={<Tip unit=" sessions" labelFmt={(s) => `Week of ${fmtWeek(s)}`} />} />
          <Bar dataKey="sessions" fill="rgb(var(--accent))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StrengthChart({ lifts, units }: { lifts: { id: string; name: string; change: number; points: { date: string; e1rm: number; best: string }[] }[]; units: string }) {
  const [sel, setSel] = useState(lifts[0]?.id);
  const lift = lifts.find((l) => l.id === sel);
  if (!lifts.length) return <Empty title="No strength data yet" body="Log weighted sets of 12 reps or fewer to see estimated-1RM trends." />;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="input w-auto py-2" aria-label="Exercise">
          {lifts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {lift && lift.points.length > 1 && <span className={`font-mono text-sm ${lift.change >= 0 ? "text-ok" : "text-muted"}`}>{lift.change >= 0 ? "+" : ""}{lift.change}% since first log</span>}
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={lift?.points ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            {GRID}
            <XAxis dataKey="date" tickFormatter={fmtWeek} {...AX} interval="preserveStartEnd" />
            <YAxis domain={["auto", "auto"]} {...AX} />
            <Tooltip cursor={{ stroke: "rgb(var(--dim))", strokeDasharray: "3 3" }} content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
                  <div className="text-muted">{fmtWeek(label as string)}</div>
                  <div className="mt-0.5 font-mono text-sm">e1RM {payload[0].value}{units}</div>
                  <div className="text-muted">Best set {(payload[0].payload as { best: string }).best}</div>
                </div>
              ) : null} />
            <Line type="monotone" dataKey="e1rm" stroke="rgb(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "rgb(var(--accent))", stroke: "rgb(var(--surface))", strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-dim">Estimated one-rep max (Epley formula) from your best set each session. It's a trend indicator, not a test result.</p>
    </div>
  );
}

export function SleepChart({ data }: { data: { date: string; hours: number | null }[] }) {
  const pts = data.filter((d) => d.hours != null);
  if (pts.length < 2) return <Empty title="Not enough sleep data" body="Log sleep from Home each morning." />;
  return (
    <div className="h-48">
      <ResponsiveContainer>
        <LineChart data={pts} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="date" tickFormatter={fmtWeek} {...AX} interval="preserveStartEnd" />
          <YAxis domain={[0, 12]} ticks={[0, 4, 7, 9, 12]} {...AX} />
          <ReferenceLine y={7} stroke="rgb(var(--silver))" strokeDasharray="4 4" label={{ value: "7 h", fill: "rgb(var(--muted))", fontSize: 10, position: "insideBottomRight" }} />
          <Tooltip cursor={{ stroke: "rgb(var(--dim))", strokeDasharray: "3 3" }} content={<Tip unit=" h" labelFmt={fmtWeek} />} />
          <Line type="monotone" dataKey="hours" stroke="rgb(var(--accent))" strokeWidth={2} dot={{ r: 3.5, fill: "rgb(var(--accent))", stroke: "rgb(var(--surface))", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** GitHub-style calendar heatmap — sequential single hue, with tooltip via title. */
const LABELS = {
  training: (d: { date: string; value: number }) => `${d.date}: ${d.value ? "trained" : "rest"}`,
  habits: (d: { date: string; value: number; max: number }) => `${d.date}: ${d.value}/${d.max} habits`,
  skincare: (d: { date: string; value: number }) => `${d.date}: ${d.value}/2 routines`,
};

export function Heatmap({ days, kind }: { days: { date: string; value: number; max: number }[]; kind: keyof typeof LABELS }) {
  const label = LABELS[kind];
  const first = new Date(days[0].date + "T12:00:00").getDay();
  const pad = (first + 6) % 7;
  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto" style={{ gridAutoColumns: "minmax(10px, 1fr)" }}>
        {Array.from({ length: pad }, (_, i) => <span key={`p${i}`} />)}
        {days.map((d) => {
          const v = d.max ? d.value / d.max : 0;
          return <span key={d.date} title={label(d)} className="aspect-square rounded-[3px] border border-line/40" style={{ background: v ? `rgb(var(--accent) / ${0.2 + v * 0.8})` : "rgb(var(--raised))" }} />;
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-dim">Less {[0, 0.25, 0.5, 0.75, 1].map((v) => <span key={v} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: v ? `rgb(var(--accent) / ${0.2 + v * 0.8})` : "rgb(var(--raised))" }} />)} More</div>
    </div>
  );
}

export function RatingTrend({ points }: { points: { date: string; score: number; low: number; high: number }[] }) {
  if (points.length < 2) return <Empty title={points.length ? `Latest: ${points[0].score.toFixed(1)}` : "No ratings yet"} body="Run at least two facial analyses to see a trend. Differences under about 0.5 are usually photo noise." />;
  return (
    <div className="h-52">
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="date" tickFormatter={fmtWeek} {...AX} interval="preserveStartEnd" />
          <YAxis domain={[1, 10]} ticks={[1, 4, 5.5, 7, 10]} {...AX} />
          <ReferenceLine y={5.5} stroke="rgb(var(--silver))" strokeDasharray="4 4" label={{ value: "avg", fill: "rgb(var(--muted))", fontSize: 10, position: "insideBottomRight" }} />
          <Tooltip cursor={{ stroke: "rgb(var(--dim))", strokeDasharray: "3 3" }} content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
                <div className="text-muted">{fmtWeek(label as string)}</div>
                <div className="mt-0.5 font-mono text-sm">{(payload[0].value as number).toFixed(1)} / 10</div>
                <div className="text-muted">range {(payload[0].payload as { low: number }).low.toFixed(1)}–{(payload[0].payload as { high: number }).high.toFixed(1)}</div>
              </div>
            ) : null} />
          <Line type="monotone" dataKey="score" stroke="rgb(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "rgb(var(--accent))", stroke: "rgb(var(--surface))", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
