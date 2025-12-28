document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'movie';
    const pageTitle = document.getElementById('pageTitle');
    const resultsCount = document.getElementById('resultsCount');
    const contentGrid = document.getElementById('contentGrid');

    let items = [];
    let title = '';

    // Load content based on type
    try {
        switch (type) {
            case 'movie':
                title = 'All Movies';
                const movies = await DB.getMovies();
                items = movies.map(m => ({ ...m, mediaType: 'movie' }));
                break;
            case 'tv':
                title = 'All TV Shows';
                const shows = await DB.getTVShows();
                items = shows.map(s => ({ ...s, mediaType: 'tv' }));
                break;
            case 'trending':
                title = 'Trending Now';
                try {
                    // Try to get trending content first
                    const trendingContent = await DB.getTrendingContent(30, 50); // Last 30 days, top 50
                    if (trendingContent && trendingContent.length > 0) {
                        items = trendingContent;
                    } else {
                        // Fallback: Get all content and sort by view_count
                        console.log('[Browse] No trending data, falling back to all content sorted by views');
                        const allContent = await DB.getAllContent();
                        items = allContent.sort((a, b) => {
                            const aViews = Number(a.view_count || a.viewCount || 0);
                            const bViews = Number(b.view_count || b.viewCount || 0);
                            return bViews - aViews; // Highest first
                        });
                    }
                } catch (e) {
                    console.error('[Browse] Error loading trending:', e);
                    // Fallback to all content
                    items = await DB.getAllContent();
                }
                break;
            default:
                title = 'Browse';
                items = await DB.getAllContent();
        }
    } catch (e) {
        console.error('Error loading content:', e);
        items = [];
    }

    // Set Active Nav Link
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (type === 'movie') document.getElementById('navMovies')?.classList.add('active');
    if (type === 'tv') document.getElementById('navTV')?.classList.add('active');


    // Bind Search Events
    const searchInput = document.getElementById('searchInput');
    const searchModal = document.getElementById('searchModal');
    let searchTimeout = null;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            searchModal.classList.remove('active');
            return;
        }

        searchTimeout = setTimeout(async () => {
            // Search in local database (your site's content)
            const results = await DB.search(query);
            const searchResults = document.getElementById('searchResults');

            if (results.length === 0) {
                searchResults.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No results found in your library</p>';
                searchModal.classList.add('active');
                return;
            }

            searchResults.innerHTML = results.slice(0, 8).map(item => {
                const ntitle = item.title;
                const nyear = item.year || '';
                const ntype = item.mediaType === 'tv' ? 'TV Show' : 'Movie';
                const nposter = item.poster || 'https://placehold.co/300x450/1a1a1a/666666?text=No+Poster';

                return `
                    <div class="search-result-item" data-id="${item.tmdbId || item.id}" data-type="${item.mediaType}">
                        <img src="${nposter}" alt="${ntitle}" class="search-result-poster" loading="lazy">
                        <div class="search-result-info">
                            <div class="search-result-title">${ntitle}</div>
                            <div class="search-result-meta">${ntype} • ${nyear}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Bind click events
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const nid = item.dataset.id;
                    const ntype = item.dataset.type;
                    window.location.href = `details.html?id=${nid}&type=${ntype}`;
                });
            });

            searchModal.classList.add('active');
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container') && !e.target.closest('.search-modal')) {
            searchModal.classList.remove('active');
        }
    });

    // Update Header
    pageTitle.textContent = title;
    resultsCount.textContent = `${items.length} titles found`;

    // Render Grid
    renderGrid(items, contentGrid, type);

    // Initialize Auth UI
    window.auth.setupHeaderUI();
});

function renderGrid(items, container, type) {
    if (items.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">
                <h2>No content found</h2>
                <p>Check back later for updates.</p>
            </div>
        `;
        return;
    }

    // Use trending card for trending type
    if (type === 'trending') {
        container.innerHTML = items.map(item => createTrendingCard(item)).join('');
    } else {
        container.innerHTML = items.map(item => createCard(item)).join('');
    }
}

function createCard(item) {
    const poster = item.poster || 'https://placehold.co/180x270/1a1a1a/666666?text=No+Poster';
    const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
    const type = item.mediaType || 'movie';

    // Use pretty URL if slug is available, otherwise fall back to query params
    const link = item.slug ? `/${item.slug}` : `details.html?id=${item.tmdbId || item.id}&type=${type}`;

    return `
        <a href="${link}" class="content-card" style="text-decoration: none; color: inherit;">
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
        </a>
    `;
}

function createTrendingCard(item) {
    const poster = item.poster || 'https://placehold.co/180x270/1a1a1a/666666?text=No+Poster';
    const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
    const type = item.mediaType || 'movie';
    const viewCount = item.viewCount || item.view_count || 0;

    // Use pretty URL if slug is available, otherwise fall back to query params
    const link = item.slug ? `/${item.slug}` : `details.html?id=${item.tmdbId || item.id}&type=${type}`;

    return `
        <a href="${link}" class="content-card" style="text-decoration: none; color: inherit;">
            <div class="rating-badge">
                <i class="fas fa-star"></i>
                ${rating}
            </div>
            <div class="trending-badge" title="${viewCount} views">
                <i class="fas fa-fire"></i>
                ${formatViews(viewCount)}
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
        </a>
    `;
}

function formatViews(count) {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
}
