/**
 * Digital Pandharpur — Service Worker
 *
 * Cache strategy:
 * - Navigation (pages): Network-first, fallback to cache, offline fallback page
 * - Static assets (JS/CSS/fonts): Cache-first (versioned)
 * - API calls: Network-only (fresh data needed)
 * - Images: Cache-first, stale-while-revalidate for updates
 * - Icons/manifest: Cache-first
 */

const CACHE_NAMES = {
  static: 'static-v1',
  pages: 'pages-v1',
  images: 'images-v1',
  fonts: 'fonts-v1',
  api: 'api-v1',
};

const STATIC_ASSETS = [
  '/',
  '/offline',
];

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !Object.values(CACHE_NAMES).includes(key))
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http(s)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // API calls — network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Static assets from _next/static — cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/static/')) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
    return;
  }

  // Fonts — cache-first (they change rarely)
  if (url.pathname.includes('.woff') || url.pathname.includes('.woff2') || url.pathname.includes('.ttf')) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.fonts));
    return;
  }

  // Icons and images — cache-first, update in background
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)
  ) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.images));
    return;
  }

  // Navigation / pages — network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Default — network-only
  event.respondWith(networkOnly(request));
});

// ── Cache Strategies ─────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      caches.open(cacheName).then((cache) => cache.put(request, response.clone()));
    }
    return response;
  }).catch((err) => {
    if (cached) return cached;
    throw err;
  });

  return cached ?? fetchPromise;
}

async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.pages);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) return offlineResponse;

    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Push Notification ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body ?? 'Daily Abhang from Digital Pandharpur',
      icon: data.icon ?? '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url ?? '/',
      },
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title ?? 'डिजिटल पंढरपूर',
        options,
      ),
    );
  } catch {
    // Ignore malformed push data
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
