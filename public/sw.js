// APEX service worker: caches only static build assets for fast launches.
// API responses, pages with personal data and photos are never cached.
const CACHE = "apex-static-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/mediapipe/");
  if (isStatic) {
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })));
  } else if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => new Response(
      '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="background:#07080a;color:#eceef2;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><p style="letter-spacing:.3em;font-size:13px">APEX·AI</p><h1 style="font-weight:600">You\'re offline</h1><p style="color:#969ca8">Reconnect to sync your training and routines.</p></div>',
      { headers: { "Content-Type": "text/html" } })));
  }
});
