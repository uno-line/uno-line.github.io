
/**
 * Головний контролер застосунку "Архітектор"
 * Пов'язує UI, сховище, API Gemini та збирач додатків
 */
import { StorageService } from './storage.js';
import { GeminiService } from './gemini.js';
import { BuilderService } from './builder.js';

// Селектори елементів UI сторінки
const UI = {
    btnSettings: document.getElementById('btn-settings'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    modalSettings: document.getElementById('modal-settings'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    
    apiKeyInput: document.getElementById('api-key'),
    apiModelSelect: document.getElementById('api-model'),
    apiTempInput: document.getElementById('api-temp'),
    tempValueDisplay: document.getElementById('temp-value'),
    
    mainPrompt: document.getElementById('main-prompt'),
    btnGenerate: document.getElementById('btn-generate'),
    appsContainer: document.getElementById('apps-container'),
    
    previewContainer: document.getElementById('preview-container'),
    btnClosePreview: document.getElementById('btn-close-preview'),
    previewTitle: document.getElementById('preview-title'),
    appIframe: document.getElementById('app-iframe')
};

// Елемент динамічного вікна завантаження
let currentLoaderOverlay = null;

// Завантаження збережених налаштувань у поля форми
function initSettings() {
    const config = StorageService.getApiConfig();
    UI.apiKeyInput.value = config.key;
    UI.apiModelSelect.value = config.model;
    UI.apiTempInput.value = config.temperature;
    UI.tempValueDisplay.textContent = config.temperature;
}

// Налаштування та прив'язка обробників подій до елементів UI
function initEventListeners() {
    // Відкриття та закриття модального вікна налаштувань
    UI.btnSettings.addEventListener('click', () => UI.modalSettings.classList.remove('hidden'));
    UI.btnCloseSettings.addEventListener('click', () => UI.modalSettings.classList.add('hidden'));
    
    // Відображення поточного значення повзунка температури
    UI.apiTempInput.addEventListener('input', (e) => {
        UI.tempValueDisplay.textContent = e.target.value;
    });

    // Збереження конфігурації API в LocalStorage
    UI.btnSaveSettings.addEventListener('click', () => {
        const newConfig = {
            key: UI.apiKeyInput.value.trim(),
            model: UI.apiModelSelect.value,
            temperature: parseFloat(UI.apiTempInput.value)
        };
        StorageService.saveApiConfig(newConfig);
        UI.modalSettings.classList.add('hidden');
    });

    // Динамічний розрахунок висоти текстового поля під кількість рядків
    UI.mainPrompt.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 150) {
            this.style.overflowY = 'scroll';
            this.style.height = '150px';
        } else {
            this.style.overflowY = 'hidden';
        }
    });

    // Закриття вікна перегляду додатка та очищення пам'яті фрейму
    UI.btnClosePreview.addEventListener('click', () => {
        UI.previewContainer.classList.add('translate-x-full');
        UI.appIframe.srcdoc = ''; 
    });

    // Обробка запуску генерації мікрододатка
    UI.btnGenerate.addEventListener('click', handleGeneration);
}

/**
 * Логіка виконання багатоетапного конвеєра генерації ШІ
 */
async function handleGeneration() {
    const prompt = UI.mainPrompt.value.trim();
    if (!prompt) return;
    
    const apiConfig = StorageService.getApiConfig();
    if (!apiConfig.key) {
        alert('Будь ласка, спочатку введіть ваш Gemini API Key в налаштуваннях.');
        UI.modalSettings.classList.remove('hidden');
        return;
    }

    const promptsConfig = StorageService.getPromptsConfig();
    
    // Створення та активація оверлея прогресу
    showLoader('Запуск конвеєра "Архітектора"...');

    try {
        // Виклик багатоагентного пайплайну
        const newApp = await GeminiService.generateApp(
            prompt, 
            apiConfig, 
            promptsConfig, 
            (progress) => {
                // Оновлення тексту статусу на екрані при зміні ШІ-агента
                updateLoaderMessage(progress.message);
            }
        );

        // Запис результату роботи в базу даних пристрою
        StorageService.saveApp(newApp);
        
        // Скидання стану поля введення
        UI.mainPrompt.value = '';
        UI.mainPrompt.style.height = 'auto';

        // Оновлення списку карток додатків
        renderAppsList();
        
        // Закриття лоадера та миттєвий запуск створеного додатка
        hideLoader();
        openAppPreview(newApp);

    } catch (error) {
        hideLoader();
        alert(`Помилка генерації: ${error.message}. Перевірте правильність API-ключа або спробуйте іншу модель.`);
    }
}

