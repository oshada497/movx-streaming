// ===== TMDB API Functions =====

const TMDB = {
    // Search for movies and TV shows
    async search(query, type = 'multi') {
        try {
            const response = await fetch(
                `${CONFIG.TMDB_BASE_URL}/search/${type}?api_key=${CONFIG.TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`
            );
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('TMDB Search Error:', error);
            return [];
        }
    },

    // Get movie details
    async getMovieDetails(movieId) {
        try {
            const response = await fetch(
                `${CONFIG.TMDB_BASE_URL}/movie/${movieId}?api_key=${CONFIG.TMDB_API_KEY}&append_to_response=videos,credits`
            );
            return await response.json();
        } catch (error) {
            console.error('TMDB Movie Details Error:', error);
            return null;
        }
    },

    // Get TV show details
    async getTVDetails(tvId) {
        try {
            const response = await fetch(
                `${CONFIG.TMDB_BASE_URL}/tv/${tvId}?api_key=${CONFIG.TMDB_API_KEY}&append_to_response=videos,credits`
            );
            return await response.json();
        } catch (error) {
            console.error('TMDB TV Details Error:', error);
            return null;
        }
    },

    // Get TV season details
    async getSeasonDetails(tvId, seasonNumber) {
        try {
            const response = await fetch(
                `${CONFIG.TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${CONFIG.TMDB_API_KEY}`
            );
            return await response.json();
        } catch (error) {
            console.error('TMDB Season Details Error:', error);
            return null;
        }
    },

    // Get trending content
    async getTrending(type = 'all', timeWindow = 'week') {
        try {
            const response = await fetch(
                `${CONFIG.TMDB_BASE_URL}/trending/${type}/${timeWindow}?api_key=${CONFIG.TMDB_API_KEY}`
            );
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('TMDB Trending Error:', error);
            return [];
        }
    },

    // Get popular movies
    async getPopularMovies() {
        try {
            const response = await fetch(
                `${CONFIG.TMDB_BASE_URL}/movie/popular?api_key=${CONFIG.TMDB_API_KEY}`
            );
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('TMDB Popular Movies Error:', error);
            return [];
        }
    },

    // Get popular TV shows
    async getPopularTV() {
        try {
            const response = await fetch(
                `${CONFIG.TMDB_BASE_URL}/tv/popular?api_key=${CONFIG.TMDB_API_KEY}`
            );
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('TMDB Popular TV Error:', error);
            return [];
        }
    },

    // Get image URL
    getImageUrl(path, size = 'poster') {
        if (!path) return 'https://via.placeholder.com/500x750/1a1a1a/666666?text=No+Image';
        return `${CONFIG.TMDB_IMAGE_BASE}/${CONFIG.IMAGE_SIZES[size]}${path}`;
    },

    // Get backdrop URL
    getBackdropUrl(path) {
        if (!path) return '';
        return `${CONFIG.TMDB_IMAGE_BASE}/${CONFIG.IMAGE_SIZES.backdrop}${path}`;
    }
};

// ===== Local Storage Functions =====

const Storage = {
    // Get all movies
    getMovies() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.movies);
        return data ? JSON.parse(data) : [];
    },

    // Save movies
    saveMovies(movies) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.movies, JSON.stringify(movies));
    },

    // Add movie
    addMovie(movie) {
        const movies = this.getMovies();
        // Check if already exists
        const exists = movies.some(m => m.tmdbId === movie.tmdbId);
        if (!exists) {
            movies.push({ ...movie, id: Date.now(), addedAt: new Date().toISOString() });
            this.saveMovies(movies);
            return true;
        }
        return false;
    },

    // Remove movie
    removeMovie(id) {
        const movies = this.getMovies().filter(m => m.id !== id);
        this.saveMovies(movies);
    },

    // Update movie
    updateMovie(id, updates) {
        const movies = this.getMovies().map(m =>
            m.id === id ? { ...m, ...updates } : m
        );
        this.saveMovies(movies);
    },

    // Get all TV shows
    getTVShows() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.tvShows);
        return data ? JSON.parse(data) : [];
    },

    // Save TV shows
    saveTVShows(shows) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.tvShows, JSON.stringify(shows));
    },

    // Add TV show
    addTVShow(show) {
        const shows = this.getTVShows();
        const exists = shows.some(s => s.tmdbId === show.tmdbId);
        if (!exists) {
            shows.push({ ...show, id: Date.now(), addedAt: new Date().toISOString() });
            this.saveTVShows(shows);
            return true;
        }
        return false;
    },

    // Remove TV show
    removeTVShow(id) {
        const shows = this.getTVShows().filter(s => s.id !== id);
        this.saveTVShows(shows);
    },

    // Update TV show
    updateTVShow(id, updates) {
        const shows = this.getTVShows().map(s =>
            s.id === id ? { ...s, ...updates } : s
        );
        this.saveTVShows(shows);
    },

    // Get all content (movies + TV shows)
    getAllContent() {
        const movies = this.getMovies().map(m => ({ ...m, mediaType: 'movie' }));
        const tvShows = this.getTVShows().map(s => ({ ...s, mediaType: 'tv' }));
        return [...movies, ...tvShows].sort((a, b) =>
            new Date(b.addedAt) - new Date(a.addedAt)
        );
    },

    // Watchlist
    getWatchlist() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEYS.watchlist);
        return data ? JSON.parse(data) : [];
    },

    addToWatchlist(item) {
        const watchlist = this.getWatchlist();
        const exists = watchlist.some(w => w.tmdbId === item.tmdbId && w.mediaType === item.mediaType);
        if (!exists) {
            watchlist.push({ ...item, addedAt: new Date().toISOString() });
            localStorage.setItem(CONFIG.STORAGE_KEYS.watchlist, JSON.stringify(watchlist));
            return true;
        }
        return false;
    },

    removeFromWatchlist(tmdbId, mediaType) {
        const watchlist = this.getWatchlist().filter(
            w => !(w.tmdbId === tmdbId && w.mediaType === mediaType)
        );
        localStorage.setItem(CONFIG.STORAGE_KEYS.watchlist, JSON.stringify(watchlist));
    },

    isInWatchlist(tmdbId, mediaType) {
        return this.getWatchlist().some(w => w.tmdbId === tmdbId && w.mediaType === mediaType);
    }
};

// Export for use in other files
window.TMDB = TMDB;
window.Storage = Storage;
