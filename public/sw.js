// APEX service worker: lets the installed app open offline. Caches only the app's own files
// (code, icons, WASM). Your data lives in on-device storage, never in this cache.
const CACHE = "apex-v2";
const scope = new URL(self.registration.scope).pathname; // e.g. "/Apex-AI/"
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([scope, scope + "home/", scope + "sqljs/sql-wasm-browser.wasm"]).catch(() => {})));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || !url.pathname.startsWith(scope)) return;
  const immutable = url.pathname.includes("/_next/static/") || url.pathname.includes("/mediapipe/") || url.pathname.includes("/sqljs/") || url.pathname.includes("/icons/");
  if (immutable) {
    // Cache-first for versioned assets.
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })));
  } else {
    // Network-first for pages so updates arrive; fall back to cache offline.
    e.respondWith(fetch(e.request).then((r) => { if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone())); return r; })
      .catch(async () => (await caches.match(e.request)) || (await caches.match(scope + "home/")) || Response.error()));
  }
});
