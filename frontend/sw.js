// ── NHAI PWA Service Worker ────────────────────────────────────────────────────
const CACHE_NAME    = "nhai-auth-v1";
const API_ORIGIN    = "http://10.142.200.236:8000";

// Files to cache for offline use
const STATIC_ASSETS = [
  "/index.html",
  "/register.html",
  "/registered_employees.html",
  "/dashboard.html",
  "/offline.html",
  "/liveness.html",
  "/script.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap"
];

// ── Install: cache all static assets ──────────────────────────────────────────
self.addEventListener("install", event => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Caching static assets");
      // Cache one by one so a single failure doesn't break everything
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(e => console.warn("[SW] Failed to cache:", url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ─────────────────────────────────────────────────
self.addEventListener("activate", event => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log("[SW] Deleting old cache:", k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for static ──────────────────────
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Skip WebSocket requests — service worker can't handle ws://
  if (event.request.url.startsWith("ws://") || event.request.url.startsWith("wss://")) {
    return;
  }

  // API requests → network only (never cache API responses)
  if (url.origin === API_ORIGIN) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ status: "offline", message: "No network — API unavailable" }),
          { headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // Google Fonts → cache first, fallback to network
  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      }))
    );
    return;
  }

  // Static assets → cache first, then network, then offline page
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(res => {
        // Cache successful GET responses
        if (res.ok && event.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/index.html");
        }
      });
    })
  );
});

// ── Background Sync: retry failed attendance marks ─────────────────────────────
self.addEventListener("sync", event => {
  if (event.tag === "sync-attendance") {
    event.waitUntil(syncPendingAttendance());
  }
});

async function syncPendingAttendance() {
  try {
    const db       = await openDB();
    const pending  = await getAllPending(db);
    for (const record of pending) {
      try {
        const res = await fetch(`${API_ORIGIN}/mark-attendance-offline`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(record)
        });
        if (res.ok) await deleteRecord(db, record.id);
      } catch (e) {
        console.warn("[SW] Sync failed for record", record.id);
      }
    }
  } catch (e) {
    console.warn("[SW] Background sync error:", e);
  }
}

// ── Push Notifications ─────────────────────────────────────────────────────────
self.addEventListener("push", event => {
  const data = event.data?.json() || { title: "NHAI Auth", body: "Notification" };
  event.waitUntil(
    self.registration.showNotification(data.title || "NHAI Auth", {
      body:    data.body || "",
      icon:    "/icons/icon-192.png",
      badge:   "/icons/icon-72.png",
      vibrate: [200, 100, 200],
      data:    { url: data.url || "/index.html" }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      const url = event.notification.data?.url || "/index.html";
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Simple IndexedDB helpers for offline queue ─────────────────────────────────
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("nhai-offline", 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e);
  });
}
function getAllPending(db) {
  return new Promise((res, rej) => {
    const tx  = db.transaction("pending", "readonly");
    const req = tx.objectStore("pending").getAll();
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e);
  });
}
function deleteRecord(db, id) {
  return new Promise((res, rej) => {
    const tx  = db.transaction("pending", "readwrite");
    const req = tx.objectStore("pending").delete(id);
    req.onsuccess = () => res();
    req.onerror   = e => rej(e);
  });
}
