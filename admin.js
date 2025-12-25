// ===== Admin Panel Application =====

// List of admin email addresses (add your email here)
const ADMIN_EMAILS = [
    'oshadakalindu@gmail.com'  // Replace with your admin email(s)
];

class AdminApp {
    constructor() {
        this.currentTab = 'add';
        this.init();
    }

    async init() {
        await this.checkAuth(); // Check security first
        this.loadApiKey();
        this.bindEvents();
        await this.updateContentCount();
        await this.renderMovies();
        await this.renderTVShows();
    }

    async checkAuth() {
        const overlay = document.getElementById('loginOverlay');
        const loginBtn = document.getElementById('adminGoogleLoginBtn');
        const errorMsg = document.getElementById('loginError');
        const loginMessage = document.getElementById('loginMessage');

        // Check current session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // User is logged in - check if they're an admin
            const userEmail = session.user.email;

            if (ADMIN_EMAILS.includes(userEmail)) {
                // Authorized admin
                overlay.style.display = 'none';
            } else {
                // Not an admin
                loginMessage.textContent = `Signed in as ${userEmail}`;
                loginBtn.style.display = 'none';
                errorMsg.style.display = 'block';
            }
        } else {
            // Not logged in - show login button
            overlay.style.display = 'flex';

            loginBtn.addEventListener('click', async () => {
                const redirectUrl = window.location.href;
                await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: redirectUrl }
                });
            });
        }
    }

    loadApiKey() {
        const savedKey = localStorage.getItem('movx_tmdb_api_key');
        if (savedKey) {
            CONFIG.TMDB_API_KEY = savedKey;
            document.getElementById('tmdbApiKey').value = savedKey;
        }
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // TMDB Search
        document.getElementById('searchBtn').addEventListener('click', () => this.searchTMDB());
        document.getElementById('tmdbSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchTMDB();
        });

        // Manual add form
        document.getElementById('manualAddForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addManualContent();
        });

        // Content type toggle
        document.getElementById('contentType').addEventListener('change', (e) => {
            const tvFields = document.querySelector('.tv-only');
            tvFields.style.display = e.target.value === 'tv' ? 'grid' : 'none';
        });

        // Translation button
        const translateBtn = document.getElementById('translateDescBtn');
        if (translateBtn) {
            translateBtn.addEventListener('click', async () => {
                const descTextarea = document.getElementById('manualDescription');
                const originalText = descTextarea.value.trim();

                if (!originalText) {
                    this.showToast('Please enter a description first', 'error');
                    return;
                }

                // Disable button and show loading state
                translateBtn.disabled = true;
                translateBtn.classList.add('translating');
                const originalHTML = translateBtn.innerHTML;
                translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';

                try {
                    const translatedText = await translator.translateToSinhala(originalText);
                    descTextarea.value = translatedText;
                    this.showToast('Translation complete!', 'success');
                } catch (error) {
                    console.error('Translation error:', error);
                    this.showToast('Translation failed. Check API key in config.js', 'error');
                } finally {
                    // Re-enable button
                    translateBtn.disabled = false;
                    translateBtn.classList.remove('translating');
                    translateBtn.innerHTML = originalHTML;
                }
            });
        }

        // Settings - API Key
        document.getElementById('saveApiKey').addEventListener('click', () => this.saveApiKey());

        // Settings - Clear data
        document.getElementById('clearAllData').addEventListener('click', () => this.clearAllData());

        // Settings - Export
        document.getElementById('exportData').addEventListener('click', () => this.exportData());

        // Settings - Import
        document.getElementById('importData').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));

        // Edit modal close
        document.getElementById('closeEditModal').addEventListener('click', () => {
            document.getElementById('editModal').classList.remove('active');
        });
    }

    switchTab(tabId) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });

        this.currentTab = tabId;
        // Refresh content if switching to list tabs
        if (tabId === 'movies') this.renderMovies();
        if (tabId === 'tvshows') this.renderTVShows();
    }

    async searchTMDB() {
        const query = document.getElementById('tmdbSearch').value.trim();
        if (!query) {
            this.showToast('Please enter a search query', 'error');
            return;
        }

        if (CONFIG.TMDB_API_KEY === 'YOUR_TMDB_API_KEY') {
            this.showToast('Please set your TMDB API key in Settings', 'error');
            return;
        }

        const grid = document.getElementById('searchResultsGrid');
        grid.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const results = await TMDB.search(query);

            if (results.length === 0) {
                grid.innerHTML = '<p class="placeholder-text">No results found</p>';
                return;
            }

            // Fetch existing to check for added status
            const [movies, shows] = await Promise.all([DB.getMovies(), DB.getTVShows()]);
            const existingIds = new Set([
                ...movies.map(m => m.tmdbId),
                ...shows.map(s => s.tmdbId)
            ]);

            grid.innerHTML = results
                .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
                .slice(0, 12)
                .map(item => this.createSearchResultCard(item, existingIds))
                .join('');

            // Bind add buttons
            grid.querySelectorAll('.add-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.addFromTMDB(btn.dataset.id, btn.dataset.type, btn);
                });
            });

        } catch (error) {
            console.error('Search error:', error);
            grid.innerHTML = '<p class="placeholder-text">Error searching TMDB. Check your API key.</p>';
        }
    }

    createSearchResultCard(item, existingIds) {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const type = item.media_type === 'tv' ? 'TV Show' : 'Movie';
        const poster = TMDB.getImageUrl(item.poster_path, 'poster');
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        // Check if already added
        const isAdded = existingIds.has(item.id);

        return `
            <div class="search-result-card">
                <img src="${poster}" alt="${title}" class="poster">
                <div class="info">
                    <div class="title">${title}</div>
                    <div class="meta">${type} • ${year} • ⭐ ${rating}</div>
                    <button class="add-btn ${isAdded ? 'added' : ''}" 
                            data-id="${item.id}" 
                            data-type="${item.media_type}"
                            ${isAdded ? 'disabled' : ''}>
                        ${isAdded ? '<i class="fas fa-check"></i> Added' : '<i class="fas fa-plus"></i> Add'}
                    </button>
                </div>
            </div>
        `;
    }

    async addFromTMDB(id, type, button) {
        button.innerHTML = '<span class="loading-spinner"></span>';
        button.disabled = true;

        try {
            let details;
            if (type === 'movie') {
                details = await TMDB.getMovieDetails(id);
            } else {
                details = await TMDB.getTVDetails(id);
            }

            if (!details) {
                throw new Error('Failed to fetch details');
            }

            const content = {
                tmdbId: details.id,
                title: details.title || details.name,
                description: details.overview,
                platform: 'FBFLIX',
                year: (details.release_date || details.first_air_date || '').substring(0, 4),
                rating: details.vote_average,
                genres: details.genres?.map(g => g.name) || [],
                backdrop: TMDB.getBackdropUrl(details.backdrop_path),
                poster: TMDB.getImageUrl(details.poster_path),
                ageRating: details.adult ? '18+' : 'PG-13',
                runtime: details.runtime ? `${details.runtime} min` : null,
                seasons: details.number_of_seasons || null,
                videoUrl: ''
            };

            // Open modal to add Video URL
            this.openAddWithUrlModal(content, type);

            // Reset button visual state
            button.innerHTML = '<i class="fas fa-plus"></i> Add';
            button.disabled = false;

        } catch (error) {
            console.error('Add error:', error);
            button.innerHTML = '<i class="fas fa-plus"></i> Add';
            button.disabled = false;
            this.showToast('Failed to add content', 'error');
        }
    }

    openAddWithUrlModal(content, type) {
        const modal = document.getElementById('editModal');
        const modalBody = document.getElementById('editModalBody');
        const isTv = type === 'tv';

        modalBody.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 10px;">Add ${isTv ? 'TV Show' : 'Movie'}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">
                    ${isTv
                ? 'Click "Add to Library" to save the show. You can add episodes and seasons in the Edit menu afterwards.'
                : 'Enter the CDN Video URL to complete adding this content.'}
                </p>
            </div>
            <form id="addUrlForm" class="manual-form">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" value="${content.title}" readonly style="opacity: 0.7; cursor: not-allowed;">
                </div>
                 <div class="form-group" style="${isTv ? 'display:none;' : ''}">
                    <label>Video / Stream URL (CDN)</label>
                    <input type="url" id="addVideoUrl" ${isTv ? '' : 'required'} placeholder="https://example.com/video.mp4" autofocus>
                </div>
                 <div class="form-group">
                    <label>Platform</label>
                     <select id="addPlatform">
                        ${CONFIG.PLATFORMS.map(p =>
                    `<option value="${p.name}" ${p.name === 'FBFLIX' ? 'selected' : ''}>${p.name}</option>`
                ).join('')}
                    </select>
                </div>
                <button type="submit" class="submit-btn" style="width: 100%; margin-top: 20px;">
                     <i class="fas fa-plus"></i> Add to Library
                </button>
            </form>
        `;

        const form = document.getElementById('addUrlForm');
        // Handle submit
        const handleSubmit = async (e) => {
            e.preventDefault();
            const videoInput = document.getElementById('addVideoUrl');
            content.videoUrl = videoInput ? videoInput.value.trim() : '';
            content.platform = document.getElementById('addPlatform').value;

            if (await this.finalAddContent(content, type)) {
                modal.classList.remove('active');
            }
        };

        form.addEventListener('submit', handleSubmit);
        modal.classList.add('active');

        // Focus video url input only for movies
        if (!isTv) setTimeout(() => document.getElementById('addVideoUrl').focus(), 100);
    }

    async finalAddContent(content, type) {
        let success;
        if (type === 'movie') {
            success = await DB.addMovie(content);
            if (success) await this.renderMovies();
        } else {
            success = await DB.addTVShow(content);
            if (success) await this.renderTVShows();
        }

        if (success) {
            this.showToast(`${content.title} added successfully!`, 'success');
            await this.updateContentCount();
            return true;
        } else {
            this.showToast('Content already exists or error.', 'error');
            return false;
        }
    }

    async addManualContent() {
        const type = document.getElementById('contentType').value;
        const title = document.getElementById('manualTitle').value.trim();

        if (!title) {
            this.showToast('Title is required', 'error');
            return;
        }

        const content = {
            tmdbId: Date.now(), // Use timestamp as unique ID for manual entries
            title: title,
            description: document.getElementById('manualDescription').value.trim(),
            platform: document.getElementById('platform').value,
            year: document.getElementById('manualYear').value,
            rating: parseFloat(document.getElementById('manualRating').value) || 0,
            genres: document.getElementById('manualGenres').value.split(',').map(g => g.trim()).filter(g => g),
            poster: document.getElementById('manualPoster').value.trim(),
            backdrop: document.getElementById('manualBackdrop').value.trim(),
            ageRating: document.getElementById('manualAgeRating').value,
            videoUrl: document.getElementById('manualVideoUrl').value.trim(),
            facebookVideoId: document.getElementById('manualFacebookVideoId').value.trim()
        };

        if (type === 'tv') {
            content.seasons = parseInt(document.getElementById('manualSeasons').value) || 1;
            content.runtime = document.getElementById('manualRuntime').value.trim();
        }

        let success;
        if (type === 'movie') {
            success = await DB.addMovie(content);
            if (success) await this.renderMovies();
        } else {
            success = await DB.addTVShow(content);
            if (success) await this.renderTVShows();
        }

        if (success) {
            this.showToast(`${title} added successfully!`, 'success');
            document.getElementById('manualAddForm').reset();
            await this.updateContentCount();
        } else {
            this.showToast('Content already exists', 'error');
        }
    }

    async renderMovies() {
        const movies = await DB.getMovies();
        const grid = document.getElementById('moviesGrid');
        const count = document.getElementById('moviesCount');

        count.textContent = `${movies.length} movies`;

        if (movies.length === 0) {
            grid.innerHTML = '<p class="placeholder-text">No movies added yet</p>';
            return;
        }

        grid.innerHTML = movies.map(movie => this.createContentItem(movie, 'movie')).join('');
        this.bindContentActions('movie');
    }

    async renderTVShows() {
        const shows = await DB.getTVShows();
        const grid = document.getElementById('tvShowsGrid');
        const count = document.getElementById('tvShowsCount');

        count.textContent = `${shows.length} shows`;

        if (shows.length === 0) {
            grid.innerHTML = '<p class="placeholder-text">No TV shows added yet</p>';
            return;
        }

        grid.innerHTML = shows.map(show => this.createContentItem(show, 'tv')).join('');
        this.bindContentActions('tv');
    }

    createContentItem(item, type) {
        const poster = item.poster || 'https://via.placeholder.com/200x300/1a1a1a/666666?text=No+Poster';
        const rating = item.rating ? Number(item.rating).toFixed(1) : 'N/A';
        // Note: item.id is from Supabase (probably numeric or uuid)
        return `
            <div class="content-item" data-id="${item.id}" data-type="${type}">
                <div class="poster-wrapper">
                    <img src="${poster}" alt="${item.title}" class="poster">
                    <div class="actions">
                        <button class="action-btn edit" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="info">
                    <div class="title">${item.title}</div>
                    <div class="meta">
                        <span>${item.year || 'N/A'}</span>
                        <span>⭐ ${rating}</span>
                    </div>
                    <div class="platform">${item.platform || 'FBFLIX'}</div>
                </div>
            </div>
        `;
    }

    bindContentActions(type) {
        const gridId = type === 'movie' ? 'moviesGrid' : 'tvShowsGrid';
        const grid = document.getElementById(gridId);

        grid.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.content-item');
                this.openEditModal(item.dataset.id, item.dataset.type);
            });
        });

        grid.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.content-item');
                this.deleteContent(item.dataset.id, item.dataset.type);
            });
        });
    }

    async openEditModal(id, type) {
        const modal = document.getElementById('editModal');
        const modalBody = document.getElementById('editModalBody');

        // Get content
        let content;
        if (type === 'movie') {
            const movies = await DB.getMovies();
            content = movies.find(m => m.id == id); // Loose equality for string/num
        } else {
            const shows = await DB.getTVShows();
            content = shows.find(s => s.id == id);
        }

        if (!content) return;

        modalBody.innerHTML = `
            <form id="editForm" class="manual-form">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="editTitle" value="${content.title}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="editDescription" rows="3">${content.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Platform</label>
                        <select id="editPlatform">
                            ${CONFIG.PLATFORMS.map(p =>
            `<option value="${p.name}" ${content.platform === p.name ? 'selected' : ''}>${p.name}</option>`
        ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Year</label>
                        <input type="number" id="editYear" value="${content.year || ''}">
                    </div>
                </div>
                
                ${type === 'movie' ? `
                <div class="form-group">
                    <label>Video URL</label>
                    <input type="url" id="editVideoUrl" value="${content.videoUrl || ''}" placeholder="https://...">
                </div>
                 <div class="form-group">
                    <label>Facebook Video ID</label>
                    <input type="text" id="editFacebookVideoId" value="${content.facebookVideoId || ''}" placeholder="e.g. 123456789">
                </div>
                ` : ''}

                <div class="form-group">
                    <label>Poster URL</label>
                    <input type="url" id="editPoster" value="${content.poster || ''}">
                </div>

                ${type === 'tv' ? `
                <div class="episodes-section" style="margin-top: 30px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                    <h3>Manage Episodes</h3>
                    <div style="margin-bottom: 15px;">
                        <label>Select Season</label>
                        <select id="seasonSelect" style="width: 100%; padding: 10px; background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px;">
                             <option value="" disabled selected>Loading seasons...</option>
                        </select>
                    </div>
                    <div id="episodesList" style="margin-bottom: 20px; max-height: 400px; overflow-y: auto; padding-right: 5px;">
                        <p style="color: var(--text-muted); text-align: center; padding: 20px;">Select a season to view episodes.</p>
                    </div>
                    <button type="button" id="btnSaveSeason" class="submit-btn" style="width: 100%; display: none; background: var(--accent-blue);">
                         <i class="fas fa-save"></i> Save Season URLs
                    </button>
                </div>
                ` : ''}

                <button type="submit" class="submit-btn" style="margin-top: 20px;">
                    <i class="fas fa-save"></i>
                    Save Content Metadata
                </button>
            </form>
        `;

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit(id, type);
        });

        if (type === 'tv') {
            await this.setupEpisodesManager(content.id, content.tmdbId);
        }

        modal.classList.add('active');
    }

    async saveEdit(id, type) {
        const titleInput = document.getElementById('editTitle');
        const descInput = document.getElementById('editDescription');
        const platformInput = document.getElementById('editPlatform');
        const yearInput = document.getElementById('editYear');
        const videoInput = document.getElementById('editVideoUrl');
        const posterInput = document.getElementById('editPoster');

        const updates = {
            title: titleInput ? titleInput.value.trim() : '',
            description: descInput ? descInput.value.trim() : '',
            platform: platformInput ? platformInput.value : '',
            year: yearInput ? yearInput.value : '',
            poster: posterInput ? posterInput.value.trim() : ''
        };

        if (videoInput) {
            updates.videoUrl = videoInput.value.trim();
        }

        const fbInput = document.getElementById('editFacebookVideoId');
        if (fbInput) {
            updates.facebookVideoId = fbInput.value.trim();
        }

        let result;
        if (type === 'movie') {
            result = await DB.updateMovie(id, updates);
            if (result) await this.renderMovies();
        } else {
            result = await DB.updateTVShow(id, updates);
            if (result) await this.renderTVShows();
        }

        if (result) {
            document.getElementById('editModal').classList.remove('active');
            this.showToast('Content updated successfully!', 'success');
        } else {
            this.showToast('Update failed!', 'error');
        }
    }

    async deleteContent(id, type) {
        if (!confirm('Are you sure you want to delete this content?')) return;

        let result;
        if (type === 'movie') {
            result = await DB.removeMovie(id);
            if (result) await this.renderMovies();
        } else {
            result = await DB.removeTVShow(id);
            if (result) await this.renderTVShows();
        }

        if (result) {
            await this.updateContentCount();
            this.showToast('Content deleted', 'success');
        } else {
            this.showToast('Deletion failed', 'error');
        }
    }

    async updateContentCount() {
        const [movies, shows] = await Promise.all([DB.getMovies(), DB.getTVShows()]);
        document.getElementById('contentCount').textContent = `${(movies?.length || 0) + (shows?.length || 0)} items`;
    }

    saveApiKey() {
        const key = document.getElementById('tmdbApiKey').value.trim();
        if (!key) {
            this.showToast('Please enter an API key', 'error');
            return;
        }

        localStorage.setItem('movx_tmdb_api_key', key);
        CONFIG.TMDB_API_KEY = key;
        this.showToast('API key saved!', 'success');
    }

    async clearAllData() {
        if (!confirm('Are you sure you want to delete ALL content? This cannot be undone.')) return;
        if (!confirm('This is your final warning. All movies and TV shows will be deleted.')) return;

        // Implement deletion from Supabase one by one or create a clear function
        // For simplicity and safety against massive deletion without a specific procedure:
        // Supabase doesn't support 'truncate' via client effortlessly without RLS setup permissions sometimes
        // We will fetch all and delete for now.

        // This is dangerous but requested.
        const [movies, shows] = await Promise.all([DB.getMovies(), DB.getTVShows()]);

        for (const m of movies) await DB.removeMovie(m.id);
        for (const s of shows) await DB.removeTVShow(s.id);

        localStorage.removeItem(CONFIG.STORAGE_KEYS.watchlist);

        await this.renderMovies();
        await this.renderTVShows();
        await this.updateContentCount();
        this.showToast('All data cleared', 'success');
    }

    async exportData() {
        const [movies, shows] = await Promise.all([DB.getMovies(), DB.getTVShows()]);
        const data = {
            movies: movies,
            tvShows: shows,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fbflix-library-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Library exported successfully!', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                let count = 0;

                if (data.movies && Array.isArray(data.movies)) {
                    for (const m of data.movies) {
                        delete m.id; // Let Supabase gen ID
                        delete m.created_at;
                        if (await DB.addMovie(m)) count++;
                    }
                }
                if (data.tvShows && Array.isArray(data.tvShows)) {
                    for (const s of data.tvShows) {
                        delete s.id;
                        delete s.created_at;
                        if (await DB.addTVShow(s)) count++;
                    }
                }

                await this.renderMovies();
                await this.renderTVShows();
                await this.updateContentCount();
                this.showToast(`Imported ${count} items successfully!`, 'success');

            } catch (error) {
                console.error('Import error:', error);
                this.showToast('Failed to import file', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- Improved Episodes Logic (TMDB Based) ---
    async setupEpisodesManager(tvShowId, tmdbId) {
        window.adminApp = this;
        const seasonSelect = document.getElementById('seasonSelect');
        const list = document.getElementById('episodesList');
        const btnSave = document.getElementById('btnSaveSeason');

        // 1. Fetch TV Details from TMDB to get seasons
        const tmdbDetails = await TMDB.getTVDetails(tmdbId);
        if (!tmdbDetails || !tmdbDetails.seasons) {
            seasonSelect.innerHTML = '<option>Error loading seasons</option>';
            return;
        }

        // 2. Populate Season Select
        seasonSelect.innerHTML = '<option value="" disabled selected>Select Season...</option>' +
            tmdbDetails.seasons
                .filter(s => s.season_number > 0) // Filter out specials if desired, or keep them
                .map(s => `<option value="${s.season_number}">Season ${s.season_number} (${s.episode_count} Episodes)</option>`)
                .join('');

        // 3. Handle Season Change
        seasonSelect.onchange = async (e) => {
            const seasonNum = e.target.value;
            // Render UI state
            list.innerHTML = '<div style="text-align:center; padding: 20px;"><div class="spinner"></div><p>Loading metadata...</p></div>';
            btnSave.style.display = 'none';

            // Fetch TMDB Season Details (Episodes)
            const seasonData = await TMDB.getSeasonDetails(tmdbId, seasonNum);
            // Fetch our Saved Episodes (Local DB)
            const savedEpisodes = await DB.getEpisodes(tvShowId); // This returns ALL seasons

            if (!seasonData || !seasonData.episodes) {
                list.innerHTML = '<p>Error loading episodes from TMDB</p>';
                return;
            }

            // Filter saved episodes for this season
            const currentSeasonSaved = savedEpisodes.filter(ep => ep.season_number == seasonNum);

            // Render List
            list.innerHTML = seasonData.episodes.map(ep => {
                const saved = currentSeasonSaved.find(s => s.episode_number === ep.episode_number);
                const currentUrl = saved ? saved.video_url : '';

                return `
                    <div class="episode-item" data-ep="${ep.episode_number}" style="background: var(--bg-tertiary); padding: 15px; margin-bottom: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                            <span style="font-weight:600; color:var(--accent-yellow);">Episode ${ep.episode_number}</span>
                            <span style="font-size: 0.9rem; color: var(--text-muted);">${ep.air_date || ''}</span>
                        </div>
                        <div style="font-weight: 500; margin-bottom: 10px;">${ep.name}</div>
                        
                        <div class="form-group" style="margin-bottom: 0;">
                            <input type="url" class="ep-url-input" 
                                data-title="${ep.name.replace(/"/g, '&quot;')}"
                                data-season="${seasonNum}"
                                data-number="${ep.episode_number}"
                                data-saved-id="${saved ? saved.id : ''}"
                                value="${currentUrl}"
                                placeholder="Paste CDN URL here..."
                                style="width: 100%; background: var(--bg-primary);">
                        </div>
                        <div class="form-group" style="margin-bottom: 0; margin-top: 5px;">
                            <input type="text" class="ep-fbid-input"
                                value="${saved ? (saved.facebook_video_id || '') : ''}"
                                placeholder="Facebook Video ID"
                                style="width: 100%; background: var(--bg-primary);">
                        </div>
                    </div>
                 `;
            }).join('');

            btnSave.style.display = 'block';
        };

        // 4. Handle Save
        btnSave.onclick = async () => {
            const inputs = document.querySelectorAll('.ep-url-input');
            let updatedCount = 0;
            let addedCount = 0;

            btnSave.textContent = 'Saving...';
            btnSave.disabled = true;

            for (const input of inputs) {
                const url = input.value.trim();
                // Find corresponding FB ID input (it's the next sibling's child usually, or we can select by index if we iterate carefully, but let's query relative)
                // Actually, the loop 'for (const input of inputs)' makes it hard to get the sibling reliable unless structure is fixed.
                // Let's change the selector strategy above or in this loop.
                // Helper:
                const parent = input.closest('.episode-item');
                const fbIdInput = parent.querySelector('.ep-fbid-input');
                const fbId = fbIdInput ? fbIdInput.value.trim() : null;

                const savedId = input.dataset.savedId;
                const season = parseInt(input.dataset.season);
                const number = parseInt(input.dataset.number);
                const title = input.dataset.title;

                if (url || fbId) { // Save if either URL or FB ID is present
                    if (savedId) {
                        // Update existing
                        await DB.updateEpisode(savedId, { video_url: url, facebook_video_id: fbId });
                        updatedCount++;
                    } else {
                        // Add new
                        await DB.addEpisode({
                            tv_show_id: tvShowId,
                            season_number: season,
                            episode_number: number,
                            title: title,
                            video_url: url,
                            facebook_video_id: fbId
                        });
                        addedCount++;
                    }
                } else if (savedId && !url && !fbId) {
                    // If both removed, delete entry
                    await DB.deleteEpisode(savedId);
                    input.dataset.savedId = ''; // Remove ID
                }
            }

            // Refresh data to get new IDs
            seasonSelect.onchange({ target: { value: seasonSelect.value } });

            btnSave.textContent = 'Save Season URLs';
            btnSave.disabled = false;
            this.showToast(`Saved! (${addedCount} added, ${updatedCount} updated)`, 'success');
        };
    }

    async deleteEpisode(id, showId) {
        if (!confirm('Are you sure you want to delete this episode?')) return;

        const success = await DB.deleteEpisode(id);
        if (success) {
            // The new setupEpisodesManager handles rendering, so we don't need to call renderEpisodesList directly here.
            // Instead, we can trigger a re-render of the current season if needed, or rely on the user to re-select.
            // For now, we'll just show a toast. If the episode was part of the currently displayed season,
            // the user would need to re-select the season to see the change reflected.
            // A more robust solution would be to trigger seasonSelect.onchange() if the deleted episode was in the current season.
            this.showToast('Episode deleted', 'success');
        } else {
            this.showToast('Failed to delete episode', 'error');
        }
    }
}

// Initialize admin app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});
