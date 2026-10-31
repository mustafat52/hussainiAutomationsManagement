// Minimal service worker so the app is installable on a phone.
// It deliberately caches NO data — your projects and financials always come
// live from Supabase. If you're offline you just get a short notice.

const OFFLINE_HTML = `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0b0f;color:#9298ab;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div><p style="color:#e9eaef;font-size:18px;margin:0 0 8px">You're offline</p>
<p style="margin:0">Project Hub needs a connection. Reconnect and reopen the app.</p></div>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } })
    )
  );
});
