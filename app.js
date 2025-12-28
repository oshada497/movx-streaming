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

    setupAuth() {
        // Use the centralized UI handler from auth.js
        window.auth.setupHeaderUI();
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

            // Preload all hero images for smooth transitions
            this.preloadAllHeroImages();

            this.updateHero();
        } else {
            // Show demo content if no content is added
            this.showDemoContent();
        }

        // Render content rows
        await this.renderMoviesRow();
        await this.renderTVShowsRow();
        await this.renderTrendingRow();
    }

    preloadAllHeroImages() {
        this.heroContent.forEach(content => {
            if (content.backdrop) {
                const img = new Image();
                img.src = content.backdrop;
            }
            if (content.poster) {
                const img = new Image();
                img.src = content.poster;
            }
        });
    }

    showDemoContent() {
        // Demo hero content when no content is added
        this.heroContent = [
            {
                title: 'Add Your First Movie',
                description: 'Start your streaming journey by adding your favorite content to your library.',
                platform: 'FBFLIX',
                year: '2024',
                rating: 10,
                genres: ['Tutorial'],
                backdrop: '',
                poster: ''
            }
        ];
        this.updateHero();
    }

    async updateHero() {
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

        // Preload and update background with smooth fade
        if (content.backdrop) {
            // Preload the image first
            const img = new Image();
            img.onload = () => {
                // Only transition once image is loaded
                heroBackground.style.opacity = '0.7';

                setTimeout(() => {
                    heroBackground.style.backgroundImage = `url(${content.backdrop})`;
                    heroBackground.style.opacity = '1';
                }, 150);
            };
            img.src = content.backdrop;
        } else {
            heroBackground.style.opacity = '0.7';
            setTimeout(() => {
                heroBackground.style.backgroundImage = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
                heroBackground.style.opacity = '1';
            }, 150);
        }

        // Update content
        document.getElementById('platformBadge').textContent = content.platform || 'FBFLIX';
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
        posterImg.src = content.poster || 'https://placehold.co/180x270/1a1a1a/666666?text=No+Poster';
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

        // Preload next image in background for even smoother transitions
        this.preloadNextHeroImage();
    }

    preloadNextHeroImage() {
        const nextIndex = (this.currentHeroIndex + 1) % this.heroContent.length;
        const nextContent = this.heroContent[nextIndex];

        if (nextContent && nextContent.backdrop) {
            const img = new Image();
            img.src = nextContent.backdrop;
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

        // Search in local database (your site's content)
        const results = await DB.search(query);

        if (results.length === 0) {
            searchResults.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No results found in your library</p>';
            searchModal.classList.add('active');
            return;
        }

        searchResults.innerHTML = results.slice(0, 8).map(item => {
            const title = item.title;
            const year = item.year || '';
            const type = item.mediaType === 'tv' ? 'TV Show' : 'Movie';
            const poster = item.poster || 'https://placehold.co/300x450/1a1a1a/666666?text=No+Poster';

            return `
                <div class="search-result-item" data-id="${item.tmdbId || item.id}" data-type="${item.mediaType}">
                    <img src="${poster}" alt="${title}" class="search-result-poster" loading="lazy">
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


    async renderTrendingRow() {
        const container = document.getElementById('trendingRow');

        try {
            // Get trending content based on views in last 30 days
            const trendingContent = await DB.getTrendingContent(30, 6);

            if (trendingContent.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Add content and start watching to see trending items!</p>';
                return;
            }

            // For each trending item, fetch full details to get all necessary data
            const enrichedContent = await Promise.all(trendingContent.map(async (item) => {
                const fullContent = item.mediaType === 'movie'
                    ? await DB.getMovieByTmdbId(item.tmdbId)
                    : await DB.getTVShowByTmdbId(item.tmdbId);

                return {
                    ...fullContent,
                    mediaType: item.mediaType,
                    viewCount: item.viewCount
                };
            }));

            container.innerHTML = enrichedContent.map(item =>
                this.createTrendingCard(item, item.mediaType)
            ).join('');
            this.bindCardEvents(container);
        } catch (e) {
            console.error('Error loading trending:', e);
            // Fallback to all content if trending fails
            const allContent = await DB.getAllContent();
            container.innerHTML = allContent.slice(0, 6).map(item =>
                this.createContentCard(item, item.mediaType)
            ).join('');
            this.bindCardEvents(container);
        }
    }

    createTrendingCard(item, type) {
        const poster = item.poster || 'https://placehold.co/180x270/1a1a1a/666666?text=No+Poster';
        const rating = item.rating ? Number(item.rating).toFixed(1) : 'N/A';
        const viewCount = item.viewCount || item.view_count || 0;

        return `
            <div class="content-card" data-id="${item.tmdbId || item.id}" data-tmdb="${item.tmdbId}" data-type="${type}">
                <div class="rating-badge">
                    <i class="fas fa-star"></i>
                    ${rating}
                </div>
                <div class="trending-badge" title="${viewCount} views">
                    <i class="fas fa-fire"></i>
                    ${this.formatViews(viewCount)}
                </div>
                <img src="${poster}" alt="${item.title}" class="card-poster" loading="lazy">
                <div class="card-overlay">
                    <h4 class="card-title">${item.title}</h4>
                    <div class="card-meta">
                        <span>${item.year || ''}</span>
                        <span>${type === 'tv' ? 'TV' : 'Movie'}</span>
                        <span class="views-text">${viewCount} views</span>
                    </div>
                </div>
            </div>
        `;
    }

    formatViews(count) {
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    }


    createContentCard(item, type) {
        const poster = item.poster || 'https://placehold.co/180x270/1a1a1a/666666?text=No+Poster';
        const rating = item.rating ? Number(item.rating).toFixed(1) : 'N/A';

        // Use tmdbId for linking if available, otherwise fallback (DB items should have tmdbId)
        return `
            <div class="content-card" data-id="${item.tmdbId || item.id}" data-tmdb="${item.tmdbId}" data-type="${type}">
                <div class="rating-badge">
                    <i class="fas fa-star"></i>
                    ${rating}
                </div>
                <img src="${poster}" alt="${item.title}" class="card-poster" loading="lazy">
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
                <img src="${ep.thumbnail || 'https://placehold.co/280x160/1a1a1a/666666?text=Episode'}" 
                     alt="Episode ${index + 1}" class="episode-thumbnail" loading="lazy">
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
