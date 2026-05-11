// Назва кешу для версійності
const CACHE_NAME = 'calc-v3';
const ASSETS = [
  'index.html'
];

// Встановлення та кешування
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Робота в офлайн-режимі
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

self.addEventListener('install', (event) => {
    // Змушує новий SW активуватися відразу
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Очищення старого кешу
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Негайно беремо контроль над сторінкою
    );
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Коли новий SW встановлено, просто перезавантажуємо сторінку
                    window.location.reload();
                }
            });
        });
    });
}
