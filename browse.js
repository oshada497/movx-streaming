document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'movie';
    const pageTitle = document.getElementById('pageTitle');
    const resultsCount = document.getElementById('resultsCount');
    const contentGrid = document.getElementById('contentGrid');

    let items = [];
    let title = '';

    // Load content based on type
    switch (type) {
        case 'movie':
            title = 'All Movies';
            items = Storage.getMovies().map(m => ({ ...m, mediaType: 'movie' }));
            break;
        case 'tv':
            title = 'All TV Shows';
            items = Storage.getTVShows().map(s => ({ ...s, mediaType: 'tv' }));
            break;
        case 'trending':
            title = 'Trending Now';
            items = Storage.getAllContent().slice(0, 20); // Top 20 trending
            break;
        default:
            title = 'Browse';
            items = Storage.getAllContent();
    }

    // Set Active Nav Link
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (type === 'movie') document.getElementById('navMovies')?.classList.add('active');
    if (type === 'tv') document.getElementById('navTV')?.classList.add('active');


    // Update Header
    pageTitle.textContent = title;
    resultsCount.textContent = `${items.length} titles found`;

    // Render Grid
    renderGrid(items, contentGrid);
});

function renderGrid(items, container) {
    if (items.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">
                <h2>No content found</h2>
                <p>Check back later for updates.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => createCard(item)).join('');
}

function createCard(item) {
    const poster = item.poster || 'https://via.placeholder.com/180x270/1a1a1a/666666?text=No+Poster';
    const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
    const type = item.mediaType || 'movie';
    const link = `details.html?id=${item.tmdbId || item.id}&type=${type}`;

    return `
        <a href="${link}" class="content-card" style="text-decoration: none; color: inherit;">
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
        </a>
    `;
}
