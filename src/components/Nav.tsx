"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Home, ScanFace, Droplets, Dumbbell, LibraryBig, Sparkles, LineChart, UserRound, MoreHorizontal, X, LogOut } from "lucide-react";

export const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/face", label: "Face", icon: ScanFace },
  { href: "/skincare", label: "Skincare", icon: Droplets },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
  { href: "/exercises", label: "Exercises", icon: LibraryBig },
  { href: "/coach", label: "AI Coach", icon: Sparkles },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/profile", label: "Profile", icon: UserRound },
];
const MOBILE_PRIMARY = ["/home", "/face", "/fitness", "/coach"];

function Logo() {
  return (
    <Link href="/home" className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--accent))" />
            <stop offset="1" stopColor="rgb(var(--silver))" />
          </linearGradient>
        </defs>
        <path d="M16 3 29 28H22.5L16 15 9.5 28H3Z" fill="url(#lg)" />
        <path d="M12.5 23h7" stroke="rgb(var(--bg))" strokeWidth="2.2" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[0.2em]">APEX<span className="text-accent">·</span>AI</span>
    </Link>
  );
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

export function Sidebar({ name }: { name: string }) {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line/60 bg-bg/80 px-4 py-6 backdrop-blur lg:flex">
      <div className="px-2"><Logo /></div>
      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                on ? "bg-raised text-fg" : "text-muted hover:bg-raised/50 hover:text-fg",
              )}
            >
              {on && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />}
              <Icon size={18} strokeWidth={1.75} className={on ? "text-accent" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between rounded-xl border border-line/60 px-3 py-2.5 text-sm">
        <span className="truncate text-muted">{name}</span>
        <button onClick={logout} className="text-dim hover:text-fg" aria-label="Sign out"><LogOut size={16} /></button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const more = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.href));
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-bg/80 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {NAV.filter((n) => MOBILE_PRIMARY.includes(n.href)).map(({ href, label, icon: Icon }) => {
            const on = path.startsWith(href);
            return (
              <Link key={href} href={href} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[10px]", on ? "text-accent" : "text-muted")}>
                <Icon size={20} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[10px]", more.some((m) => path.startsWith(m.href)) ? "text-accent" : "text-muted")}>
            <MoreHorizontal size={20} strokeWidth={1.75} />
            More
          </button>
        </div>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-fadeUp" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="label">More</span>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {more.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl border border-line/60 bg-raised/40 px-3 py-3 text-sm">
                  <Icon size={18} className="text-accent" /> {label}
                </Link>
              ))}
              <button onClick={logout} className="flex items-center gap-3 rounded-xl border border-line/60 bg-raised/40 px-3 py-3 text-sm text-muted">
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
