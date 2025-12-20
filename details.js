document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const type = urlParams.get('type');

    if (!id || !type) {
        window.location.href = 'index.html';
        return;
    }

    await loadDetails(id, type);
});

async function loadDetails(id, type) {
    let details;

    // Attempt to get from API first (if connected) or fall back/mix with provided API logic
    // Assuming api.js provides TMDB class
    if (type === 'movie') {
        details = await TMDB.getMovieDetails(id);
    } else {
        details = await TMDB.getTVDetails(id);
    }

    if (!details) {
        document.getElementById('title').textContent = 'Content not found';
        return;
    }

    // Populate UI
    document.title = `${details.title || details.name} - MOVX`;

    // Backdrop
    const backdropUrl = TMDB.getBackdropUrl(details.backdrop_path);
    document.getElementById('backdrop').style.backgroundImage = `url(${backdropUrl})`;

    // Poster
    const posterUrl = TMDB.getImageUrl(details.poster_path);
    document.getElementById('poster').src = posterUrl;

    // Title
    document.getElementById('title').textContent = details.title || details.name;

    // Meta
    const year = (details.release_date || details.first_air_date || '').substring(0, 4);
    document.getElementById('year').textContent = year;

    const runtime = details.runtime ? `${details.runtime} min` : (details.number_of_seasons ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? 's' : ''}` : 'N/A');
    document.getElementById('runtime').textContent = runtime;

    const rating = details.vote_average ? `${details.vote_average.toFixed(1)} / 10` : 'N/A';
    document.getElementById('rating').textContent = rating;

    // Genres
    const genresContainer = document.getElementById('genres');
    genresContainer.innerHTML = (details.genres || []).map(g =>
        `<span class="details-genre-tag">${g.name}</span>`
    ).join('');

    // Description
    document.getElementById('description').textContent = details.overview || 'No description available.';


    // Watch Button Logic
    const watchBtn = document.getElementById('watchBtn');
    watchBtn.addEventListener('click', () => {
        // Simple player logic reused from app.js idea
        // In a real app, this might fetch a specific video stream
        openPlayer(details);
    });

    // Close Player Logic
    document.getElementById('closePlayer').addEventListener('click', () => {
        const playerModal = document.getElementById('playerModal');
        const playerContent = document.getElementById('playerContent');
        playerModal.classList.remove('active');
        playerContent.innerHTML = '';
    });
}

function openPlayer(content) {
    const playerModal = document.getElementById('playerModal');
    const playerContent = document.getElementById('playerContent');

    // Check if we have a stored video user (custom upload) or need to use an embed
    // For now, mirroring app.js behavior (often placeholders or specific logic)
    // Since we don't have access to the Storage class here easily unless we duplicate it or import it
    // let's try to see if there's a trailer or video.

    // NOTE: In the provided app.js, video playback relied on Storage.getAllContent() to find custom added videos.
    // If this is a TMDB item, we might not have a direct video link unless we hit the /videos endpoint.
    // For this implementation, I'll show a placeholder or try to find a trailer if available in 'details'.

    // If 'details' has 'videos' (often included in TMDB details response if append_to_response is used, otherwise extra call needed)
    // api.js getMovieDetails implementation:
    // async getMovieDetails(id) { ... const response = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=videos,credits,similar`); ... }

    let videoKey = null;
    if (content.videos && content.videos.results) {
        const trailer = content.videos.results.find(v => v.type === 'Trailer') || content.videos.results[0];
        if (trailer) videoKey = trailer.key;
    }

    if (videoKey) {
        playerContent.innerHTML = `
            <iframe src="https://www.youtube.com/embed/${videoKey}?autoplay=1" 
                    frameborder="0" 
                    allow="autoplay; encrypted-media" 
                    allowfullscreen>
            </iframe>`;
    } else {
        playerContent.innerHTML = `
            <div style="color: white; text-align: center; padding-top: 20%;">
                <h2>No Trailer Available</h2>
                <p>Sorry, we couldn't find a video for this title.</p>
            </div>
        `;
    }

    playerModal.classList.add('active');
}
