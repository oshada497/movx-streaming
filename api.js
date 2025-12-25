
const API = {
    // Helper for fetching from backend
    async fetch(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error('API Call Failed:', endpoint, e);
            return null;
        }
    },

    // --- Direct TMDB Calls (Bypassing Worker) ---
    async searchDirect(query, apiKey) {
        if (!apiKey) return [];
        const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            return data.results || [];
        } catch (e) {
            console.error('Direct Search Failed', e);
            return [];
        }
    },

    async getDetailsDirect(type, id, apiKey) {
        if (!apiKey) return null;
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&append_to_response=credits,videos,similar,recommendations,external_ids`;
        try {
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            console.error('Direct Details Failed', e);
            return null;
        }
    },

    async getSeasonDetailsDirect(tvId, seasonNumber, apiKey) {
        if (!apiKey) return null;
        const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}`;
        try {
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            console.error('Direct Season Details Failed', e);
            return null;
        }
    },

    // --- TMDB ---
    async getTrending(type = 'all', timeWindow = 'week') {
        const data = await this.fetch(`/api/tmdb/trending/${type}/${timeWindow}`);
        return data?.results || [];
    },

    async getPopular(type = 'movie') {
        const data = await this.fetch(`/api/tmdb/${type}/popular`);
        return data?.results || [];
    },

    async getDetails(type, id) {
        return await this.fetch(`/api/tmdb/${type}/${id}?append_to_response=credits,videos,similar,recommendations,external_ids`);
    },

    async search(query) {
        const data = await this.fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(query)}&include_adult=false`);
        return data?.results || [];
    },

    async getSeasonDetails(tvId, seasonNumber) {
        return await this.fetch(`/api/tmdb/tv/${tvId}/season/${seasonNumber}`);
    },

    // --- Helper to get image URLs ---
    getImageUrl(path, size = 'w500') {
        if (!path) {
            // Return a dark SVG Data URI
            return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiB2aWV3Qm94PSIwIDAgNTAwIDc1MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzFhMWExYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI0MCIgZmlsbD0iIzY2NjY2NiI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
        }

        // Handle named sizes (e.g. 'poster' -> 'w342')
        let realSize = size;
        if (CONFIG.IMAGE_SIZES && CONFIG.IMAGE_SIZES[size]) {
            realSize = CONFIG.IMAGE_SIZES[size];
        } else if (size === 'poster') {
            // Fallback if CONFIG not found or key missing
            realSize = 'w500';
        }

        return `${CONFIG.TMDB_IMAGE_BASE}/${realSize}${path}`;
    },

    getBackdropUrl(path) {
        if (!path) return '';
        return `${CONFIG.TMDB_IMAGE_BASE}/original${path}`;
    }
};

window.API = API;
