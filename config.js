// ===== Configuration =====
// Internal Obfuscator
const _ = (s) => atob(s).split('').reverse().join('');

const CONFIG = {
    // Supabase Configuration (Obfuscated)
    SUPABASE_URL: _('b2MuZXNhYmFwdXMuc3V6eXdkenR0c2x1dm1ocnZmbGgvLzpzcHR0aA=='),
    SUPABASE_KEY: _('b3g2WkRhaGlxa1NQQWdSRHNWR0ozSXBKTWlnMUkzQ00ydGhNSi1rU21aQS4wWE96SWpOellUTTRBak02SUNjNFZtSXNrek15QWpOd1lqTjNFak9pUVhZcEpDTGk0MmJ1Rm1JNklTWnM5bWNpd2lJelZuZTVkSFo2UkhkenhXZDIxR2F5Wm5ac2htSTZJaVpsSm5Jc0lTWnpGbVloQlhkekppT2lNM2NwSnllLjlKQ1ZYcGtJNklDYzVSbklzSWlOMUl6VUlKaU9pY0diaEp5ZQ=='),

    // TMDB API Configuration (Obfuscated)
    TMDB_API_KEY: _('MjU1NGUyMjA0NTE4YzUxMzNhNTRmYjc5NDQ2NTYwYWQ='),
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',

    // Gemini API (Obfuscated)
    // AIzaSyBH6xnoVJcuLP5vrUgTyjmMVuIpWLytKBo -> b2JLVHlMV0lwdVZNbWp5VGdVcnY1UEx1Y0pWb254NkhCeVNheklB
    // (Note: I will use the one from the screenshot for Gemini if I can read it fully or just leave it blank if not critical, or ask user. 
    // Wait, the screenshot shows 'AIzaSyBH6xnoVJcuLP5vrUgTyjmMVuIpWLytKBo'. I can obfuscate that too.)
    GEMINI_API_KEY: _('b2JLVHlMV0lwdVZNbWp5VGdVcnY1UEx1Y0pWb254NkhCeVNheklB'),
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
