// Offline and update handling for the Web build (ADR-0003, STORY-009). Unity fills in the template macros at build time.
// The cache name carries the build time, so every build (code, data or template change) gets its own cache.
const cachePrefix = "space-sim-";
const cacheName = cachePrefix + "1.0-2026-10-26T15:17:54.867Z";
const pageUrl = "index.html";
const precacheUrls = [
    pageUrl,
    "manifest.webmanifest",
    "Build/25247b8b226a811ba3582c4a020e733f.loader.js",
    "Build/57a7dd781cf8cd25f837ec6dbb5ec82f.framework.js",
    "Build/e0511c0c8028168cb2611a2e0a2a3ee7.data",
    "Build/388d9b1b6454ca2e4d33cbddf3f59e67.wasm",
    "TemplateData/style.css",
    "TemplateData/favicon.ico",
    "TemplateData/icons/icon-192.png",
    "TemplateData/icons/icon-512.png",
    "TemplateData/unity-logo-dark.png",
    "TemplateData/progress-bar-empty-dark.png",
    "TemplateData/progress-bar-full-dark.png",
    // BuildScript replaces the next line with the StreamingAssets files (Addressables).
    "StreamingAssets/aa/AddressablesLink/link.xml",
    "StreamingAssets/aa/catalog.bin",
    "StreamingAssets/aa/catalog.hash",
    "StreamingAssets/aa/settings.json",
];

// Precache the whole build, including the page, so one visit is enough for offline play.
// No skipWaiting(): a new version waits until every window of the old one is closed, then starts on the next launch.
self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        // "reload" skips the HTTP cache, so a new version never precaches the previous page.
        await cache.addAll(precacheUrls.map((url) => new Request(url, { cache: "reload" })));
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names
            .filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
            .map((name) => caches.delete(name)));
    })());
});

// Cache first from this version's cache, so the page and its build files always match.
// Anything else on our origin is cached on its first full (200) load once this worker controls the page.
self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
    event.respondWith((async () => {
        const cache = await caches.open(cacheName);
        const isPage = request.mode === "navigate";
        const cached = await cache.match(isPage ? pageUrl : request, { ignoreSearch: isPage });
        if (cached) return cached;
        const response = await fetch(request);
        if (response.status === 200 && !isPage) event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
        return response;
    })());
});
