// ===== Configuration =====
const CONFIG = {
    // Cloudflare Worker Backend URL
    API_BASE_URL: 'https://movx-streaming-backend.samename253.workers.dev',

    // Supabase Configuration (for authentication)
    SUPABASE_URL: 'https://hlfvrhmvulsttzdwyzus.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZnZyaG12dWxzdHR6ZHd5enVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjAyMzksImV4cCI6MjA4MTYzNjIzOX0.AZmSk-JMht2MC3I1giMJpI3JGVsDRgAPSkqihaDZ6xo',

    // TMDB Base URL (for Images only, API calls go through backend)
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',

    // API Key (Client-side for Admin)
    API_API_KEY: 'YOUR_API_API_KEY',

    // Image sizes
    IMAGE_SIZES: {
        poster: 'w342', // Optimized from w500
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
