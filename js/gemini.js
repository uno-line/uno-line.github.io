/**
 * Модуль для взаємодії з Google Gemini API
 * Реалізує багатоетапний конвеєр (пайплайн) генерації додатків
 */

export const GeminiService = {
    /**
     * Головна функція конвеєра, яка покроково викликає різних агентів
     * @param {string} userPrompt - Основний промпт від користувача
     * @param {Object} apiConfig - Налаштування API (ключ, модель, температура)
     * @param {Object} promptsConfig - Системні промпти для кожного етапу
     * @param {Function} onProgress - Коллбек для відображення прогресу на UI
     */
    async generateApp(userPrompt, apiConfig, promptsConfig, onProgress = () => {}) {
        try {
            // --- ЕТАП 1: Аналітик даних ---
            onProgress({ step: 'analyst', message: 'Аналітик створює базу знань та тарифну сітку...' });
            const databaseResponse = await this._callAPI(
                `Створи базу даних для додатка: "${userPrompt}"`,
                promptsConfig.analyst,
                apiConfig,
                true // Вимагаємо JSON від відповіді
            );
            const databaseData = this._parseJSON(databaseResponse);

            // --- ЕТАП 2: Архітектор інтерфейсу ---
            onProgress({ step: 'ui', message: 'Архітектор проєктує інтерфейс користувача...' });
            const uiPrompt = `Опис додатка: "${userPrompt}".\nБаза даних для інтеграції: ${JSON.stringify(databaseData)}`;
            const uiResponse = await this._callAPI(
                uiPrompt,
                promptsConfig.ui_architect,
                apiConfig,
                true
            );
            const uiData = this._parseJSON(uiResponse);

            // --- ЕТАП 3: Розробник логіки ---
            onProgress({ step: 'developer', message: 'Розробник пише математичне ядро (JS)...' });
            const devPrompt = `Опис додатка: "${userPrompt}".\nБаза даних: ${JSON.stringify(databaseData)}.\nСтруктура UI: ${JSON.stringify(uiData)}`;
            const jsCode = await this._callAPI(
                devPrompt,
                promptsConfig.developer,
                apiConfig,
                false // Тут потрібен чистий JS код скрипта, а не JSON
            );

            // --- ЕТАП 4: Дизайнер іконок ---
            onProgress({ step: 'designer', message: 'Дизайнер малює унікальну SVG-іконку...' });
            const designerPrompt = `Створи іконку для додатка: "${userPrompt}". Використовуй тільки чистий SVG.`;
            const svgIcon = await this._callAPI(
                designerPrompt,
                promptsConfig.designer,
                apiConfig,
                false
            );

            // Повертаємо структурований результат роботи всіх агентів
            return {
                id: 'app_' + Date.now(),
                title: uiData.title || userPrompt.substring(0, 20),
                prompt: userPrompt,
                database: databaseData,
                ui: uiData,
                logic: this._cleanJsCode(jsCode),
                icon: this._cleanSvgCode(svgIcon),
                createdAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Помилка в конвеєрі генерації:', error);
            throw error;
        }
    },

    /**
     * Внутрішній метод для виконання безпосереднього Fetch-запиту до Gemini API
     */
    async _callAPI(prompt, systemInstruction, config, isJsonRequest) {
        // Базовий URL для API розробника Gemini
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.key}`;

        // Формуємо тіло запиту за стандартами Google AI Studio
        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            generationConfig: {
                temperature: config.temperature
            }
        };

        // Якщо нам потрібен чіткий JSON (наприклад, для бази даних або UI),
        // вказуємо моделі тип відповіді application/json
        if (isJsonRequest) {
            requestBody.generationConfig.responseMimeType = "application/json";
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Помилка API: ${response.status}`);
        }

        const data = await response.json();
        
        // Витягуємо текст відповіді з структури Gemini JSON
        return data.candidates[0].content.parts[0].text;
    },

    /**
     * Безпечний парсинг JSON із видаленням можливих залишкових маркдаун-тегів
     */
    // eslint-disable-next-line no-unused-vars
    _parseJSON(text) {
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/
```json|```/g, '');
        if (cleanText.startsWith('```')) cleanText = cleanText.replace(/
```/g, '');
        return JSON.parse(cleanText.trim());
    },

    /**
     * Очищення згенерованого JS коду від маркдаун обгорток типу ```javascript
     */
    _cleanJsCode(code) {
        return code.replace(/
```javascript|```js|```/g, '').trim();
    },

    /**
     * Очищення SVG коду від можливого сміття
     */
    _cleanSvgCode(svg) {
        const match = svg.match(/<svg[\s\S]*<\/svg>/);
        return match ? match[0] : svg.trim();
    }
};
