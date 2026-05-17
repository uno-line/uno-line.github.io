/**
 * Головний контролер застосунку "Архітектор"
 * Пов'язує UI, сховище, API Gemini та збирач додатків
 */
import { StorageService } from './storage.js';
import { GeminiService } from './gemini.js';
import { BuilderService } from './builder.js';

// Селектори елементів UI
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

// Стан додатку в пам'яті
let currentLoaderOverlay = null;

   document.addEventListener('DOMContentLoaded', () => {
       initSettings();
       initEventListeners();
       renderAppsList();
       
       // Реєстрація Service Worker для підтримки PWA
       if ('serviceWorker' in navigator) {
           navigator.serviceWorker.register('./sw.js')
               .then(() => console.log('Service Worker зареєстровано успішно.'))
               .catch(err => console.error('Помилка реєстрації SW:', err));
       }
   });

// Завантаження збережених налаштувань у форму
function initSettings() {
    const config = StorageService.getApiConfig();
    UI.apiKeyInput.value = config.key;
    UI.apiModelSelect.value = config.model;
    UI.apiTempInput.value = config.temperature;
    UI.tempValueDisplay.textContent = config.temperature;
}

// Налаштування всіх обробників подій
function initEventListeners() {
    // Модалка налаштувань
    UI.btnSettings.addEventListener('click', () => UI.modalSettings.classList.remove('hidden'));
    UI.btnCloseSettings.addEventListener('click', () => UI.modalSettings.classList.add('hidden'));
    
    UI.apiTempInput.addEventListener('input', (e) => {
        UI.tempValueDisplay.textContent = e.target.value;
    });

    UI.btnSaveSettings.addEventListener('click', () => {
        const newConfig = {
            key: UI.apiKeyInput.value.trim(),
            model: UI.apiModelSelect.value,
            temperature: parseFloat(UI.apiTempInput.value)
        };
        StorageService.saveApiConfig(newConfig);
        UI.modalSettings.classList.add('hidden');
    });

    // Автовисота для текстового поля введення промпту
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

    // Закриття вікна прев'ю
    UI.btnClosePreview.addEventListener('click', () => {
        UI.previewContainer.classList.add('translate-x-full');
        UI.appIframe.srcdoc = ''; 
    });

    // Головна подія: Клік на кнопку генерації
    UI.btnGenerate.addEventListener('click', handleGeneration);
}

/**
 * Логіка запуску багатоетапного конвеєра генерації
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
    
    // Показуємо оверлей завантаження
    showLoader('Запуск конвеєра "Архітектора"...');

    try {
        // Викликаємо наш кастомний Multi-agent пайплайн
        const newApp = await GeminiService.generateApp(
            prompt, 
            apiConfig, 
            promptsConfig, 
            (progress) => {
                // Оновлюємо текст на екрані при переході від агента до агента
                updateLoaderMessage(progress.message);
            }
        );

        // Зберігаємо згенерований додаток у локальну БД
        StorageService.saveApp(newApp);
        
        // Очищаємо поле введення
        UI.mainPrompt.value = '';
        UI.mainPrompt.style.height = 'auto';

        // Оновлюємо список карток на екрані
        renderAppsList();
        
        // Ховаємо лоадер і відразу відкриваємо створений додаток на весь екран
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

    // Навішуємо події на кнопки кожної картки
    UI.appsContainer.querySelectorAll('[data-id]').forEach(card => {
        const appId = card.dataset.id;
        const app = apps.find(a => a.id === appId);

        // Клік по всій картці або по кнопці Play — запускає додаток
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete') || e.target.closest('.btn-download')) return;
            openAppPreview(app);
        });

        // Кнопка видалення
        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Видалити додаток "${app.title}"?`)) {
                StorageService.deleteApp(appId);
                renderAppsList();
            }
        });

        // Кнопка завантаження автономного файлу
        card.querySelector('.btn-download').addEventListener('click', (e) => {
            e.stopPropagation();
            downloadStandaloneHtml(app);
        });
    });
}

/**
 * Відкриття згенерованого додатка в повноекранному iframe (свайп-панель)
 */
function openAppPreview(app) {
    UI.previewTitle.textContent = app.title;
    
    // Збираємо повний код додатка через BuilderService
    const finalHtml = BuilderService.buildHtml(app);
    
    // Впорскуємо код безпосередньо в iframe
    UI.appIframe.srcdoc = finalHtml;
    
    // Висуваємо бічну панель (прибираємо клас зміщення)
    UI.previewContainer.classList.remove('translate-x-full');
}

/**
 * Функція завантаження додатка у вигляді одного файлу (простий експорт)
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
 * Допоміжні функції для красивого динамічного лоадера
 */
function showLoader(initialMessage) {
    currentLoaderOverlay = document.createElement('div');
    currentLoaderOverlay.className = 'fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in';
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

