"use client";
/**
 * On-device request router. The UI keeps calling `/api/...` URLs; instead of going to a
 * server, each request is dispatched to the matching handler module running in the browser.
 */
import { initDb, flush } from "./db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: Request, ctx: { params: Promise<any> }) => Promise<Response>;
type Mod = Partial<Record<"GET" | "POST" | "PATCH" | "DELETE", Handler>>;

const ROUTES: [RegExp, string[], () => Promise<Mod>][] = [
  [/^\/api\/account\/export$/, [], () => import("@/localapi/account/export/route")],
  [/^\/api\/account$/, [], () => import("@/localapi/account/route")],
  [/^\/api\/analyses\/([^/]+)\/([^/]+)$/, ["kind", "id"], () => import("@/localapi/analyses/[kind]/[id]/route")],
  [/^\/api\/body\/analyze$/, [], () => import("@/localapi/body/analyze/route")],
  [/^\/api\/coach$/, [], () => import("@/localapi/coach/route")],
  [/^\/api\/daily$/, [], () => import("@/localapi/daily/route")],
  [/^\/api\/face\/analyze$/, [], () => import("@/localapi/face/analyze/route")],
  [/^\/api\/goals$/, [], () => import("@/localapi/goals/route")],
  [/^\/api\/habits$/, [], () => import("@/localapi/habits/route")],
  [/^\/api\/memories$/, [], () => import("@/localapi/memories/route")],
  [/^\/api\/photos\/([^/]+)$/, ["id"], () => import("@/localapi/photos/[id]/route")],
  [/^\/api\/profile$/, [], () => import("@/localapi/profile/route")],
  [/^\/api\/program\/emphasis$/, [], () => import("@/localapi/program/emphasis/route")],
  [/^\/api\/program$/, [], () => import("@/localapi/program/route")],
  [/^\/api\/recovery$/, [], () => import("@/localapi/recovery/route")],
  [/^\/api\/skincare\/log$/, [], () => import("@/localapi/skincare/log/route")],
  [/^\/api\/skincare\/routine$/, [], () => import("@/localapi/skincare/routine/route")],
  [/^\/api\/workouts\/([^/]+)$/, ["id"], () => import("@/localapi/workouts/[id]/route")],
  [/^\/api\/workouts$/, [], () => import("@/localapi/workouts/route")],
  [/^\/api\/setup$/, [], () => import("@/localapi/setup/route")],
];

export async function localFetch(url: string, init: RequestInit = {}): Promise<Response> {
  await initDb();
  const u = new URL(url, "http://apex.local");
  const method = (init.method ?? "GET").toUpperCase() as keyof Mod;
  for (const [re, names, load] of ROUTES) {
    const m = re.exec(u.pathname);
    if (!m) continue;
    const mod = await load();
    const h = mod[method];
    if (!h) return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    const params = Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
    const res = await h(new Request(u, { ...init, method }), { params: Promise.resolve(params) });
    // Writes are committed to on-device storage before the UI hears "done", so closing the
    // app right after saving can't lose data.
    if (method !== "GET") await flush();
    return res;
  }
  return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
}
