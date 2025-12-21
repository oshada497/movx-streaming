// ===== Main Application =====

class MovXApp {
    constructor() {
        this.currentHeroIndex = 0;
        this.heroContent = [];
        this.heroInterval = null;
        this.searchTimeout = null;

        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupAuth(); // Initialize Google Auth
        await this.loadContent();
        this.startHeroSlider();
    }

    async setupAuth() {
        const authBtn = document.getElementById('authBtn');

        // Check current session
        const { data: { session } } = await supabase.auth.getSession();
        this.updateAuthUI(session);

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            this.updateAuthUI(session);
        });

        // Handle Login/Logout Click
        // Handle Login/Logout Click
        // Handle Login/Profile Click
        authBtn.addEventListener('click', async () => {
            if (this.currentSession) {
                // Open Profile Modal
                this.openProfileModal();
            } else {
                // Login with Google
                const redirectUrl = window.location.href;
                await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: redirectUrl }
                });
            }
        });

        // Profile Modal Events
        document.getElementById('closeProfileModal').addEventListener('click', () => {
            document.getElementById('profileModal').classList.remove('active');
        });

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await supabase.auth.signOut();
            document.getElementById('profileModal').classList.remove('active');
        });

        document.getElementById('saveProfileBtn').addEventListener('click', () => this.saveProfile());
    }

    openProfileModal() {
        const modal = document.getElementById('profileModal');
        const user = this.currentSession.user;
        const meta = user.user_metadata;

        document.getElementById('profileNameInput').value = meta.full_name || meta.name || '';
        document.getElementById('profileAvatarInput').value = meta.avatar_url || '';
        document.getElementById('profileAvatarPreview').src = meta.avatar_url || 'https://via.placeholder.com/100';

        modal.classList.add('active');
    }

    async saveProfile() {
        const name = document.getElementById('profileNameInput').value;
        const avatarUrl = document.getElementById('profileAvatarInput').value;

        const { data, error } = await supabase.auth.updateUser({
            data: { full_name: name, avatar_url: avatarUrl }
        });

        if (error) {
            alert('Error updating profile: ' + error.message);
        } else {
            // Update local session reference
            this.currentSession = { ...this.currentSession, user: data.user };
            this.updateAuthUI(this.currentSession);
            document.getElementById('profileModal').classList.remove('active'); // Close modal
            alert('Profile updated successfully!');
        }
    }

    updateAuthUI(session) {
        this.currentSession = session;
        const authBtn = document.getElementById('authBtn');

        if (session) {
            // Logged In: Show User Avatar or Logout Icon
            const avatarUrl = session.user.user_metadata.avatar_url;
            if (avatarUrl) {
                authBtn.innerHTML = `<img src="${avatarUrl}" style="width: 28px; height: 28px; border-radius: 50%;">`;
            } else {
                authBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            }
            authBtn.title = `Logged in as ${session.user.email}. Click to Logout.`;
        } else {
            // Logged Out: Show Google Icon
            authBtn.innerHTML = '<i class="fab fa-google"></i>';
            authBtn.title = 'Login with Google';
        }
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const searchModal = document.getElementById('searchModal');

        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();

            if (query.length < 2) {
                searchModal.classList.remove('active');
                return;
            }

            this.searchTimeout = setTimeout(() => this.handleSearch(query), 300);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2) {
                searchModal.classList.add('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container') && !e.target.closest('.search-modal')) {
                searchModal.classList.remove('active');
            }
        });

        // Hero navigation
        document.getElementById('heroPrev').addEventListener('click', () => this.navigateHero(-1));
        document.getElementById('heroNext').addEventListener('click', () => this.navigateHero(1));

        // Watch Now button - Redirect to Details Page
        document.getElementById('watchNowBtn').addEventListener('click', () => {
            const content = this.heroContent[this.currentHeroIndex];
            if (content) {
                const id = content.tmdbId || content.id;
                const type = content.mediaType || 'movie';
                if (id) this.showContentDetails(id, type);
            }
        });

        // Watchlist button
        document.getElementById('watchlistBtn').addEventListener('click', () => this.toggleWatchlist());

        // Close player
        document.getElementById('closePlayer').addEventListener('click', () => this.closePlayer());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePlayer();
                document.getElementById('searchModal').classList.remove('active');
            }
            if (e.key === 'ArrowLeft') this.navigateHero(-1);
            if (e.key === 'ArrowRight') this.navigateHero(1);
        });

        // Main navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.dataset.section) {
                    e.preventDefault();
                    const section = link.dataset.section;
                    this.navigateToSection(section);

                    // Update active state
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });

        // Search button click
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    this.handleSearch(query);
                }
            });
        }
    }

    navigateToSection(section) {
        let targetElement;

        switch (section) {
            case 'home':
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Show all sections
                document.getElementById('trendingSection').style.display = 'block';
                document.getElementById('moviesSection').style.display = 'block';
                document.getElementById('tvShowsSection').style.display = 'block';
                break;
            case 'movies':
                // Show only movies section, hide TV shows
                document.getElementById('trendingSection').style.display = 'none';
                document.getElementById('moviesSection').style.display = 'block';
                document.getElementById('tvShowsSection').style.display = 'none';
                targetElement = document.getElementById('moviesSection');
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                break;
            case 'tvshows':
                // Show only TV shows section, hide movies
                document.getElementById('trendingSection').style.display = 'none';
                document.getElementById('moviesSection').style.display = 'none';
                document.getElementById('tvShowsSection').style.display = 'block';
                targetElement = document.getElementById('tvShowsSection');
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                break;
        }
    }

    async loadContent() {
        // Load content from Database
        const allContent = await DB.getAllContent();

        if (allContent.length > 0) {
            // Use stored content for hero
            this.heroContent = allContent.slice(0, 5);
            this.updateHero();
        } else {
            // Show demo content if no content is added
            this.showDemoContent();
        }

        // Render content rows
        await this.renderMoviesRow();
        await this.renderTVShowsRow();
        this.renderTrendingRow(allContent);
    }

    showDemoContent() {
        // Demo hero content when no content is added
        this.heroContent = [
            {
                title: 'Add Your First Movie',
                description: 'Go to the Admin Panel to add movies and TV shows. Use the gear icon in the sidebar or visit admin.html directly.',
                platform: 'MOVX',
                year: '2024',
                rating: 10,
                genres: ['Tutorial'],
                backdrop: '',
                poster: ''
            }
        ];
        this.updateHero();
    }

    updateHero() {
        if (this.heroContent.length === 0) return;

        const content = this.heroContent[this.currentHeroIndex];
        const heroBackground = document.getElementById('heroBackground');

        // Reset and trigger animations
        const heroLeft = document.querySelector('.hero-left');
        const heroPoster = document.getElementById('heroPoster');

        heroLeft.classList.remove('animating');
        heroPoster.classList.remove('animating');

        // Trigger reflow
        void heroLeft.offsetWidth;

        heroLeft.classList.add('animating');
        heroPoster.classList.add('animating');

        // Update background
        if (content.backdrop) {
            heroBackground.style.backgroundImage = `url(${content.backdrop})`;
        } else {
            heroBackground.style.backgroundImage = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
        }

        // Update content
        document.getElementById('platformBadge').textContent = content.platform || 'MOVX';
        document.getElementById('heroTitle').textContent = content.title;
        document.getElementById('heroRating').textContent = content.rating ? Number(content.rating).toFixed(1) : 'N/A';
        document.getElementById('heroSeasons').textContent = content.seasons ? `${content.seasons} Season${content.seasons > 1 ? 's' : ''}` : content.runtime || '';
        document.getElementById('heroYear').textContent = content.year || '';
        document.getElementById('heroAgeRating').textContent = content.ageRating || 'PG-13';
        document.getElementById('heroDescription').textContent = content.description || content.overview || 'No description available.';

        // Update genres
        const genresContainer = document.getElementById('heroGenres');
        // Genres handled as arrays of strings or objects
        const genres = Array.isArray(content.genres) ? content.genres : (content.genres ? [content.genres] : []);

        genresContainer.innerHTML = genres.map(g =>
            `<span class="genre-tag">${typeof g === 'object' ? g.name : g}</span>`
        ).join('');

        // Update poster
        const posterImg = document.getElementById('heroPosterImg');
        posterImg.src = content.poster || 'https://via.placeholder.com/180x270/1a1a1a/666666?text=No+Poster';
        posterImg.alt = content.title;

        // Update progress indicator
        const progressBar = document.getElementById('heroProgress');
        progressBar.style.width = `${((this.currentHeroIndex + 1) / this.heroContent.length) * 100}%`;

        // Update watchlist button
        const watchlistBtn = document.getElementById('watchlistBtn');
        const isInWatchlist = content.tmdbId && DB.isInWatchlist(content.tmdbId, content.mediaType);
        watchlistBtn.innerHTML = isInWatchlist
            ? '<i class="fas fa-check"></i> In Watchlist'
            : '<i class="fas fa-plus"></i> Watchlist';

        // Show/hide episodes section for TV shows
        const episodesSection = document.getElementById('episodesSection');
        if (content.mediaType === 'tv' && content.episodes) {
            episodesSection.style.display = 'block';
            this.renderEpisodes(content.episodes);
        } else {
            episodesSection.style.display = 'none';
        }
    }

    navigateHero(direction) {
        this.currentHeroIndex += direction;

        if (this.currentHeroIndex < 0) {
            this.currentHeroIndex = this.heroContent.length - 1;
        } else if (this.currentHeroIndex >= this.heroContent.length) {
            this.currentHeroIndex = 0;
        }

        this.updateHero();
        this.resetHeroInterval();
    }

    startHeroSlider() {
        this.heroInterval = setInterval(() => {
            this.navigateHero(1);
        }, CONFIG.HERO_INTERVAL);
    }

    resetHeroInterval() {
        clearInterval(this.heroInterval);
        this.startHeroSlider();
    }

    async handleSearch(query) {
        const searchModal = document.getElementById('searchModal');
        const searchResults = document.getElementById('searchResults');

        // Search in TMDB (User likely wants discovery)
        constresults = await TMDB.search(query);
        // We could also search local DB?
        // For now sticking to TMDB as "Search to Add" or "Search Universe"
        // But the main site "Search" usually searches available content. 
        // The previous implementation searched TMDB.
        // Let's improve it: Search TMDB AND Local DB? 
        // Or just TMDB as before since we redirect to details page which handles flow.
        const results = await TMDB.search(query);

        if (results.length === 0) {
            searchResults.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No results found</p>';
            searchModal.classList.add('active');
            return;
        }

        searchResults.innerHTML = results.slice(0, 8).map(item => {
            const title = item.title || item.name;
            const year = (item.release_date || item.first_air_date || '').substring(0, 4);
            const type = item.media_type === 'tv' ? 'TV Show' : 'Movie';
            const poster = TMDB.getImageUrl(item.poster_path, 'thumbnail');

            return `
                <div class="search-result-item" data-id="${item.id}" data-type="${item.media_type}">
                    <img src="${poster}" alt="${title}" class="search-result-poster">
                    <div class="search-result-info">
                        <div class="search-result-title">${title}</div>
                        <div class="search-result-meta">${type} • ${year}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind click events
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const type = item.dataset.type;
                this.showContentDetails(id, type);
                searchModal.classList.remove('active');
            });
        });

        searchModal.classList.add('active');
    }

    async showContentDetails(id, type) {
        window.location.href = `details.html?id=${id}&type=${type}`;
    }

    async renderMoviesRow() {
        const movies = await DB.getMovies();
        const container = document.getElementById('moviesRow');

        if (movies.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">No movies added yet. Go to Admin Panel to add movies.</p>';
            return;
        }

        container.innerHTML = movies.slice(0, 6).map(movie => this.createContentCard(movie, 'movie')).join('');
        this.bindCardEvents(container);
    }

    async renderTVShowsRow() {
        const shows = await DB.getTVShows();
        const container = document.getElementById('tvShowsRow');

        if (shows.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">No TV shows added yet. Go to Admin Panel to add shows.</p>';
            return;
        }

        container.innerHTML = shows.slice(0, 6).map(show => this.createContentCard(show, 'tv')).join('');
        this.bindCardEvents(container);
    }

    renderTrendingRow(allContent) {
        const container = document.getElementById('trendingRow');

        if (allContent.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Add content to see it here.</p>';
            return;
        }

        // Show most recently added as trending
        container.innerHTML = allContent.slice(0, 6).map(item =>
            this.createContentCard(item, item.mediaType)
        ).join('');
        this.bindCardEvents(container);
    }

    createContentCard(item, type) {
        const poster = item.poster || 'https://via.placeholder.com/180x270/1a1a1a/666666?text=No+Poster';
        const rating = item.rating ? Number(item.rating).toFixed(1) : 'N/A';

        // Use tmdbId for linking if available, otherwise fallback (DB items should have tmdbId)
        return `
            <div class="content-card" data-id="${item.tmdbId || item.id}" data-tmdb="${item.tmdbId}" data-type="${type}">
                <div class="rating-badge">
                    <i class="fas fa-star"></i>
                    ${rating}
                </div>
                <img src="${poster}" alt="${item.title}" class="card-poster">
                <div class="card-overlay">
                    <h4 class="card-title">${item.title}</h4>
                    <div class="card-meta">
                        <span>${item.year || ''}</span>
                        <span>${type === 'tv' ? 'TV' : 'Movie'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindCardEvents(container) {
        container.querySelectorAll('.content-card').forEach(card => {
            card.addEventListener('click', () => {
                const tmdbId = card.dataset.tmdb;
                const type = card.dataset.type;
                if (tmdbId) {
                    this.showContentDetails(tmdbId, type);
                } else {
                    // Fallback
                    this.showContentDetails(card.dataset.id, type);
                }
            });
        });
    }

    renderEpisodes(episodes) {
        const container = document.getElementById('episodesList');
        container.innerHTML = episodes.map((ep, index) => `
            <div class="episode-card" data-episode="${index + 1}">
                <img src="${ep.thumbnail || 'https://via.placeholder.com/280x160/1a1a1a/666666?text=Episode'}" 
                     alt="Episode ${index + 1}" class="episode-thumbnail">
                <div class="episode-info">
                    <div class="episode-number">S1-E${index + 1}</div>
                    <div class="episode-title">${ep.title || `Episode ${index + 1}`}</div>
                </div>
            </div>
        `).join('');
    }

    playContent() {
        // ... existing playContent logic relies on 'this.heroContent[index]' which is populated ...
        // ... logic is good ...
        const content = this.heroContent[this.currentHeroIndex];
        if (!content) return;

        const playerModal = document.getElementById('playerModal');
        const playerContent = document.getElementById('playerContent');

        // Check if content has a video URL
        if (content.videoUrl) {
            playerContent.innerHTML = `
                <iframe src="${content.videoUrl}" 
                        allowfullscreen 
                        allow="autoplay; encrypted-media"
                        frameborder="0">
                </iframe>
            `;
        } else {
            // Show placeholder message
            playerContent.innerHTML = `
                <div class="no-video-message">
                    <i class="fas fa-film"></i>
                    <h3>No Video Source Available</h3>
                    <p>Add a video URL in the Admin Panel to play this content.</p>
                </div>
            `;
        }

        playerModal.classList.add('active');
    }

    closePlayer() {
        const playerModal = document.getElementById('playerModal');
        const playerContent = document.getElementById('playerContent');

        playerModal.classList.remove('active');
        playerContent.innerHTML = '';
    }

    toggleWatchlist() {
        const content = this.heroContent[this.currentHeroIndex];
        if (!content || !content.tmdbId) return;

        const isInWatchlist = DB.isInWatchlist(content.tmdbId, content.mediaType);

        if (isInWatchlist) {
            DB.removeFromWatchlist(content.tmdbId, content.mediaType);
        } else {
            DB.addToWatchlist({
                tmdbId: content.tmdbId,
                mediaType: content.mediaType,
                title: content.title,
                poster: content.poster
            });
        }

        // Update button
        const watchlistBtn = document.getElementById('watchlistBtn');
        watchlistBtn.innerHTML = !isInWatchlist
            ? '<i class="fas fa-check"></i> In Watchlist'
            : '<i class="fas fa-plus"></i> Watchlist';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MovXApp();
});
