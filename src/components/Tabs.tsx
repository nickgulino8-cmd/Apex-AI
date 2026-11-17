import Link from "next/link";
import clsx from "clsx";

export function Tabs({ tabs, active }: { tabs: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-line/60 bg-surface p-1 [scrollbar-width:none]">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} scroll={false} className={clsx("whitespace-nowrap rounded-lg px-3.5 py-2 text-sm transition", active === t.key ? "bg-raised text-fg shadow-sm" : "text-muted hover:text-fg")}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
