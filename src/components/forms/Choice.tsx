"use client";
import clsx from "clsx";
import { Check } from "lucide-react";

export function Chips<T extends string>({ options, value, onChange, multi = false, max }: { options: readonly { v: T; l: string }[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean; max?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.v);
        return (
          <button
            type="button"
            key={o.v}
            onClick={() => {
              if (!multi) return onChange([o.v]);
              if (on) onChange(value.filter((x) => x !== o.v));
              else if (!max || value.length < max) onChange([...value, o.v]);
            }}
            className={clsx("chip px-3 py-1.5 text-[13px] transition", on && "chip-on")}
            aria-pressed={on}
          >
            {on && multi && <Check size={13} className="text-accent" />}
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={clsx("flex items-start justify-between gap-4 py-3", disabled && "opacity-50")}>
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx("relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition", checked ? "bg-accent" : "bg-line")}
      >
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export function Slider({ value, onChange, min, max, step = 1, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-4">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
      <span className="w-16 text-right font-mono text-sm tabular-nums">{value}{suffix}</span>
    </div>
  );
}
