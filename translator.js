
const Translator = {
    async translate(text) {
        if (!text) return '';

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) return text;
            const data = await response.json();

            // Extract from Gemini response structure
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            }
            return text;
        } catch (e) {
            console.error('Translation failed', e);
            return text;
        }
    }
};

window.Translator = Translator;
