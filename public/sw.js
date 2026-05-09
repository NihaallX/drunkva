// Drunkva Service Worker v5
const CACHE_NAME = "drunkva-v5";
// Separate cache for Next.js static chunks — these are content-hashed and
// immutable, so we can serve them from cache indefinitely and revalidate lazily.
const CHUNK_CACHE_NAME = "drunkva-chunks-v5";

// Only cache truly static/public assets — NOT auth-protected pages
const STATIC_ASSETS = [
  "/icons/drunkva-192.png",
  "/icons/drunkva-512.png",
  "/manifest.json",
  "/offline.html",
];
const OFFLINE_DB_NAME = "drunkva-offline";
const OFFLINE_STORE_NAME = "action-queue";
const OFFLINE_SYNC_TAG = "sync-offline-queue";

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

  // For navigation requests (HTML pages) — always try network first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Never intercept: cross-origin, API calls, or Clerk requests
  if (
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
  if (event.tag === OFFLINE_SYNC_TAG || event.tag === "sync-drinks") {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  let db;
  try {
    db = await openOfflineDB();
  } catch {
    return;
  }

  const tx = db.transaction(OFFLINE_STORE_NAME, "readwrite");
  const store = tx.objectStore(OFFLINE_STORE_NAME);
  const actions = await new Promise((res, rej) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = rej;
  });

  const sorted = Array.isArray(actions)
    ? actions.sort((a, b) => Number(a?.queuedAt ?? 0) - Number(b?.queuedAt ?? 0))
    : [];

  for (const action of sorted) {
    if (!action?.id || !action?.endpoint || !action?.method) {
      continue;
    }

    try {
      const res = await fetch(action.endpoint, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.payload ?? {}),
      });

      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await new Promise((res, rej) => {
          const req = store.delete(action.id);
          req.onsuccess = res;
          req.onerror = rej;
        });
      }
    } catch {
      // Retry on next sync
    }
  }
}

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

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
