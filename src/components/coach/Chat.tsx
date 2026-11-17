"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Brain, Trash2, Sparkles, WifiOff, Check, X } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { localFetch } from "@/lib/local-fetch";
import { Markdown } from "@/components/Markdown";
import { Spinner } from "@/components/ui";

type Msg = { id?: number; role: "user" | "assistant"; content: string };
type Mode = "assistant" | "appearance";

const SUGGEST: Record<Mode, string[]> = {
  assistant: ["What should I train today?", "What exercises target my chest?", "What does my workout history show?", "What habits should I focus on this week?", "How do I break a bench press plateau?"],
  appearance: ["How should I organize my skincare routine?", "What does niacinamide do?", "Difference between adapalene and tretinoin?", "Explain facial thirds and what they describe", "When should I see a dermatologist about acne?"],
};

const splitMemory = (t: string) => {
  const m = /\n?REMEMBER:\s*(.+)\s*$/s.exec(t);
  return m ? { text: t.slice(0, m.index).trimEnd(), memory: m[1].trim().split("\n")[0] } : { text: t.replace(/\n?REMEM?B?E?R?:?$/s, ""), memory: null };
};

export function Chat({ mode, memoryOn, name }: { mode: Mode; memoryOn: boolean; name: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [ai, setAi] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memory, setMemory] = useState<string | null>(null);
  const [memSaved, setMemSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    setLoading(true);
    api<{ messages: Msg[]; ai: boolean }>(`/api/coach?mode=${mode}`)
      .then((r) => { setMsgs(r.messages); setAi(r.ai); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
    return () => abort.current?.abort();
  }, [mode]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    setErr(null);
    setMemory(null);
    setMemSaved(false);
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: t }, { role: "assistant", content: "" }]);
    abort.current = new AbortController();
    try {
      const res = await localFetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: t, mode }), signal: abort.current.signal });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Message failed");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        const shown = splitMemory(full).text;
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: shown }]);
      }
      const { text: final, memory: mem } = splitMemory(full);
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: final }]);
      if (mem && memoryOn) setMemory(mem);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setErr((e as Error).message);
        setMsgs((m) => (m.at(-1)?.content === "" ? m.slice(0, -1) : m));
      }
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (!confirm("Clear this conversation?")) return;
    await api(`/api/coach?mode=${mode}`, { method: "DELETE" });
    setMsgs([]);
  }

  return (
    <div className="flex h-[calc(100dvh-19rem)] min-h-[380px] flex-col rounded-2xl border border-line/70 bg-surface lg:h-[calc(100dvh-14rem)]">
      <div className="flex items-center justify-between gap-2 border-b border-line/60 px-4 py-2.5 text-xs">
        <span className="flex items-center gap-1.5 text-muted">
          {ai === null ? <Spinner /> : ai ? <><Sparkles size={13} className="text-accent" /> AI mode · personalised to your data</> : <><WifiOff size={13} /> Offline mode · answers from your data & APEX databases</>}
        </span>
        <span className="flex items-center gap-3">
          {memoryOn && <span className="flex items-center gap-1 text-muted"><Brain size={13} /> Memory on</span>}
          {msgs.length > 0 && <button onClick={clear} className="text-dim hover:text-bad" aria-label="Clear conversation"><Trash2 size={14} /></button>}
        </span>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {loading ? (
          <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-14 w-2/3" />)}</div>
        ) : msgs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-accent/40 bg-accent/10"><Sparkles className="text-accent" size={22} /></div>
            <div className="mt-4 text-lg font-medium">{mode === "appearance" ? "Your skin & appearance coach" : `What are we working on, ${name}?`}</div>
            <p className="mt-1 max-w-md text-sm text-muted">{mode === "appearance" ? "Skin science, ingredients, routines and facial anatomy, explained neutrally and based on evidence." : "I know your program, workout history, routine and habits. Ask me anything."}</p>
            <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGEST[mode].map((s) => <button key={s} onClick={() => send(s)} className="chip px-3 py-1.5 hover:border-accent/50 hover:text-fg">{s}</button>)}
            </div>
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={clsx("max-w-[88%] rounded-2xl px-4 py-2.5", m.role === "user" ? "bg-accent text-white" : "border border-line/60 bg-raised/40")}>
                {m.role === "user" ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : m.content ? <Markdown text={m.content} /> : <span className="flex items-center gap-2 text-sm text-muted"><Spinner /> Thinking…</span>}
              </div>
            </div>
          ))
        )}
        {memory && (
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm animate-fadeUp">
            <Brain size={16} className="shrink-0 text-accent" />
            <span className="flex-1">{memSaved ? "Saved to memory." : <>Remember: <em>{memory}</em>?</>}</span>
            {!memSaved && (
              <>
                <button onClick={async () => { await api("/api/memories", { body: { content: memory } }); setMemSaved(true); }} className="text-ok" aria-label="Save memory"><Check size={16} /></button>
                <button onClick={() => setMemory(null)} className="text-dim" aria-label="Dismiss"><X size={16} /></button>
              </>
            )}
          </div>
        )}
        {err && <div className="text-center text-sm text-bad">{err}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-line/60 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            maxLength={4000}
            placeholder={mode === "appearance" ? "Ask about skin, ingredients, routines…" : "Ask about training, recovery, skincare, habits…"}
            className="input max-h-40 min-h-[44px] resize-none"
          />
          <button disabled={busy || !input.trim()} className="btn-primary h-11 w-11 shrink-0 p-0" aria-label="Send">{busy ? <Spinner /> : <ArrowUp size={18} />}</button>
        </div>
        <p className="mt-2 text-center text-[11px] text-dim">Educational guidance, not medical advice. For health concerns, consult a qualified professional.</p>
      </form>
    </div>
  );
}
