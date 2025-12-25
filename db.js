
// ===== Database Connection (via Worker Backend) =====

// ===== Database Connection (via Worker Backend) =====

// Cache Configuration for Backend Calls

// Cache Configuration for Backend Calls
const CACHE_DURATION = 5 * 60 * 1000; // 5 mins
const CACHE_KEYS = {
    movies: 'movx_cache_movies',
    tvShows: 'movx_cache_tvshows'
};

// --- Storage Helper ---
const Storage = {
    getWatchlist() {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.watchlist);
        return stored ? JSON.parse(stored) : [];
    },

    addToWatchlist(item) {
        const list = this.getWatchlist();
        if (!list.some(i => i.tmdbId == item.tmdbId)) {
            list.push({ ...item, addedAt: Date.now() });
            localStorage.setItem(CONFIG.STORAGE_KEYS.watchlist, JSON.stringify(list));
            return true;
        }
        return false;
    },

    removeFromWatchlist(id, type) {
        let list = this.getWatchlist();
        list = list.filter(i => !(i.tmdbId == id && i.mediaType == type));
        localStorage.setItem(CONFIG.STORAGE_KEYS.watchlist, JSON.stringify(list));
        return true;
    },

    isInWatchlist(id, type) {
        const list = this.getWatchlist();
        return list.some(i => i.tmdbId == id && i.mediaType == type);
    }
};

function getFromCache(key) {
    try {
        const cached = sessionStorage.getItem(key);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_DURATION) return null;
        return data;
    } catch { return null; }
}

