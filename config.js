// ===== Configuration =====
const CONFIG = {
    // TMDB API Configuration
    // Get your API key from https://www.themoviedb.org/settings/api
    TMDB_API_KEY: 'da06564497bf45a3315c8154022e4552', // TMDB API key
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',

    // Image sizes
    IMAGE_SIZES: {
        poster: 'w500',
        backdrop: 'original',
        thumbnail: 'w300'
    },

    // Local Storage Keys
    STORAGE_KEYS: {
        movies: 'movx_movies',
        tvShows: 'movx_tvshows',
        watchlist: 'movx_watchlist',
        history: 'movx_history'
    },

    // Hero slide interval (ms)
    HERO_INTERVAL: 8000,

    // Platforms
    PLATFORMS: [
        { id: 'netflix', name: 'NETFLIX' },
        { id: 'disney', name: 'DISNEY+' },
        { id: 'prime', name: 'PRIME VIDEO' },
        { id: 'apple', name: 'APPLE TV+' },
        { id: 'hbo', name: 'HBO MAX' },
        { id: 'other', name: 'OTHER' }
    ]
};

// Export for use in other files
window.CONFIG = CONFIG;
