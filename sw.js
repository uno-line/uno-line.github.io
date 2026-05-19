// Назва кеш-сховища для контролю версій нашого PWA
const CACHE_NAME = 'app-factory-v6';

// Масив локальних ресурсів оболонки, які необхідно зберегти в пам'ять пристрою
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Етап інсталяції сервіс-воркера: завантажуємо та кешуємо ядро інтерфейсу
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Фабрика додатків: Кешування основних ресурсів для роботи офлайн');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Змушуємо новий воркер активуватися негайно
});

// Етап активації: видаляємо старі версії кешу, якщо вони існували раніше
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Фабрика додатків: Видалення застарілого кешу', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Перебираємо керування поточними відкритими вкладками
});

// Стратегія обробки запитів: Перехоплюємо та видаємо файли оболонки з кешу
self.addEventListener('fetch', (event) => {
  // КРИТИЧНО: Запити до шлюзу Google Gemini API мають завжди йти напряму в мережу, їх кешувати не можна
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Якщо файл знайдено в локальному кеші — повертаємо його без звернення до мережі
      if (cachedResponse) {
        return cachedResponse;
      }
      // Якщо файлу в кеші немає, робимо стандартний запит в інтернет
      return fetch(event.request).catch(() => {
        console.log('Ресурс відсутній у кеші і мережа зараз недоступна');
      });
    })
  );
});
