const CACHE_NAME = 'waqt-v1'

// Files to cache for offline — Vite's built assets are hashed,
// so we cache the shell routes that always work offline
const SHELL_ROUTES = ['/', '/nearby', '/subscriptions', '/settings']

// ── Install: cache app shell ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ROUTES))
  )
  self.skipWaiting()
})

// ── Activate: clean up old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first for API, cache-first for assets ──
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Always go network-first for API calls
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // Cache-first for everything else (assets, pages)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        // Cache successful GET responses
        if (request.method === 'GET' && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return response
      })
    })
  )
})

// ── Push: show notification ──
self.addEventListener('push', event => {
  if (!event.data) return
  const { title, body, mosque_id } = event.data.json()

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      data:  { mosque_id },
      vibrate: [100, 50, 100],
    })
  )
})

// ── Notification click: open mosque detail ──
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const { mosque_id } = event.notification.data ?? {}
  const target = mosque_id ? `/mosque/${mosque_id}` : '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(target))
      if (existing) return existing.focus()
      return clients.openWindow(target)
    })
  )
})