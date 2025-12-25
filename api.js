
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
        if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
        return `${CONFIG.TMDB_IMAGE_BASE}/${size}${path}`;
    },

    getBackdropUrl(path) {
        if (!path) return '';
        return `${CONFIG.TMDB_IMAGE_BASE}/original${path}`;
    }
};

window.API = API;
