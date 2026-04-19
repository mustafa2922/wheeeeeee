// ── Activate: WIPE all caches and take control ──
// This ensures that old cached versions of the app represent a clean slate.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  )
  self.clients.claim()
})

// ── Push: show notification ──
// We keep this so the broadcast feature still works
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