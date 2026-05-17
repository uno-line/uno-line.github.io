/**
 * Service Worker для головного застосунку "Архітектор"
 */

// Назва кешу (змінюй версію при оновленні коду, щоб скинути кеш у користувачів)
const CACHE_NAME = 'architect-core-v1';

// Список локальних файлів та CDN, які потрібно зберегти в пам'яті смартфона
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './js/app.js',
    './js/storage.js',
    './js/gemini.js',
    './js/builder.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/@phosphor-icons/web'
];

// Етап встановлення: записуємо всі ресурси в кеш
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Етап активації: видаляємо старі версії кешу, якщо вони є
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// Перехоплення запитів: спочатку беремо файли з кешу, якщо немає — йдемо в мережу
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});
