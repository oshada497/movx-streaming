// ===== Configuration =====
const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://hlfvrhmvulsttzdwyzus.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZnZyaG12dWxzdHR6ZHd5enVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjAyMzksImV4cCI6MjA4MTYzNjIzOX0.AZmSk-JMht2MC3I1giMJpI3JGVsDRgAPSkqihaDZ6xo',

    // TMDB API Configuration
    // Get your API key from https://www.themoviedb.org/settings/api
    TMDB_API_KEY: 'da06564497bf45a3315c8154022e4552', // TMDB API key
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',

    // Gemini API Configuration (for Sinhala translation)
    // Get your API key from https://aistudio.google.com/app/apikey
    GEMINI_API_KEY: 'AIzaSyBH6xnoVJcuLP5vrUgTyjmMVuIpWLytKBo',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',

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
