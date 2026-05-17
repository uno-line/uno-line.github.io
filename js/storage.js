/**
 * Модуль для роботи з локальним сховищем (localStorage)
 */

// Ключі для збереження даних
const KEYS = {
    API_CONFIG: 'architect_api_config',
    PROMPTS_CONFIG: 'architect_prompts_config',
    APPS: 'architect_apps_list'
};

// Дефолтні системні промпти для нашого 4-етапного конвеєра
const DEFAULT_PROMPTS = {
    analyst: `Ти — архітектор баз даних. Твоє завдання — проаналізувати ідею мікрододатка і виділити всі константи, тарифи, ціни та коефіцієнти, необхідні для його роботи. Поверни дані СТРОГО у форматі JSON із кореневим ключем "database". Ніякого зайвого тексту, маркдауну чи пояснень.`,
    ui_architect: `Ти — UI/UX інженер. На основі опису додатка та наданої JSON-бази даних, створи структуру інтерфейсу користувача (поля введення, вибору, кнопки). Використовуй класи Tailwind CSS. Поверни результат СТРОГО у форматі JSON із кореневим ключем "ui".`,
    developer: `Ти — senior JavaScript розробник. Напиши чисту JS-функцію calculate(userData, database), яка бере введені користувачем дані, застосовувати коефіцієнти з бази знань і повертає об'єкт із результатом. Поверни СТРОГО код функції.`,
    designer: `Ти — веб-дизайнер. Твоє завдання — створити мінімалістичну, сучасну іконку для цього додатка у форматі SVG. Використовуй гарні градієнти. Поверни СТРОГО валідний код <svg>...</svg>.`
};

// Дефолтні налаштування API
const DEFAULT_API_CONFIG = {
    key: '',
    model: 'gemini-3.0-flash-preview',
    temperature: 0.7
};

export const StorageService = {
    // --- Налаштування API ---
    getApiConfig() {
        const config = localStorage.getItem(KEYS.API_CONFIG);
        return config ? JSON.parse(config) : DEFAULT_API_CONFIG;
    },

    saveApiConfig(config) {
        localStorage.setItem(KEYS.API_CONFIG, JSON.stringify(config));
    },

    // --- Налаштування кастомних промптів конвеєра ---
    getPromptsConfig() {
        const prompts = localStorage.getItem(KEYS.PROMPTS_CONFIG);
        return prompts ? JSON.parse(prompts) : DEFAULT_PROMPTS;
    },

    savePromptsConfig(prompts) {
        localStorage.setItem(KEYS.PROMPTS_CONFIG, JSON.stringify(prompts));
    },

    // --- Робота зі згенерованими додатками ---
    getApps() {
        const apps = localStorage.getItem(KEYS.APPS);
        return apps ? JSON.parse(apps) : [];
    },

    saveApp(app) {
        const apps = this.getApps();
        const index = apps.findIndex(a => a.id === app.id);
        
        if (index !== -1) {
            apps[index] = app; // Оновлюємо існуючий
        } else {
            apps.push(app); // Додаємо новий
        }
        localStorage.setItem(KEYS.APPS, JSON.stringify(apps));
    },

    deleteApp(appId) {
        const apps = this.getApps();
        const filtered = apps.filter(a => a.id !== appId);
        localStorage.setItem(KEYS.APPS, JSON.stringify(filtered));
    }
};
