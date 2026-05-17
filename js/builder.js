/**
 * Модуль для збирання готового коду мікрододатків та генерації PWA-метаданих
 */

export const BuilderService = {
    /**
     * Генерує повноцінний HTML-код додатка, готовий до запуску в iframe або автономно
     * @param {Object} appData - Об'єкт із даними додатка від GeminiService
     * @returns {string} - Повний HTML-документ
     */
    buildHtml(appData) {
        // Перетворюємо базу даних на рядок для безпечного впровадження в тег <script>
        const dbString = JSON.stringify(appData.database, null, 2);
        
        // Повертаємо готовий шаблон сторінки
        return `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appData.title}</title>
    <!-- Підключаємо Tailwind CSS для стилізації згенерованого додатка -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Підключаємо іконки -->
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <style>
        body { background-color: #f9fafb; }
        /* Плавна анімація для появи результатів */
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="p-4 max-w-xl mx-auto min-h-screen flex flex-col justify-between">

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <!-- Хедер згенерованого додатка -->
        <header class="text-center space-y-1">
            <div class="w-16 h-16 mx-auto flex items-center justify-center mb-2">
                ${appData.icon}
            </div>
            <h1 class="text-xl font-bold text-gray-900">${appData.title}</h1>
            <p class="text-xs text-gray-500">${appData.prompt}</p>
        </header>

        <!-- Форма інтерфейсу, яку спроєктував ШІ -->
        <form id="app-form" class="space-y-4">
            ${appData.ui.html_form || this._fallbackUiRender(appData.ui)}
        </form>

        <!-- Блок виведення результатів розрахунку -->
        <div id="result-container" class="hidden bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-3 fade-in">
            <h3 class="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                <i class="ph ph-calculator text-lg"></i> Результат розрахунку:
            </h3>
            <div id="result-content" class="text-gray-800 text-sm space-y-2">
                <!-- Сюди JS підставить деталізований кошторис або фінальну суму -->
            </div>
        </div>
    </div>

    <footer class="text-center py-4 text-[10px] text-gray-400">
        Згенеровано платформою "Архітектор"
    </footer>

    <!-- Головна логіка додатка -->
    <script>
        // Впроваджуємо згенеровану ШІ базу знань/констант
        const APP_DATABASE = ${dbString};

        // Впроваджуємо математичну функцію обчислення від ШІ
        ${appData.logic}

        // Елементи інтерфейсу
        const form = document.getElementById('app-form');
        const resultContainer = document.getElementById('result-container');
        const resultContent = document.getElementById('result-content');

        // Функція збору даних із полів форми та запуску розрахунку
        function runCalculation() {
            const formData = new FormData(form);
            const userData = {};

            // Збираємо значення всіх полів (input, select, checkbox)
            for (let [key, value] of formData.entries()) {
                // Якщо значення схоже на число, конвертуємо його
                userData[key] = !isNaN(value) && value !== '' ? Number(value) : value;
            }

            // Також обробляємо чекбокси, які не були відмічені (FormData їх ігнорує)
            form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                if (!checkbox.checked && checkbox.name) {
                    userData[checkbox.name] = false;
                } else if (checkbox.checked && checkbox.name) {
                    userData[checkbox.name] = true;
                }
            });

            try {
                // Викликаємо впроваджену функцію calculate
                const result = calculate(userData, APP_DATABASE);
                renderResult(result);
            } catch (error) {
                console.error("Помилка обчислень:", error);
            }
        }

        // Функція виведення результатів на екран
        function renderResult(result) {
            resultContainer.classList.remove('hidden');
            
            if (typeof result === 'object' && result !== null) {
                // Якщо ШІ повернув об'єкт (наприклад, детальний кошторис)
                let html = '';
                if (result.details && Array.isArray(result.details)) {
                    result.details.forEach(item => {
                        html += \`<div class="flex justify-between border-b border-indigo-100 pb-1">
                            <span class="text-gray-600">\${item.label}</span>
                            <span class="font-medium text-gray-950">\${item.value}</span>
                        </div>\`;
                    });
                }
                if (result.total !== undefined) {
                    html += \`<div class="flex justify-between pt-2 text-base font-bold text-indigo-950">
                        <span>Всього:</span>
                        <span>\${result.total}</span>
                    </div>\`;
                }
                resultContent.innerHTML = html || JSON.stringify(result, null, 2);
            } else {
                // Якщо ШІ повернув просто одне число або рядок
                resultContent.innerHTML = \`<div class="text-lg font-bold text-indigo-950 text-center">\${result}</div>\`;
            }
        }

        // Навішуємо автоматичний перерахунок при будь-якій зміні у формі
        form.addEventListener('input', runCalculation);
        form.addEventListener('change', runCalculation);

        // Запускаємо первинний розрахунок відразу після завантаження сторінки
        window.addEventListener('DOMContentLoaded', runCalculation);
    </script>
</body>
</html>
        `;
    },

    /**
     * Резервний рендеринг форми, якщо ШІ повернув структуру полів у JSON замість готового HTML
     */
    _fallbackUiRender(uiData) {
        if (!uiData.fields || !Array.isArray(uiData.fields)) return '<!-- Помилка генерації форми -->';
        
        return uiData.fields.map(field => {
            const label = `<label class="block text-xs font-semibold text-gray-600 mb-1">${field.label}</label>`;
            let input = '';

            if (field.type === 'select') {
                const options = field.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
                input = `<select name="${field.name}" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500">${options}</select>`;
            } else if (field.type === 'checkbox') {
                return `
                    <label class="flex items-center gap-3 cursor-pointer py-1">
                        <input type="checkbox" name="${field.name}" class="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500">
                        <span class="text-sm text-gray-700">${field.label}</span>
                    </label>
                `;
            } else {
                input = `<input type="${field.type || 'text'}" name="${field.name}" value="${field.defaultValue || ''}" min="${field.min || ''}" max="${field.max || ''}" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500">`;
            }

            return `<div>${label}${input}</div>`;
        }).join('');
    },

    /**
     * Генерує текст файлу manifest.json для згенерованого PWA додатка
     */
    generateManifest(appData) {
        return JSON.stringify({
            "short_name": appData.title.substring(0, 12),
            "name": appData.title,
            "start_url": "index.html",
            "background_color": "#ffffff",
            "theme_color": "#4f46e5",
            "display": "standalone",
            "orientation": "portrait",
            "icons": [
                {
                    "src": "icon.svg",
                    "type": "image/svg+xml",
                    "sizes": "any",
                    "purpose": "any"
                }
            ]
        }, null, 2);
    },

    /**
     * Генерує базовий Service Worker для забезпечення офлайн-роботи згенерованого додатка
     */
    generateServiceWorker(appId) {
        return `
const CACHE_NAME = 'pwa-cache-${appId}';
const ASSETS = [
  'index.html',
  'manifest.json',
  'icon.svg',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@phosphor-icons/web'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
        `;
    }
};
