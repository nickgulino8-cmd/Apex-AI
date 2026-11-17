"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { Spinner } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      if (mode === "register") {
        await api("/api/auth/register", {
          body: { name: f.get("name"), email: f.get("email"), password: f.get("password"), birthDate: f.get("birthDate"), acceptTerms: f.get("terms") === "on" },
        });
        window.location.href = "/onboarding";
      } else {
        await api("/api/auth/login", { body: { email: f.get("email"), password: f.get("password") } });
        window.location.href = "/home";
      }
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad glow animate-fadeUp">
      <div className="mb-8 text-center">
        <div className="text-[13px] font-semibold tracking-[0.35em]">APEX<span className="text-accent">·</span>AI</div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Build your edge"}</h1>
        <p className="mt-2 text-sm text-muted">{mode === "login" ? "Sign in to continue your streak." : "Training, skin health and daily discipline — in one place."}</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && <input name="name" required placeholder="First name" className="input" autoComplete="given-name" maxLength={60} />}
        <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" />
        <input name="password" type="password" required minLength={mode === "register" ? 10 : 1} placeholder={mode === "register" ? "Password (10+ characters)" : "Password"} className="input" autoComplete={mode === "register" ? "new-password" : "current-password"} />
        {mode === "register" && (
          <>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">Date of birth — used to apply age-appropriate safeguards</span>
              <input name="birthDate" type="date" required className="input" max={new Date().toISOString().slice(0, 10)} />
            </label>
            <label className="flex items-start gap-2.5 pt-1 text-xs text-muted">
              <input name="terms" type="checkbox" required className="mt-0.5 accent-[rgb(var(--accent))]" />
              <span>I understand APEX AI provides education, not medical advice, and I&apos;ll consult a qualified professional for medical decisions.</span>
            </label>
          </>
        )}
        {err && <div className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">{err}</div>}
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} {mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? <>New here? <Link className="text-accent" href="/register">Create an account</Link></> : <>Have an account? <Link className="text-accent" href="/login">Sign in</Link></>}
      </p>
    </div>
  );
}
