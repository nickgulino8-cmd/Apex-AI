import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ className, children, pad = true }: { className?: string; children: ReactNode; pad?: boolean }) {
  return <section className={clsx("card animate-fadeUp", pad && "card-pad", className)}>{children}</section>;
}

export function SectionHead({ label, title, action, sub }: { label?: string; title: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {label && <div className="label mb-1">{label}</div>}
        <h2 className="h2">{title}</h2>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, action }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="label mb-2 text-accent">{eyebrow}</div>}
        <h1 className="h1">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Stat({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line/60 bg-raised/40 p-4">
      <div className="label">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tabular-nums">{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute text-center font-mono text-xs font-semibold tabular-nums">{label ?? `${Math.round(v * 100)}%`}</div>
    </div>
  );
}

export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-line/60", className)}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

const TONE = { neutral: "border-line text-muted", accent: "border-accent/40 text-accent bg-accent/10", ok: "border-ok/40 text-ok bg-ok/10", warn: "border-warn/40 text-warn bg-warn/10", bad: "border-bad/40 text-bad bg-bad/10" };
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONE }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium", TONE[tone])}>{children}</span>;
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 text-dim">{icon}</div>}
      <div className="font-medium">{title}</div>
      {body && <div className="mt-1 max-w-sm text-sm text-muted">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={clsx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} aria-label="Loading" />;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad" | "ok"; children: ReactNode }) {
  const t = { info: "border-accent/30 bg-accent/5", warn: "border-warn/40 bg-warn/5", bad: "border-bad/40 bg-bad/5", ok: "border-ok/40 bg-ok/5" }[tone];
  return <div className={clsx("rounded-xl border px-4 py-3 text-sm text-fg/90", t)}>{children}</div>;
}
