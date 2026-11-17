"use client";
import { useRef, useState } from "react";
import { Download, Upload, Trash2, KeyRound, Check, Database } from "lucide-react";
import { api } from "@/lib/client";
import { localFetch } from "@/lib/local-fetch";
import { exportDb, replaceDb } from "@/lib/db";
import { getApiKey, setApiKey } from "@/lib/ai";
import { BASE } from "@/lib/base";
import { Notice } from "@/components/ui";

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** AI key, backup/restore and erase controls for the on-device build. */
export function DeviceData({ onChange }: { onChange: () => void }) {
  const [key, setKey] = useState(() => (getApiKey() ? "••••••••••••" + (getApiKey() ?? "").slice(-4) : ""));
  const [hasKey, setHasKey] = useState(!!getApiKey());
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const stamp = () => new Date().toISOString().slice(0, 10);

  return (
    <>
      <section className="card card-pad space-y-3">
        <h2 className="h2 flex items-center gap-2"><KeyRound size={18} className="text-accent" /> AI</h2>
        <p className="text-sm text-muted">
          Face analysis, ratings, the physique scan and the chat coach use your own Anthropic API key. It&apos;s stored only on this device, and requests go
          straight from your phone to Anthropic. Usage is billed to your Anthropic account. Get a key at console.anthropic.com → API keys.
        </p>
        <div className="flex gap-2">
          <input className="input font-mono" type="password" autoComplete="off" placeholder="sk-ant-…" value={key} onFocus={() => hasKey && setKey("")} onChange={(e) => setKey(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={!key || key.startsWith("•")} onClick={() => { setApiKey(key); setHasKey(true); setKey("••••••••••••" + key.trim().slice(-4)); setMsg({ tone: "ok", text: "API key saved on this device." }); onChange(); }}>
            <Check size={16} /> Save
          </button>
        </div>
        {hasKey && <button className="text-xs text-muted hover:text-bad" onClick={() => { setApiKey(null); setHasKey(false); setKey(""); onChange(); }}>Remove key</button>}
      </section>

      <section className="card card-pad space-y-3">
        <h2 className="h2 flex items-center gap-2"><Database size={18} className="text-accent" /> Your data on this device</h2>
        <p className="text-sm text-muted">
          Everything lives on this phone, so back it up now and then. Deleting the home-screen app or clearing Safari/Chrome website data erases it.
          Backups include workouts, routines, habits and reports (not photos).
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost text-xs" onClick={() => { download(`apex-backup-${stamp()}.apex`, new Blob([exportDb() as BlobPart], { type: "application/octet-stream" })); setMsg({ tone: "ok", text: "Backup downloaded. Keep it somewhere safe, like Files or iCloud Drive." }); }}>
            <Download size={14} /> Download backup
          </button>
          <button className="btn-ghost text-xs" onClick={() => file.current?.click()}><Upload size={14} /> Restore backup</button>
          <input ref={file} type="file" accept=".apex,application/octet-stream" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f || !confirm("Restore this backup? It replaces everything currently on this device.")) return;
            try { await replaceDb(new Uint8Array(await f.arrayBuffer())); setMsg({ tone: "ok", text: "Backup restored." }); onChange(); }
            catch { setMsg({ tone: "bad", text: "That file isn't a valid APEX backup." }); }
          }} />
          <button className="btn-ghost text-xs" onClick={async () => { const r = await localFetch("/api/account/export"); download(`apex-export-${stamp()}.json`, await r.blob()); }}>
            <Download size={14} /> Export as JSON
          </button>
          <button className="btn-ghost text-xs" onClick={async () => { if (confirm("Delete ALL saved photos permanently? Analyses keep their text reports.")) { await api("/api/account?scope=photos", { method: "DELETE" }); onChange(); } }}>
            <Trash2 size={14} /> Delete all photos
          </button>
          <button className="btn-danger text-xs" onClick={async () => {
            if (!confirm("Erase EVERYTHING APEX stores on this device? This can't be undone. Download a backup first if you might want it.")) return;
            await api("/api/account", { method: "DELETE" });
            setApiKey(null);
            window.location.href = `${BASE}/`;
          }}>
            <Trash2 size={14} /> Erase everything
          </button>
        </div>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </section>
    </>
  );
}