/**
 * Рендеринг карток згенерованих додатків на головному екрані
 */
function renderAppsList() {
    const apps = StorageService.getApps();
    
    if (apps.length === 0) {
        UI.appsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                <i class="ph ph-squares-four text-4xl mb-2"></i>
                <p class="text-sm">У вас ще немає згенерованих додатків</p>
            </div>
        `;
        return;
    }

    UI.appsContainer.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            ${apps.map(app => `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center text-center justify-between cursor-pointer hover:border-indigo-500 transition-all group" data-id="${app.id}">
                    <div class="w-12 h-12 mb-3 flex items-center justify-center group-hover:scale-110 transition-transform">
                        ${app.icon}
                    </div>
                    <h3 class="text-xs font-bold text-gray-800 line-clamp-2 mb-3 w-full">${app.title}</h3>
                    <div class="flex gap-2 w-full justify-center">
                        <button class="btn-run p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm" title="Запустити">
                            <i class="ph ph-play font-bold"></i>
                        </button>
                        <button class="btn-download p-1.5 text-green-600 hover:bg-green-50 rounded-lg text-sm" title="Скачати HTML">
                            <i class="ph ph-download-simple"></i>
                        </button>
                        <button class="btn-delete p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm" title="Видалити">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Навішування подій управління на кожну створену картку
    UI.appsContainer.querySelectorAll('[data-id]').forEach(card => {
        const appId = card.dataset.id;
        const app = apps.find(a => a.id === appId);

        // Клік по картці запускає мікрододаток у фреймі
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete') || e.target.closest('.btn-download')) return;
            openAppPreview(app);
        });

        // Видалення картки зі сховища
        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Видалити додаток "${app.title}"?`)) {
                StorageService.deleteApp(appId);
                renderAppsList();
            }
        });

        // Експорт та завантаження автономного HTML-файлу
        card.querySelector('.btn-download').addEventListener('click', (e) => {
            e.stopPropagation();
            downloadStandaloneHtml(app);
        });
    });
}

/**
 * Запуск мікрододатка всередині ізольованого iframe
 */
function openAppPreview(app) {
    UI.previewTitle.textContent = app.title;
    
    // Збирання вихідного коду сторінки через BuilderService
    const finalHtml = BuilderService.buildHtml(app);
    
    // Впорскування коду в iframe
    UI.appIframe.srcdoc = finalHtml;
    
    // Анімація висування панелі прев'ю
    UI.previewContainer.classList.remove('translate-x-full');
}

/**
 * Завантаження додатка на пристрій у вигляді локального HTML-файлу
 */
function downloadStandaloneHtml(app) {
    const htmlContent = BuilderService.buildHtml(app);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app.title.replace(/\s+/g, '_')}_app.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Допоміжні функції керування повноекранним екраном завантаження
 */
function showLoader(initialMessage) {
    currentLoaderOverlay = document.createElement('div');
    currentLoaderOverlay.className = 'fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-6 text-white text-center';
    currentLoaderOverlay.innerHTML = `
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p id="loader-text" class="text-sm font-medium tracking-wide max-w-xs">${initialMessage}</p>
    `;
    document.body.appendChild(currentLoaderOverlay);
}

function updateLoaderMessage(message) {
    const textEl = document.getElementById('loader-text');
    if (textEl) textEl.textContent = message;
}

function hideLoader() {
    if (currentLoaderOverlay) {
        currentLoaderOverlay.remove();
        currentLoaderOverlay = null;
    }
}

/**
 * Головна функція ініціалізації систем додатка
 * Викликається відразу, оскільки тип скрипта — module
 */
function initApplication() {
    initSettings();
    initEventListeners();
    renderAppsList();
    
    // Реєстрація Service Worker програми Архітектор для роботи офлайн
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker програми Архітектор успішно запущено.'))
            .catch(err => console.error('Критична помилка реєстрації SW:', err));
    }
}

// Старт програми
initApplication();
