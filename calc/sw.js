// Назва кешу для версійності
const CACHE_NAME = 'calc-v2';
const ASSETS = [
  'index.html',
  '../simple-style.css'
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
