"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Delete, ScanFace } from "lucide-react";
import clsx from "clsx";
import { getLock, unlockBiometric, verifyPin } from "@/lib/lock";

/**
 * Covers the app when locked: on launch, and when returning after the chosen timeout.
 * Also hides content while the app is in the background so the app-switcher preview
 * doesn't show your data.
 */
export function AppLock({ children }: { children: ReactNode }) {
  // Start locked-unknown; decide before first paint (static HTML can't know the device's lock state).
  const [locked, setLocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hidden, setHidden] = useState(false);
  const leftAt = useRef<number | null>(null);
  useLayoutEffect(() => {
    setLocked(!!getLock());
    setChecked(true);
  }, []);

  useEffect(() => {
    const onVis = () => {
      const cfg = getLock();
      if (document.visibilityState === "hidden") {
        leftAt.current = Date.now();
        if (cfg) setHidden(true);
      } else {
        setHidden(false);
        if (cfg && leftAt.current !== null && Date.now() - leftAt.current >= cfg.timeoutMin * 60_000) setLocked(true);
        leftAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <>
      <div aria-hidden={locked || hidden} className={clsx((locked || !checked) && "invisible")}>{children}</div>
      {(locked || hidden) && <LockScreen onUnlock={() => setLocked(false)} cover={!locked} />}
    </>
  );
}

function LockScreen({ onUnlock, cover }: { onUnlock: () => void; cover: boolean }) {
  const cfg = getLock();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const tried = useRef(false);

  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [waitUntil]);

  const bio = useCallback(async () => {
    setErr(null);
    try {
      if (await unlockBiometric()) onUnlock();
      else setErr("Couldn't verify. Use your PIN.");
    } catch {
      setErr("Face ID / fingerprint was cancelled. Use your PIN or try again.");
    }
  }, [onUnlock]);

  // Offer biometrics once automatically when the lock screen appears.
  useEffect(() => {
    if (!cover && cfg?.credId && !tried.current) {
      tried.current = true;
      void bio();
    }
  }, [cover, cfg?.credId, bio]);

  async function press(d: string) {
    if (waitUntil > Date.now()) return;
    const next = (pin + d).slice(0, 6);
    setPin(next);
    setErr(null);
    if (next.length >= 4 && (await verifyPin(next))) return onUnlock();
    if (next.length === 6) {
      const f = fails + 1;
      setFails(f);
      setPin("");
      if (f >= 5) {
        setWaitUntil(Date.now() + 30_000);
        setNow(Date.now());
        setFails(0);
        setErr("Too many attempts. Wait 30 seconds.");
      } else setErr("Wrong PIN");
    }
  }

  const wait = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg px-6">
      <div className="text-[13px] font-semibold tracking-[0.35em]">APEX<span className="text-accent">·</span>AI</div>
      {!cover && (
        <div className="mt-10 w-full max-w-xs text-center animate-fadeUp">
          <div className="text-sm text-muted">Enter your PIN</div>
          <div className="my-5 flex justify-center gap-3">
            {Array.from({ length: 6 }, (_, i) => <span key={i} className={clsx("h-3 w-3 rounded-full border", i < pin.length ? "border-accent bg-accent" : "border-line")} />)}
          </div>
          <div className="h-5 text-xs text-bad">{wait ? `Wait ${wait}s` : err}</div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} onClick={() => press(d)} className="h-16 rounded-2xl border border-line/70 bg-raised/40 font-mono text-xl active:bg-raised">{d}</button>
            ))}
            {cfg?.credId ? (
              <button onClick={bio} className="grid h-16 place-items-center rounded-2xl text-accent" aria-label="Unlock with Face ID or fingerprint"><ScanFace size={26} /></button>
            ) : <span />}
            <button onClick={() => press("0")} className="h-16 rounded-2xl border border-line/70 bg-raised/40 font-mono text-xl active:bg-raised">0</button>
            <button onClick={() => setPin(pin.slice(0, -1))} className="grid h-16 place-items-center rounded-2xl text-muted" aria-label="Delete"><Delete size={22} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
