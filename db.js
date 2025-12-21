// ===== Supabase Database Connection =====

// Initialize Supabase Client
if (typeof supabase === 'undefined') {
    console.error('Supabase client library not loaded!');
}

const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const DB = {
    // --- Movies ---

    async getMovies() {
        const { data, error } = await supabaseClient
            .from('movies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching movies:', error);
            return [];
        }
        return data || [];
    },

    async addMovie(movie) {
        // Remove 'id' if it's just a local timestamp, let Supabase handle Ids or use tmdbId as unique
        const existing = await this.getMovieByTmdbId(movie.tmdbId);
        if (existing) return false;

        // Sanitize object to remove properties that don't exist in the 'movies' table (like 'seasons')
        const allowedFields = [
            'tmdbId', 'title', 'description', 'platform', 'year', 'rating',
            'genres', 'backdrop', 'poster', 'ageRating', 'runtime', 'videoUrl'
        ];

        const cleanMovie = {};
        allowedFields.forEach(field => {
            if (movie[field] !== undefined) cleanMovie[field] = movie[field];
        });

        const { data, error } = await supabaseClient
            .from('movies')
            .insert([cleanMovie])
            .select();

        if (error) {
            console.error('Error adding movie:', error);
            return false;
        }
        return true;
    },

    async getMovieByTmdbId(tmdbId) {
        const { data, error } = await supabaseClient
            .from('movies')
            .select('*')
            .eq('tmdbId', tmdbId)
            .maybeSingle(); // Use maybeSingle() to avoid 406 errors when content doesn't exist yet

        if (error) {
            // console.error('Error fetching movie:', error);
        }
        return data;
    },

    async updateMovie(id, updates) {
        // Sanitize updates
        const allowedFields = [
            'tmdbId', 'title', 'description', 'platform', 'year', 'rating',
            'genres', 'backdrop', 'poster', 'ageRating', 'runtime', 'videoUrl'
        ];

        const cleanUpdates = {};
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) cleanUpdates[field] = updates[field];
        });

        const { data, error } = await supabaseClient
            .from('movies')
            .update(cleanUpdates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating movie:', error);
            return false;
        }
        return true;
    },

    async removeMovie(id) {
        const { error } = await supabaseClient
            .from('movies')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting movie:', error);
            return false;
        }
        return true;
    },

    // --- TV Shows ---

    async getTVShows() {
        const { data, error } = await supabaseClient
            .from('tv_shows')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tv shows:', error);
            return [];
        }
        return data || [];
    },

    async addTVShow(show) {
        const existing = await this.getTVShowByTmdbId(show.tmdbId);
        if (existing) return false;

        // Sanitize object
        const allowedFields = [
            'tmdbId', 'title', 'description', 'platform', 'year', 'rating',
            'genres', 'backdrop', 'poster', 'ageRating', 'seasons', 'videoUrl'
        ];

        const cleanShow = {};
        allowedFields.forEach(field => {
            if (show[field] !== undefined) cleanShow[field] = show[field];
        });

        const { data, error } = await supabaseClient
            .from('tv_shows')
            .insert([cleanShow])
            .select();

        if (error) {
            console.error('Error adding tv show:', error);
            return false;
        }
        return true;
    },

    async getTVShowByTmdbId(tmdbId) {
        const { data, error } = await supabaseClient
            .from('tv_shows')
            .select('*')
            .eq('tmdbId', tmdbId)
            .maybeSingle();

        return data;
    },

    async updateTVShow(id, updates) {
        // Sanitize updates
        const allowedFields = [
            'tmdbId', 'title', 'description', 'platform', 'year', 'rating',
            'genres', 'backdrop', 'poster', 'ageRating', 'seasons', 'videoUrl'
        ];

        const cleanUpdates = {};
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) cleanUpdates[field] = updates[field];
        });

        const { data, error } = await supabaseClient
            .from('tv_shows')
            .update(cleanUpdates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating tv show:', error);
            return false;
        }
        return true;
    },

    async removeTVShow(id) {
        const { error } = await supabaseClient
            .from('tv_shows')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting tv show:', error);
            return false;
        }
        return true;
    },

    // --- Unified Content ---

    async getAllContent() {
        const [movies, shows] = await Promise.all([this.getMovies(), this.getTVShows()]);

        const markedMovies = movies.map(m => ({ ...m, mediaType: 'movie' }));
        const markedShows = shows.map(s => ({ ...s, mediaType: 'tv' }));

        // Sort by added date if possible, currently just mixing
        // Assuming 'created_at' is available or 'addedAt'
        return [...markedMovies, ...markedShows].sort((a, b) => {
            return new Date(b.created_at || b.addedAt) - new Date(a.created_at || a.addedAt);
        });
    },

    // --- Watchlist (Local Storage for now, or Supabase if Auth existed) ---
    // User is Anonymous, so Local Storage is better for Watchlist unless we track IP/Session
    // Keeping Watchlist local for now to keep it simple as user didn't request Auth.

    getWatchlist() {
        return Storage.getWatchlist(); // Fallback to existing Storage implementation which assumes LocalStorage
    },

    addToWatchlist(item) {
        return Storage.addToWatchlist(item);
    },

    removeFromWatchlist(tmdbId, mediaType) {
        return Storage.removeFromWatchlist(tmdbId, mediaType);
    },

    isInWatchlist(tmdbId, mediaType) {
        return Storage.isInWatchlist(tmdbId, mediaType);
    }
};

window.DB = DB;
