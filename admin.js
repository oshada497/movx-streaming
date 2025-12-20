// ===== Admin Panel Application =====

class AdminApp {
    constructor() {
        this.currentTab = 'add';
        this.init();
    }

    init() {
        this.loadApiKey();
        this.bindEvents();
        this.updateContentCount();
        this.renderMovies();
        this.renderTVShows();
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

            grid.innerHTML = results
                .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
                .slice(0, 12)
                .map(item => this.createSearchResultCard(item))
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

    createSearchResultCard(item) {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const type = item.media_type === 'tv' ? 'TV Show' : 'Movie';
        const poster = TMDB.getImageUrl(item.poster_path, 'poster');
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        // Check if already added
        const isAdded = item.media_type === 'movie'
            ? Storage.getMovies().some(m => m.tmdbId === item.id)
            : Storage.getTVShows().some(s => s.tmdbId === item.id);

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
                platform: 'MOVX',
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

            let success;
            if (type === 'movie') {
                success = Storage.addMovie(content);
                this.renderMovies();
            } else {
                success = Storage.addTVShow(content);
                this.renderTVShows();
            }

            if (success) {
                button.innerHTML = '<i class="fas fa-check"></i> Added';
                button.classList.add('added');
                this.showToast(`${content.title} added successfully!`, 'success');
                this.updateContentCount();
            } else {
                button.innerHTML = '<i class="fas fa-check"></i> Already Added';
                button.classList.add('added');
            }

        } catch (error) {
            console.error('Add error:', error);
            button.innerHTML = '<i class="fas fa-plus"></i> Add';
            button.disabled = false;
            this.showToast('Failed to add content', 'error');
        }
    }

    addManualContent() {
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
            videoUrl: document.getElementById('manualVideoUrl').value.trim()
        };

        if (type === 'tv') {
            content.seasons = parseInt(document.getElementById('manualSeasons').value) || 1;
            content.runtime = document.getElementById('manualRuntime').value.trim();
        }

        let success;
        if (type === 'movie') {
            success = Storage.addMovie(content);
            this.renderMovies();
        } else {
            success = Storage.addTVShow(content);
            this.renderTVShows();
        }

        if (success) {
            this.showToast(`${title} added successfully!`, 'success');
            document.getElementById('manualAddForm').reset();
            this.updateContentCount();
        } else {
            this.showToast('Content already exists', 'error');
        }
    }

    renderMovies() {
        const movies = Storage.getMovies();
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

    renderTVShows() {
        const shows = Storage.getTVShows();
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
        const rating = item.rating ? item.rating.toFixed(1) : 'N/A';

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
                    <div class="platform">${item.platform || 'MOVX'}</div>
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
                this.deleteContent(parseInt(item.dataset.id), item.dataset.type);
            });
        });
    }

    openEditModal(id, type) {
        const modal = document.getElementById('editModal');
        const modalBody = document.getElementById('editModalBody');

        // Get content
        const content = type === 'movie'
            ? Storage.getMovies().find(m => m.id === parseInt(id))
            : Storage.getTVShows().find(s => s.id === parseInt(id));

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
                <div class="form-group">
                    <label>Video URL</label>
                    <input type="url" id="editVideoUrl" value="${content.videoUrl || ''}" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label>Poster URL</label>
                    <input type="url" id="editPoster" value="${content.poster || ''}">
                </div>
                <button type="submit" class="submit-btn">
                    <i class="fas fa-save"></i>
                    Save Changes
                </button>
            </form>
        `;

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit(parseInt(id), type);
        });

        modal.classList.add('active');
    }

    saveEdit(id, type) {
        const updates = {
            title: document.getElementById('editTitle').value.trim(),
            description: document.getElementById('editDescription').value.trim(),
            platform: document.getElementById('editPlatform').value,
            year: document.getElementById('editYear').value,
            videoUrl: document.getElementById('editVideoUrl').value.trim(),
            poster: document.getElementById('editPoster').value.trim()
        };

        if (type === 'movie') {
            Storage.updateMovie(id, updates);
            this.renderMovies();
        } else {
            Storage.updateTVShow(id, updates);
            this.renderTVShows();
        }

        document.getElementById('editModal').classList.remove('active');
        this.showToast('Content updated successfully!', 'success');
    }

    deleteContent(id, type) {
        if (!confirm('Are you sure you want to delete this content?')) return;

        if (type === 'movie') {
            Storage.removeMovie(id);
            this.renderMovies();
        } else {
            Storage.removeTVShow(id);
            this.renderTVShows();
        }

        this.updateContentCount();
        this.showToast('Content deleted', 'success');
    }

    updateContentCount() {
        const movies = Storage.getMovies().length;
        const tvShows = Storage.getTVShows().length;
        document.getElementById('contentCount').textContent = `${movies + tvShows} items`;
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

    clearAllData() {
        if (!confirm('Are you sure you want to delete ALL content? This cannot be undone.')) return;
        if (!confirm('This is your final warning. All movies and TV shows will be deleted.')) return;

        localStorage.removeItem(CONFIG.STORAGE_KEYS.movies);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.tvShows);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.watchlist);

        this.renderMovies();
        this.renderTVShows();
        this.updateContentCount();
        this.showToast('All data cleared', 'success');
    }

    exportData() {
        const data = {
            movies: Storage.getMovies(),
            tvShows: Storage.getTVShows(),
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movx-library-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Library exported successfully!', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.movies) {
                    Storage.saveMovies(data.movies);
                }
                if (data.tvShows) {
                    Storage.saveTVShows(data.tvShows);
                }

                this.renderMovies();
                this.renderTVShows();
                this.updateContentCount();
                this.showToast('Library imported successfully!', 'success');

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
}

// Initialize admin app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});