function setCache(key, data) {
    try {
        sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch { sessionStorage.clear(); }
}

function clearCache() {
    Object.values(CACHE_KEYS).forEach(k => sessionStorage.removeItem(k));
}

const DB = {
    // --- Movies ---
    async getMovies() {
        const cached = getFromCache(CACHE_KEYS.movies);
        if (cached) return cached;

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/movies`);
            if (!res.ok) return [];
            const data = await res.json();

            // Decrypt on client side (Worker sends encrypted data)
            if (data && window.Security) {
                data.forEach(m => {
                    if (m.videoUrl) m.videoUrl = Security.decrypt(m.videoUrl);
                    if (m.facebookVideoId) m.facebookVideoId = Security.decrypt(m.facebookVideoId);
                });
            }

            setCache(CACHE_KEYS.movies, data);
            return data;
        } catch (e) {
            console.error('DB Error', e);
            return [];
        }
    },

    async addMovie(movie) {
        // Local Encryption before sending to Worker (Double safety or just standard)
        // Actually, we should encrypt here because the Worker is just a proxy and we don't want plaintext in transit if possible (though HTTPS protects it).
        // Reuse Security logic from before
        const cleanMovie = { ...movie };
        if (window.Security) {
            if (cleanMovie.videoUrl) cleanMovie.videoUrl = Security.encrypt(cleanMovie.videoUrl);
            if (cleanMovie.facebookVideoId) cleanMovie.facebookVideoId = Security.encrypt(cleanMovie.facebookVideoId);
        }

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/movies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanMovie)
            });
            if (res.ok) {
                clearCache();
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    },

    async updateMovie(id, updates) {
        const cleanUpdates = { ...updates };
        if (window.Security) {
            if (cleanUpdates.videoUrl) cleanUpdates.videoUrl = Security.encrypt(cleanUpdates.videoUrl);
            if (cleanUpdates.facebookVideoId) cleanUpdates.facebookVideoId = Security.encrypt(cleanUpdates.facebookVideoId);
        }

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/movies/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanUpdates)
            });
            if (res.ok) {
                clearCache();
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    },

    // --- TV Shows ---
    async getTVShows() {
        const cached = getFromCache(CACHE_KEYS.tvShows);
        if (cached) return cached;

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/tv`);
            if (!res.ok) return [];
            const data = await res.json();

            if (data && window.Security) {
                data.forEach(s => {
                    if (s.videoUrl) s.videoUrl = Security.decrypt(s.videoUrl);
                    if (s.facebookVideoId) s.facebookVideoId = Security.decrypt(s.facebookVideoId);
                });
            }

            setCache(CACHE_KEYS.tvShows, data);
            return data;
        } catch (e) { return []; }
    },

    async addTVShow(show) {
        const cleanShow = { ...show };
        if (window.Security) {
            if (cleanShow.videoUrl) cleanShow.videoUrl = Security.encrypt(cleanShow.videoUrl);
            if (cleanShow.facebookVideoId) cleanShow.facebookVideoId = Security.encrypt(cleanShow.facebookVideoId);
        }

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/tv`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanShow)
            });
            if (res.ok) {
                clearCache();
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    },

    async updateTVShow(id, updates) {
        const cleanUpdates = { ...updates };
        if (window.Security) {
            if (cleanUpdates.videoUrl) cleanUpdates.videoUrl = Security.encrypt(cleanUpdates.videoUrl);
            if (cleanUpdates.facebookVideoId) cleanUpdates.facebookVideoId = Security.encrypt(cleanUpdates.facebookVideoId);
        }

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/tv/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanUpdates)
            });
            if (res.ok) {
                clearCache();
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    },

    // --- Episodes (Currently just LocalStorage or not fully mocked in worker yet? 
    // --- Episodes ---

    async getEpisodes(tvShowId) {
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/episodes?tv_show_id=${tvShowId}`);
            if (!res.ok) return [];
            const data = await res.json();

            // Decrypt
            if (data && window.Security) {
                data.forEach(ep => {
                    if (ep.video_url) ep.video_url = Security.decrypt(ep.video_url);
                    if (ep.facebook_video_id) ep.facebook_video_id = Security.decrypt(ep.facebook_video_id);
                });
            }
            return data;
        } catch (e) { return []; }
    },

    async addEpisode(episode) {
        const cleanEp = { ...episode };
        if (window.Security) {
            if (cleanEp.video_url) cleanEp.video_url = Security.encrypt(cleanEp.video_url);
            if (cleanEp.facebook_video_id) cleanEp.facebook_video_id = Security.encrypt(cleanEp.facebook_video_id);
        }

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/episodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanEp)
            });
            return res.ok;
        } catch (e) { return false; }
    },

    async updateEpisode(id, updates) {
        const cleanUpdates = { ...updates };
        if (window.Security) {
            if (cleanUpdates.video_url) cleanUpdates.video_url = Security.encrypt(cleanUpdates.video_url);
            if (cleanUpdates.facebook_video_id) cleanUpdates.facebook_video_id = Security.encrypt(cleanUpdates.facebook_video_id);
        }

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/episodes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanUpdates)
            });
            return res.ok;
        } catch (e) { return false; }
    },

    async deleteEpisode(id) {
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/episodes/${id}`, { method: 'DELETE' });
            return res.ok;
        } catch (e) { return false; }
    },

    // --- Unified ---
    async getAllContent() {
        const [m, t] = await Promise.all([this.getMovies(), this.getTVShows()]);
        return [...m.map(x => ({ ...x, mediaType: 'movie' })), ...t.map(x => ({ ...x, mediaType: 'tv' }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    async getMovieByTmdbId(id) {
        const movies = await this.getMovies();
        return movies.find(m => m.tmdbId == id);
    },

    async getTVShowByTmdbId(id) {
        const shows = await this.getTVShows();
        return shows.find(s => s.tmdbId == id);
    },

    // --- Watchlist ---
    getWatchlist() { return Storage.getWatchlist(); },
    addToWatchlist(item) { return Storage.addToWatchlist(item); },
    removeFromWatchlist(id, type) { return Storage.removeFromWatchlist(id, type); },
    isInWatchlist(id, type) { return Storage.isInWatchlist(id, type); },

    // --- Comments (Direct Supabase) ---
    async getComments(contentId, contentType) {
        if (!window.auth || !window.auth.supabase) return [];

        const { data, error } = await window.auth.supabase
            .from('comments')
            .select('*')
            .eq('content_id', contentId)
            .eq('content_type', contentType)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
        return data;
    },

    async addComment(comment) {
        if (!window.auth || !window.auth.supabase) return false;

        const { data, error } = await window.auth.supabase
            .from('comments')
            .insert([comment])
            .select();

        if (error) {
            console.error('Error adding comment:', error);
            // If error is code 42P01 (undefined_table), we should notify user, but console error is fine for now
            return null;
        }
        return data ? data[0] : null;
    }
};

window.DB = DB;
