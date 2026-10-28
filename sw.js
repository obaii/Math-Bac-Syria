const CACHE_NAME = "math-bac-syria-v16";
const CORE_FILES = [
  "./", "./index.html", "./style.css", "./style-overrides.css",
  "./app.js", "./questions.js", "./questions_vectors_additional.js",
  "./merge-questions.js", "./solution-guides.js", "./enhancements.js",
  "./manifest.webmanifest", "./pwa-install.js", "./assets/icon.svg"
];
const MATHJAX_URL = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE_FILES.map(async file => {
      const request = new Request(file, { cache: "reload" });
      const response = await fetch(request);
      if (!response.ok) throw new Error("تعذر تحميل ملف أساسي: " + file);
      await cache.put(file, response);
    }));
    try {
      const response = await fetch(MATHJAX_URL, { mode: "no-cors", cache: "reload" });
      await cache.put(MATHJAX_URL, response);
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("math-bac-syria-") && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      event.respondWith(fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match("./index.html"))));
      return;
    }
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/mathjax@3/")) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()).catch(() => {}));
      return response;
    })));
  }
});
