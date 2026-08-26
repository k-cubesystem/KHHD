// 해화당 Service Worker — basic offline support
//
// 🔴 CACHE_VERSION 은 **원격 강제 새로고침 레버**이기도 하다(2026-08-25 실전 투입).
//    sw.js 바이트가 바뀌면 sw-register 의 updatefound → statechange(installed) 훅이
//    window.location.reload() 를 부른다 — 하루 종일 안 닫힌 탭·PWA 가 옛 번들·옛 RSC 데이터로
//    도는 사고(신위 상반신 사고의 전파 경로)를 배포만으로 끊을 수 있는 유일한 길이다.
//    큰 화면 수정을 배포했는데 «그대로예요»가 돌아오면 이 버전을 올려라.
const CACHE_VERSION = 'v9'
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

// ── Push: 신탁 알림 ───────────────────────────────────────────────────────────
// 서버가 보내는 본문은 lib/services/webpush.ts 의 PushPayload JSON.
// 본문이 깨졌거나 비어도 알림은 반드시 떠야 한다 — userVisibleOnly 구독이라
// showNotification 을 부르지 않으면 브라우저가 구독을 취소한다.
const DEFAULT_PUSH_TITLE = '청담해화당'
const DEFAULT_PUSH_URL = '/protected/notifications'

self.addEventListener('push', (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { body: event.data.text() }
    }
  }

  const title = typeof payload.title === 'string' && payload.title ? payload.title : DEFAULT_PUSH_TITLE
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : DEFAULT_PUSH_URL

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === 'string' ? payload.body : '',
      icon: '/app-icon.png',
      badge: '/app-icon.png',
      tag: typeof payload.tag === 'string' && payload.tag ? payload.tag : 'haehwadang',
      renotify: true,
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || DEFAULT_PUSH_URL

  // 이미 열려 있는 탭이 있으면 그 탭을 쓴다 — 탭이 계속 늘어나지 않게.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (!('focus' in client)) continue
        const samePage = new URL(client.url, self.location.origin).pathname === target
        if (samePage) return client.focus()
        if ('navigate' in client) return client.navigate(target).then((navigated) => (navigated || client).focus())
      }
      return self.clients.openWindow(target)
    })
  )
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
