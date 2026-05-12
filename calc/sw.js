// Назва кешу для версійності
const CACHE_NAME = 'calc-v1.0';
const ASSETS = [
  'index.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Кешування ресурсів...');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
