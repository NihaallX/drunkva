// Drunkva Service Worker v3
const CACHE_NAME = "drunkva-v3";
// Separate cache for Next.js static chunks — these are content-hashed and
// immutable, so we can serve them from cache indefinitely and revalidate lazily.
const CHUNK_CACHE_NAME = "drunkva-chunks-v3";

// Only cache truly static/public assets — NOT auth-protected pages
const STATIC_ASSETS = [
  "/icons/drunkva-192.png",
  "/icons/drunkva-512.png",
  "/manifest.json",
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const VALID_CACHES = new Set([CACHE_NAME, CHUNK_CACHE_NAME]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !VALID_CACHES.has(k)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept: navigation requests (page loads), cross-origin,
  // API calls, or Clerk requests
  if (
    request.mode === "navigate" ||
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.hostname !== self.location.hostname
  ) {
    return; // Let the browser/network handle it natively
  }

  // Next.js static chunks — content-hashed filenames → immutable → cache-first
  // with background revalidation (stale-while-revalidate).
  // This covers JS, CSS, and media from /_next/static/.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CHUNK_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        // Serve from cache immediately, then revalidate in background
        const fetchPromise = fetch(request).then((networkRes) => {
          if (networkRes.ok) cache.put(request, networkRes.clone());
          return networkRes;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // /_next/image — network first (dynamic transformations, not immutable)
  if (url.pathname.startsWith("/_next/image")) {
    return; // network only
  }

  // For static icon/manifest assets: cache-first
  if (STATIC_ASSETS.some((a) => url.pathname === a)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Everything else: network only (no SW interference)
});

// ─── Background Sync (offline drink queue) ────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-drinks") {
    event.waitUntil(syncOfflineDrinks());
  }
});

async function syncOfflineDrinks() {
  let db;
  try {
    db = await openDB();
  } catch {
    return;
  }
  const tx = db.transaction("drunkva-offline-drinks", "readwrite");
  const store = tx.objectStore("drunkva-offline-drinks");
  const drinks = await new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = rej;
  });

  for (const drink of drinks) {
    try {
      const res = await fetch("/api/drinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drink),
      });
      if (res.ok) {
        await new Promise((res, rej) => {
          const req = store.delete(drink.id);
          req.onsuccess = res;
          req.onerror = rej;
        });
      }
    } catch {
      // Retry on next sync
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("drunkva-db", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("drunkva-offline-drinks")) {
        db.createObjectStore("drunkva-offline-drinks", { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  const { title, body, url } = data;

  event.waitUntil(
    self.registration.showNotification(title ?? "Drunkva", {
      body: body ?? "",
      icon: "/icons/drunkva-192.png",
      badge: "/icons/drunkva-192.png",
      data: { url: url ?? "/" },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const notifUrl = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(notifUrl));
      if (existing) return existing.focus();
      return self.clients.openWindow(notifUrl);
    })
  );
});
