// ===== Initialize Dummy Content into Supabase =====
// This script checks if Supabase has content, and if not, populates it with dummy data

(async function initDummyContent() {
    // Wait for DB to be available
    if (typeof DB === 'undefined') {
        console.error('DB module not loaded yet.');
        return;
    }

    try {
        console.log('Checking for existing content in Supabase...');
        const [movies, shows] = await Promise.all([DB.getMovies(), DB.getTVShows()]);

        if (movies.length > 0 || shows.length > 0) {
            console.log('Content exists in Supabase.');
            if (window.app && window.app.loadContent) {
                window.app.loadContent();
            }
            return;
        }

        console.log('Supabase is empty.');

        /* 
           DISABLED: Dummy data injection removed as per user request. 
           The site will now strictly use user-added content from the Admin Panel.
        */

        console.log('Dummy data injection disabled. Please use Admin Panel to add content.');

        // Dummy Movies (Commented Out)
        /*
        const dummyMovies = [ ... ];
        */

        // Dummy TV Shows (Commented Out)
        /*
        const dummyTVShows = [ ... ];
        */

        // Reload content in app (even if empty, to clear loading states)
        if (window.app && window.app.loadContent) {
            window.app.loadContent();
        }

    } catch (error) {
        console.error('Error initializing data:', error);
    }
})();
