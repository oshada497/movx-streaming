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
        // We will use tmdbId to check existence
        const existing = await this.getMovieByTmdbId(movie.tmdbId);
        if (existing) return false;

        const { data, error } = await supabaseClient
            .from('movies')
            .insert([movie])
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
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
            console.error('Error fetching movie:', error);
        }
        return data; // returns null if not found
    },

    async updateMovie(id, updates) {
        // id here is the Supabase ID (UUID or numeric) or our local ID?
        // Admin app uses timestamps for IDs currently. 
        // We should probably rely on the 'id' column from Supabase which we get when we fetch.

        const { data, error } = await supabaseClient
            .from('movies')
            .update(updates)
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

        const { data, error } = await supabaseClient
            .from('tv_shows')
            .insert([show])
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
            .single();

        return data;
    },

    async updateTVShow(id, updates) {
        const { data, error } = await supabaseClient
            .from('tv_shows')
            .update(updates)
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
