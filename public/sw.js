// 해화당 Service Worker — basic offline support
const CACHE_VERSION = 'v1'
const STATIC_CACHE = `haehwadang-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `haehwadang-dynamic-${CACHE_VERSION}`

// Static assets to pre-cache on install
const PRECACHE_URLS = ['/offline.html', '/manifest.json', '/app-icon.png']

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests (skip cross-origin, non-GET)
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Skip Next.js HMR / dev requests
  if (url.pathname.startsWith('/_next/webpack-hmr') || url.pathname.startsWith('/__nextjs')) {
    return
  }

  // ── Strategy A: Cache-first for static assets ────────────────────────────
  // /_next/static/ (JS/CSS chunks), /images/, fonts loaded from same origin
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/avatars/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|otf)$/)
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // ── Strategy B: Network-first for API calls ──────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // ── Strategy C: Network-first for HTML pages, offline fallback ───────────
  event.respondWith(networkFirstWithOfflineFallback(request))
})

// ── Cache-first helper ────────────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    // No cached version and network failed — nothing we can do for static assets
    return new Response('Resource unavailable offline', { status: 503 })
  }
}

// ── Network-first helper ──────────────────────────────────────────────────────
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'Network unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ── Network-first with offline HTML fallback ──────────────────────────────────
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request)
    // Cache successful page responses in the dynamic cache
    if (networkResponse.ok && request.headers.get('accept')?.includes('text/html')) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    // Last resort: serve the offline page
    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) return offlinePage

    return new Response('<h1>오프라인 상태입니다</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
