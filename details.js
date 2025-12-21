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

    // Check Supabase for content first (to get custom videoUrl)
    let storedItem = null;
    try {
        if (type === 'movie') {
            storedItem = await DB.getMovieByTmdbId(id);
        } else {
            storedItem = await DB.getTVShowByTmdbId(id);
        }
    } catch (e) {
        console.error('Error fetching details from DB:', e);
    }

    if (storedItem) {
        details = storedItem;
        console.log('Loaded from Supabase:', details);
    } else {
        // Fallback to TMDB API
        if (type === 'movie') {
            details = await TMDB.getMovieDetails(id);
        } else {
            details = await TMDB.getTVDetails(id);
        }
    }

    if (!details) {
        document.getElementById('title').textContent = 'Content not found';
        return;
    }

    // Populate UI
    document.title = `${details.title || details.name} - FBFLIX`;

    // Backdrop
    const backdropUrl = details.backdrop_path ? TMDB.getBackdropUrl(details.backdrop_path) : (details.backdrop || '');
    document.getElementById('backdrop').style.backgroundImage = `url(${backdropUrl})`;

    // Poster
    const posterUrl = details.poster_path ? TMDB.getImageUrl(details.poster_path) : (details.poster || '');
    document.getElementById('poster').src = posterUrl;

    // Title
    document.getElementById('title').textContent = details.title || details.name;

    // Meta
    const year = (details.release_date || details.first_air_date || details.year || '').substring(0, 4);
    document.getElementById('year').textContent = year;

    const runtime = details.runtime
        ? (details.runtime.toString().includes('min') ? details.runtime : `${details.runtime} min`)
        : (details.number_of_seasons ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? 's' : ''}` : 'N/A');
    document.getElementById('runtime').textContent = runtime;

    const ratingVal = details.vote_average || details.rating;
    const rating = ratingVal ? `${Number(ratingVal).toFixed(1)} / 10` : 'N/A';
    document.getElementById('rating').textContent = rating;

    // Genres
    const genresContainer = document.getElementById('genres');
    let genresList = [];
    if (details.genres) {
        if (typeof details.genres[0] === 'string') genresList = details.genres;
        else genresList = details.genres.map(g => g.name);
    }

    genresContainer.innerHTML = genresList.map(g =>
        `<span class="details-genre-tag">${g}</span>`
    ).join('');

    // Description
    document.getElementById('description').textContent = details.overview || details.description || 'No description available.';


    // Video Player Logic (Plyr + HLS.js)
    const videoSection = document.getElementById('video-player-section');
    const watchBtn = document.getElementById('watchBtn');

    // Robust check for Video URL (handles videoUrl or videourl)
    const videoSource = details.videoUrl || details.videourl || '';

    if (videoSource) {
        // Setup Player
        const video = document.getElementById('player');

        // Destroy existing instance if any
        if (window.player) {
            window.player.destroy();
        }

        const source = videoSource;

        // HLS Support Detection (check if URL contains .m3u8 anywhere)
        if (Hls.isSupported() && source.includes('.m3u8')) {
            const hls = new Hls();
            hls.loadSource(source);
            hls.attachMedia(video);
            window.hls = hls;

            // Handle HLS Quality Levels
            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                const availableQualities = hls.levels.map((l) => l.height);
                // Initialize Plyr
                const defaultOptions = {
                    controls: [
                        'play-large', 'play', 'rewind', 'fast-forward',
                        'progress', 'current-time', 'duration', 'mute',
                        'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
                    ],
                    quality: {
                        default: availableQualities[0], // Top quality
                        options: availableQualities,
                        forced: true,
                        onChange: (e) => updateQuality(e),
                    }
                };
                window.player = new Plyr(video, defaultOptions);
            });
        } else {
            // Default HTML5 Video (MP4/WebM) - Works for your FB CDN links
            video.src = source;
            window.player = new Plyr(video, {
                controls: [
                    'play-large', 'play', 'rewind', 'fast-forward',
                    'progress', 'current-time', 'duration', 'mute',
                    'volume', 'settings', 'pip', 'airplay', 'fullscreen'
                ]
            });
        }

        videoSection.style.display = 'block';

        watchBtn.textContent = 'Watch Now';
        watchBtn.onclick = (e) => {
            e.preventDefault();
            videoSection.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
                if (window.player) window.player.play();
            }, 500);
        };
    } else {
        // Fallback to Trailer Modal logic
        videoSection.style.display = 'none';
        watchBtn.onclick = () => openPlayer(details);
    }

    // Close Player Logic (Modal)
    document.getElementById('closePlayer').addEventListener('click', () => {
        const playerModal = document.getElementById('playerModal');
        const playerContent = document.getElementById('playerContent');
        playerModal.classList.remove('active');
        playerContent.innerHTML = '';
        if (window.player && window.player.playing) window.player.pause();
    });
}

function updateQuality(newQuality) {
    if (window.hls) {
        window.hls.levels.forEach((level, levelIndex) => {
            if (level.height === newQuality) {
                window.hls.currentLevel = levelIndex;
            }
        });
    }
}

function openPlayer(content) {
    const playerModal = document.getElementById('playerModal');
    const playerContent = document.getElementById('playerContent');
    let videoKey = null;

    // Try finding trailer in fetched details
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
        // Try checking if there is a 'search' fallback or just message
        playerContent.innerHTML = `
            <div style="color: white; text-align: center; padding-top: 20%;">
                <h2>No Trailer Available</h2>
                <p>Sorry, we couldn't find a video for this title.</p>
            </div>
        `;
    }

    playerModal.classList.add('active');
}
