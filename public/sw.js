const CACHE_NAME = 'xacto-v3-coral'
const SHELL_URLS = ['/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Wipe ALL old caches, regardless of name, on the v3 upgrade
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key === CACHE_NAME ? null : caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Network-first for everything, with cache as offline fallback only
  // (was cache-first for assets — that pinned old CSS/JS bundles after a deploy)
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Cache successful navigation responses for offline shell
        if (event.request.mode === 'navigate' && res.ok) {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put('/', copy))
        }
        return res
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  )
})
