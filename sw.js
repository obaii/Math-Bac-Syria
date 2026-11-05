const CACHE_NAME = "math-bac-syria-v80";
const CORE_FILES = [
  "./", "./index.html", "./security-utils.js", "./search-utils.js", "./style.css", "./style-overrides.css", "./student-tools.css",
  "./app.js", "./questions.js", "./questions_vectors_additional.js", "./questions_typed_additional.js", "./question-diagrams.js",
  "./merge-questions.js", "./solution-guides.js", "./solved-examples.js", "./solved-examples.css", "./enhancements.js", "./math-assistant.css", "./math-assistant.js", "./scientific-calculator.js", "./function-plotter.js", "./geometry-tools.js", "./formula-library.js", "./flashcards.js",
  "./manifest.webmanifest", "./pwa-install.js", "./onboarding.js", "./assets/icon.svg", "./assets/icon-192.png", "./assets/icon-512.png"
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

    // Prefer the latest deployed asset whenever online, but retain a cached
    // copy as an offline fallback. Ignore query strings for versioned assets.
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          } catch (_) {}
        }
        return response;
      } catch (error) {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/mathjax@3/")) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()).catch(() => {}));
      return response;
    })));
  }
});
