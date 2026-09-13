const CACHE = 'anchor-v1';
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.json', 'icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('open-meteo.com') || e.request.url.includes('googleapis.com') || e.request.url.includes('gstatic.com')) {
    return; // always go to network for weather + fonts
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
