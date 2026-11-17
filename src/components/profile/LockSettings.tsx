"use client";
import { useEffect, useState } from "react";
import { Lock, ScanFace } from "lucide-react";
import { getLock, setPin, verifyPin, disableLock, enrollBiometric, removeBiometric, biometricAvailable, setTimeoutMin } from "@/lib/lock";
import { Notice, Spinner } from "@/components/ui";
import { Chips } from "@/components/forms/Choice";

export function LockSettings() {
  const [cfg, setCfg] = useState(getLock());
  const [bioOk, setBioOk] = useState(false);
  const [mode, setMode] = useState<"idle" | "set" | "disable">("idle");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  useEffect(() => { biometricAvailable().then(setBioOk); }, []);
  const refresh = () => setCfg(getLock());
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  async function savePin() {
    if (a.length < 4) return setMsg({ tone: "bad", text: "Use 4–6 digits." });
    if (a !== b) return setMsg({ tone: "bad", text: "PINs don't match." });
    setBusy(true);
    await setPin(a);
    setBusy(false);
    setA(""); setB(""); setMode("idle"); refresh();
    setMsg({ tone: "ok", text: cfg ? "PIN changed." : "App lock is on. APEX will ask for your PIN when it opens." });
  }
  async function disable() {
    setBusy(true);
    const okPin = await verifyPin(a);
    setBusy(false);
    if (!okPin) return setMsg({ tone: "bad", text: "Wrong PIN." });
    disableLock(); setA(""); setMode("idle"); refresh();
    setMsg({ tone: "ok", text: "App lock turned off." });
  }

  return (
    <section className="card card-pad space-y-4">
      <h2 className="h2 flex items-center gap-2"><Lock size={18} className="text-accent" /> App lock</h2>
      <p className="text-sm text-muted">Require a PIN (and optionally Face ID or fingerprint) to open APEX. The app is also hidden in the app switcher while locked.</p>

      {cfg && mode === "idle" && (
        <div className="space-y-3">
          <div>
            <div className="label mb-2">Lock after leaving the app for</div>
            <Chips options={[{ v: "0", l: "Immediately" }, { v: "1", l: "1 minute" }, { v: "5", l: "5 minutes" }, { v: "15", l: "15 minutes" }] as const}
              value={[String(cfg.timeoutMin) as "0"]} onChange={([v]) => { setTimeoutMin(Number(v)); refresh(); }} />
          </div>
          {bioOk ? (
            cfg.credId ? (
              <button className="btn-ghost text-xs" onClick={() => { removeBiometric(); refresh(); }}><ScanFace size={14} /> Turn off Face ID / fingerprint</button>
            ) : (
              <button className="btn-ghost text-xs" onClick={async () => {
                try { await enrollBiometric(); refresh(); setMsg({ tone: "ok", text: "Face ID / fingerprint unlock is on." }); }
                catch (e) { setMsg({ tone: "bad", text: (e as Error).message || "Setup was cancelled." }); }
              }}><ScanFace size={14} /> Use Face ID / fingerprint</button>
            )
          ) : <p className="text-xs text-dim">Face ID / fingerprint isn&apos;t available in this browser, so the PIN will be used.</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost text-xs" onClick={() => { setMode("set"); setMsg(null); }}>Change PIN</button>
            <button className="btn-ghost text-xs text-muted" onClick={() => { setMode("disable"); setMsg(null); }}>Turn off app lock</button>
          </div>
        </div>
      )}

      {!cfg && mode === "idle" && <button className="btn-primary" onClick={() => { setMode("set"); setMsg(null); }}><Lock size={16} /> Turn on app lock</button>}

      {mode === "set" && (
        <div className="space-y-2">
          <input className="input font-mono tracking-[0.4em]" inputMode="numeric" type="password" autoComplete="new-password" placeholder="New PIN (4–6 digits)" value={a} onChange={(e) => setA(digits(e.target.value))} />
          <input className="input font-mono tracking-[0.4em]" inputMode="numeric" type="password" autoComplete="new-password" placeholder="Repeat PIN" value={b} onChange={(e) => setB(digits(e.target.value))} />
          <p className="text-xs text-dim">If you forget the PIN, the only way back in is clearing the app&apos;s data, which erases everything. Keep a backup.</p>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy} onClick={savePin}>{busy && <Spinner />} Save PIN</button>
            <button className="btn-ghost" onClick={() => { setMode("idle"); setA(""); setB(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "disable" && (
        <div className="space-y-2">
          <input className="input font-mono tracking-[0.4em]" inputMode="numeric" type="password" placeholder="Current PIN" value={a} onChange={(e) => setA(digits(e.target.value))} />
          <div className="flex gap-2">
            <button className="btn-danger" disabled={busy} onClick={disable}>{busy && <Spinner />} Turn off</button>
            <button className="btn-ghost" onClick={() => { setMode("idle"); setA(""); }}>Cancel</button>
          </div>
        </div>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </section>
  );
}
