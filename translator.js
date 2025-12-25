// ===== Gemini Translation Utility =====

class Translator {
    constructor() {
        this.apiKey = CONFIG.GEMINI_API_KEY;
        this.apiUrl = CONFIG.GEMINI_API_URL;
        this.cache = new Map(); // Cache translations to avoid redundant API calls
    }

    /**
     * Translate text from English to Sinhala using Gemini API
     * @param {string} text - The English text to translate
     * @returns {Promise<string>} - The translated Sinhala text
     */
    async translateToSinhala(text) {
        if (!text || text.trim() === '') {
            return '';
        }

        // Check if API key is configured
        if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            console.error('Gemini API key is not configured. Please add your API key in config.js');
            return text; // Return original text if API key is missing
        }

        // Check cache first
        const cacheKey = text.toLowerCase().trim();
        if (this.cache.has(cacheKey)) {
            console.log('Using cached translation');
            return this.cache.get(cacheKey);
        }

        try {
            const prompt = `Translate the following movie description from English to Sinhala. 
Provide ONLY the Sinhala translation without any additional explanation or notes.
Keep the same tone and meaning as the original.

English text:
${text}

Sinhala translation:`;

            const requestBody = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3, // Lower temperature for more consistent translations
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_NONE'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_NONE'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_NONE'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_NONE'
                    }
                ]
            };

            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API error:', errorData);
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0) {
                const translatedText = data.candidates[0].content.parts[0].text.trim();

                // Cache the translation
                this.cache.set(cacheKey, translatedText);

                return translatedText;
            } else {
                throw new Error('No translation result from Gemini API');
            }

        } catch (error) {
            console.error('Translation error:', error);
            // Return original text on error
            return text;
        }
    }

    /**
     * Translate multiple texts in batch
     * @param {Array<string>} texts - Array of English texts to translate
     * @returns {Promise<Array<string>>} - Array of translated Sinhala texts
     */
    async translateBatch(texts) {
        const translations = await Promise.all(
            texts.map(text => this.translateToSinhala(text))
        );
        return translations;
    }

    /**
     * Clear the translation cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    getCacheSize() {
        return this.cache.size;
    }
}

// Create global translator instance
window.translator = new Translator();
