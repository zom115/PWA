const cacheName = 'pwa_cache_test'
const urlsToCache = [
  './',
  '/sw.js'
]
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(urlsToCache)
    })
  )
})
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response ? response : fetch(event.request)
    })
  )
})