// ===== Database Connection (via Worker Backend) =====

// Cache Configuration for Backend Calls
const CACHE_DURATION = 5 * 60 * 1000; // 5 mins
const CACHE_KEYS = {
    movies: 'movx_cache_movies',
    tvShows: 'movx_cache_tvshows',
    trending: 'movx_cache_trending'
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
    console.log('[Cache] Clearing all caches');
    Object.values(CACHE_KEYS).forEach(k => {
        sessionStorage.removeItem(k);
        console.log(`[Cache] Removed: ${k}`);
    });
}

// Force clear trending cache specifically
function clearTrendingCache() {
    console.log('[Cache] Force clearing trending cache');
    sessionStorage.removeItem(CACHE_KEYS.trending);
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

        // Reverted to camelCase to match DB schema
        const dbMovie = {
            tmdbId: cleanMovie.tmdbId,
            title: cleanMovie.title,
            description: cleanMovie.description,
            platform: cleanMovie.platform,
            year: cleanMovie.year,
            rating: cleanMovie.rating,
            genres: cleanMovie.genres,
            backdrop: cleanMovie.backdrop,
            poster: cleanMovie.poster,
            ageRating: cleanMovie.ageRating,
            runtime: cleanMovie.runtime,
            seasons: cleanMovie.seasons,
            videoUrl: cleanMovie.videoUrl,
            facebookVideoId: cleanMovie.facebookVideoId
        };

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/movies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbMovie)
            });
            if (res.ok) {
                clearCache();
                return true;
            } else {
                console.error('Add movie failed:', await res.text());
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

        const dbShow = {
            tmdbId: cleanShow.tmdbId,
            title: cleanShow.title || cleanShow.name, // handle name property
            description: cleanShow.description,
            platform: cleanShow.platform,
            year: cleanShow.year,
            rating: cleanShow.rating,
            genres: cleanShow.genres,
            backdrop: cleanShow.backdrop,
            poster: cleanShow.poster,
            ageRating: cleanShow.ageRating,
            runtime: cleanShow.runtime,
            seasons: cleanShow.seasons,
            videoUrl: cleanShow.videoUrl,
            facebookVideoId: cleanShow.facebookVideoId
        };

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/tv`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbShow)
            });
            if (res.ok) {
                clearCache();
                return true;
            } else {
                console.error('Add TV failed:', await res.text());
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

        const dbUpdates = {};
        if (cleanUpdates.title !== undefined) dbUpdates.title = cleanUpdates.title;
        if (cleanUpdates.description !== undefined) dbUpdates.description = cleanUpdates.description;
        if (cleanUpdates.platform !== undefined) dbUpdates.platform = cleanUpdates.platform;
        if (cleanUpdates.year !== undefined) dbUpdates.year = cleanUpdates.year;
        if (cleanUpdates.poster !== undefined) dbUpdates.poster = cleanUpdates.poster;
        if (cleanUpdates.videoUrl !== undefined) dbUpdates.videoUrl = cleanUpdates.videoUrl;
        if (cleanUpdates.facebookVideoId !== undefined) dbUpdates.facebookVideoId = cleanUpdates.facebookVideoId;

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/tv/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbUpdates)
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
    async search(query) {
        if (!query || query.trim().length < 2) return [];
        const allContent = await this.getAllContent();
        const lowerQuery = query.toLowerCase();

        return allContent.filter(item => {
            const title = (item.title || item.name || '').toLowerCase();
            return title.includes(lowerQuery);
        });
    },

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

    // --- Auth & Admin ---
    async isAdmin(email) {
        if (!window.auth || !window.auth.supabase) return false;

        try {
            const { data, error } = await window.auth.supabase
                .from('admin_whitelist')
                .select('email')
                .eq('email', email)
                .single();

            return !!data && !error;
        } catch (e) {
            console.error('Admin check failed:', e);
            return false;
        }
    },

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
    },

    // --- View Tracking & Analytics ---

    /**
     * Track a view for a movie or TV show
     * @param {number} contentId - Database ID of the content
     * @param {string} contentType - 'movie' or 'tv'
     * @param {number} tmdbId - TMDB ID of the content
     * @returns {Promise<boolean>}
     */
    async trackView(contentId, contentType, tmdbId) {
        if (!window.auth || !window.auth.supabase) return false;

        try {
            // Get current user if logged in
            const { data: { user } } = await window.auth.supabase.auth.getUser();
            const userId = user?.id || null;

            // Generate or retrieve session ID for anonymous tracking
            let sessionId = sessionStorage.getItem('viewSessionId');
            if (!sessionId) {
                sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                sessionStorage.setItem('viewSessionId', sessionId);
            }

            console.log('[DB] Tracking view:', { contentId, contentType, tmdbId, userId, sessionId });

            // Call the database function to increment view count
            const { error } = await window.auth.supabase.rpc('increment_view_count', {
                p_content_id: contentId,
                p_content_type: contentType,
                p_tmdb_id: tmdbId,
                p_user_id: userId,
                p_session_id: sessionId
            });

            if (error) {
                console.warn('[DB] RPC increment failed, trying direct insert fallback:', error);

                // Fallback: Try to insert directly into view_history
                // This works even if the user can't update the 'movies' table directly
                const { error: insertError } = await window.auth.supabase
                    .from('view_history')
                    .insert({
                        content_id: contentId,
                        content_type: contentType,
                        tmdb_id: tmdbId,
                        user_id: userId,
                        session_id: sessionId
                    });

                if (insertError) {
                    console.error('[DB] Direct insert also failed:', insertError);
                    return false;
                }
                console.log('[DB] Direct insert fallback successful');
            } else {
                console.log('[DB] View tracked successfully via RPC');
            }

            // Small delay to ensure database has processed the update
            await new Promise(resolve => setTimeout(resolve, 300));

            // Clear ALL cache to refresh view counts and trending data
            if (typeof clearTrendingCache === 'function') {
                clearTrendingCache();
            } else {
                clearCache();
            }
            console.log('[DB] Cache cleared after view tracking');

            // Dispatch custom event for real-time UI updates
            window.dispatchEvent(new CustomEvent('viewTracked', {
                detail: { contentId, contentType, tmdbId }
            }));

            return true;
        } catch (e) {
            console.error('View tracking error:', e);
            return false;
        }
    },

    /**
     * Get trending content based on views in the last X days
     * @param {number} daysLimit - Number of days to look back (default: 30)
     * @param {number} resultLimit - Number of results to return (default: 10)
     * @param {boolean} bypassCache - Force fresh data (default: false)
     * @returns {Promise<Array>}
     */
    async getTrendingContent(daysLimit = 30, resultLimit = 10, bypassCache = false) {
        // Check cache first (unless bypassed)
        if (!bypassCache) {
            const cached = getFromCache(CACHE_KEYS.trending);
            if (cached) {
                console.log('[DB] Using cached trending data');
                return cached;
            }
        }

        if (!window.auth || !window.auth.supabase) {
            // Fallback to most recent content if no Supabase
            const allContent = await this.getAllContent();
            return allContent.slice(0, resultLimit);
        }

        try {
            console.log('[DB] Fetching fresh trending data from database');
            const { data, error } = await window.auth.supabase.rpc('get_trending_content', {
                days_limit: daysLimit,
                result_limit: resultLimit
            });

            if (error) {
                console.error('Error getting trending:', error);
                // Fallback to most recent content
                const allContent = await this.getAllContent();
                return allContent.slice(0, resultLimit);
            }

            // Transform data to match our content structure - now with ALL fields from SQL
            const transformed = data.map(item => ({
                id: item.content_id,
                tmdbId: item.tmdb_id,
                title: item.title,
                poster: item.poster,
                backdrop: item.backdrop,
                description: item.description,
                rating: item.rating,
                year: item.year,
                genres: item.genres,
                platform: item.platform,
                runtime: item.runtime,
                seasons: item.seasons,
                mediaType: item.content_type,
                viewCount: Number(item.view_count || 0), // Explicit cast to Number
                view_count: Number(item.view_count || 0)
            }));

            // FORCE SORT by view count descending (Numeric safe)
            transformed.sort((a, b) => b.viewCount - a.viewCount);

            // Cache the result
            setCache(CACHE_KEYS.trending, transformed);

            return transformed;
        } catch (e) {
            console.error('Trending content error:', e);
            const allContent = await this.getAllContent();
            return allContent.slice(0, resultLimit);
        }
    },

    /**
     * Get view statistics for a specific content
     * @param {number} tmdbId - TMDB ID
     * @param {string} contentType - 'movie' or 'tv'
     * @returns {Promise<object>}
     */
    async getViewStats(tmdbId, contentType) {
        if (!window.auth || !window.auth.supabase) return { totalViews: 0, recentViews: 0 };

        try {
            // Get content to find database ID
            const content = contentType === 'movie'
                ? await this.getMovieByTmdbId(tmdbId)
                : await this.getTVShowByTmdbId(tmdbId);

            if (!content) return { totalViews: 0, recentViews: 0 };

            // Get total views from content table
            const totalViews = content.view_count || 0;

            // Get recent views (last 7 days) from view_history
            const { data, error } = await window.auth.supabase
                .from('view_history')
                .select('id', { count: 'exact' })
                .eq('tmdb_id', tmdbId)
                .eq('content_type', contentType)
                .gte('viewed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            const recentViews = error ? 0 : (data?.length || 0);

            return {
                totalViews,
                recentViews,
                contentId: content.id
            };
        } catch (e) {
            console.error('View stats error:', e);
            return { totalViews: 0, recentViews: 0 };
        }
    },

    /**
     * Get most popular content by total views
     * @param {number} limit - Number of results
     * @returns {Promise<Array>}
     */
    async getMostPopular(limit = 10) {
        try {
            const [movies, tvShows] = await Promise.all([
                this.getMovies(),
                this.getTVShows()
            ]);

            // Combine and sort by view_count
            const allContent = [
                ...movies.map(m => ({ ...m, mediaType: 'movie' })),
                ...tvShows.map(t => ({ ...t, mediaType: 'tv' }))
            ];

            // Sort by view_count (descending) and return top results
            return allContent
                .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                .slice(0, limit);
        } catch (e) {
            console.error('Most popular error:', e);
            return [];
        }
    }
};

window.DB = DB;
