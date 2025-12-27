document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const type = urlParams.get('type');

    if (!id || !type) {
        window.location.href = 'index.html';
        return;
    }

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
            const results = await DB.search(query);
            const searchResults = document.getElementById('searchResults');

            if (results.length === 0) {
                searchResults.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No results found</p>';
                searchModal.classList.add('active');
                return;
            }

            searchResults.innerHTML = results.slice(0, 8).map(item => {
                const title = item.title || item.name;
                const year = (item.release_date || item.first_air_date || '').substring(0, 4);
                const type = item.media_type === 'tv' ? 'TV Show' : 'Movie';
                const poster = item.poster || (item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : 'https://placehold.co/50x75?text=No+Img');

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

    await loadDetails(id, type);

    // Initialize Auth UI
    window.auth.setupHeaderUI();
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


    // DEBUGGING: Print details to console to verify videoUrl existence

    // Video Player Logic
    const videoSection = document.getElementById('video-player-section');
    const watchBtn = document.getElementById('watchBtn');

    // Global function to init player (exposed for episodes)
    window.initializePlayer = function (source, posterUrl) {
        if (!source) return;

        const video = document.getElementById('player');

        // Update poster
        video.poster = posterUrl || '';

        // Destroy existing instance
        if (window.plyrPlayer && typeof window.plyrPlayer.destroy === 'function') {
            window.plyrPlayer.destroy();
        }
        if (window.hls) {
            window.hls.destroy();
            window.hls = null;
        }

        // HLS Config
        if (window.Hls && Hls.isSupported() && source.includes('.m3u8')) {
            const hls = new Hls();
            hls.loadSource(source);
            hls.attachMedia(video);
            window.hls = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                const availableQualities = hls.levels.map((l) => l.height);
                const uniqueQualities = [...new Set(availableQualities)].sort((a, b) => b - a);

                const defaultOptions = {
                    controls: [
                        'play-large', 'play', 'rewind', 'fast-forward',
                        'progress', 'current-time', 'duration', 'mute',
                        'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
                    ],
                    settings: ['quality', 'speed', 'loop'],
                    quality: {
                        default: uniqueQualities[0],
                        options: uniqueQualities,
                        forced: true,
                        onChange: (e) => updateQuality(e),
                    },
                    iconUrl: 'https://cdn.plyr.io/3.7.8/plyr.svg',
                    poster: posterUrl
                };
                window.plyrPlayer = new Plyr(video, defaultOptions);
            });
        } else {
            // Standard MP4
            video.src = source;
            window.plyrPlayer = new Plyr(video, {
                controls: [
                    'play-large', 'play', 'rewind', 'fast-forward',
                    'progress', 'current-time', 'duration', 'mute',
                    'volume', 'settings', 'pip', 'airplay', 'fullscreen'
                ],
                poster: posterUrl
            });
        }

        videoSection.style.display = 'block';
    };

    // Initialize Main Video (if exists)
    const videoSource = details.videoUrl || details.videourl || '';
    const finalPosterUrl = backdropUrl || posterUrl || '';

    // Force CSS Poster
    if (finalPosterUrl) {
        const style = document.createElement('style');
        style.innerHTML = `.plyr__poster { background-image: url("${finalPosterUrl}") !important; background-size: cover !important; background-position: center !important; }`;
        document.head.appendChild(style);
    }

    if (videoSource) {
        window.initializePlayer(videoSource, finalPosterUrl);
        watchBtn.textContent = 'Watch Now';
        watchBtn.onclick = (e) => {
            e.preventDefault();
            videoSection.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => { if (window.plyrPlayer) window.plyrPlayer.play(); }, 500);
        };
    } else {
        videoSection.style.display = 'none';
        watchBtn.onclick = () => openPlayer(details); // Trailer fallback
    }

    // --- Episodes Logic ---
    if (type === 'tv') {
        const itemId = storedItem ? storedItem.id : null;
        console.log('[Details] Checking episodes for:', { type, tmdbId: id, dbId: itemId, storedItem });

        const episodes = await DB.getEpisodes(itemId);
        console.log('[Details] Episodes fetched:', episodes);

        if (episodes && episodes.length > 0) {
            const epSection = document.getElementById('episodes-section');
            const epContainer = document.getElementById('episodes-list-container');

            epSection.style.display = 'block';
            epContainer.innerHTML = episodes.map(ep => `
                <div class="episode-card" onclick="playEpisode('${ep.video_url}', this)">
                    <span class="episode-number">S${ep.season_number} • E${ep.episode_number}</span>
                    <span class="episode-title">${ep.title || 'Untitled'}</span>
                </div>
            `).join('');

            // Define play handler
            window.playEpisode = (url, card) => {
                // Formatting active state
                document.querySelectorAll('.episode-card').forEach(c => c.classList.remove('active'));
                if (card) card.classList.add('active');

                // Play
                window.initializePlayer(url, finalPosterUrl);

                // Scroll
                videoSection.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => { if (window.plyrPlayer) window.plyrPlayer.play(); }, 500);
            };

            // If no main source, play first episode on 'Watch Now'
            if (!videoSource) {
                watchBtn.textContent = 'Watch S1 E1';
                watchBtn.onclick = (e) => {
                    e.preventDefault();
                    const firstCard = epContainer.children[0];
                    window.playEpisode(episodes[0].video_url, firstCard);
                };
            }
        }
    }

    // Close Player Logic (Modal)
    document.getElementById('closePlayer').addEventListener('click', () => {
        const playerModal = document.getElementById('playerModal');
        const playerContent = document.getElementById('playerContent');
        playerModal.classList.remove('active');
        playerContent.innerHTML = '';
        if (window.plyrPlayer && typeof window.plyrPlayer.pause === 'function') window.plyrPlayer.pause();
    });

    // Hide Loader and Reveal Content
    setTimeout(() => {
        const loader = document.getElementById('loadingOverlay');
        const containers = document.querySelectorAll('.details-container, .video-section');

        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }

        containers.forEach(el => el.classList.add('content-visible'));
    }, 300); // Short delay for smoothness

    // Setup comment section
    const contentId = details.tmdb_id || details.id;
    await setupCommentSection(String(contentId), type);
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

// ===== Comments Functionality =====

let currentContentId = null;
let currentContentType = null;

async function setupCommentSection(contentId, contentType) {
    currentContentId = contentId;
    currentContentType = contentType;

    // Define UI update logic
    const updateCommentUI = (user) => {
        const commentInputArea = document.getElementById('commentInputArea');
        if (!commentInputArea) return;

        if (user) {
            // Restore input area if it was replaced by login prompt
            if (commentInputArea.querySelector('.login-prompt')) {
                commentInputArea.innerHTML = `
                <div class="comment-avatar">
                    <img id="commentUserAvatar" src="" alt="Your Avatar">
                </div>
                <div class="comment-form">
                    <textarea id="commentInput" placeholder="Write a comment..." rows="2"></textarea>
                    <button class="btn btn-primary" id="submitCommentBtn">Post Comment</button>
                </div>
                `;
                // Re-bind submit button for restored DOM
                const newSubmitBtn = document.getElementById('submitCommentBtn');
                if (newSubmitBtn) newSubmitBtn.onclick = postComment;
            }

            commentInputArea.style.display = 'flex';
            const avatarUrl = window.auth.getUserAvatar() || 'https://placehold.co/40?text=User';
            const avatarImg = document.getElementById('commentUserAvatar');
            if (avatarImg) avatarImg.src = avatarUrl;
        } else {
            // Show login prompt
            commentInputArea.innerHTML = `
                <div class="login-prompt">
                    <p>Please <a href="#" onclick="loginToComment(event)">login</a> to post a comment.</p>
                </div>
                <style>
                    .login-prompt { width: 100%; text-align: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; }
                    .login-prompt a { color: var(--accent-primary); text-decoration: none; font-weight: 600; }
                    .login-prompt a:hover { text-decoration: underline; }
                </style>
            `;
        }
    };

    // Initial check (wait for auth ready if not present)
    window.auth.ready.then(() => {
        updateCommentUI(window.auth.currentUser);
    });

    // Listen for future changes
    window.auth.onAuthStateChange((user) => {
        updateCommentUI(user);
    });

    // Setup submit button (initial attempt, though updateCommentUI handles it for dynamic swaps)
    const submitBtn = document.getElementById('submitCommentBtn');
    if (submitBtn) submitBtn.onclick = postComment;

    // Load comments
    await loadComments(contentId, contentType);
}

function loginToComment(e) {
    e.preventDefault();
    window.auth.signInWithGoogle();
}

async function loadComments(contentId, contentType) {
    const commentsList = document.getElementById('commentsList');
    const noCommentsMessage = document.getElementById('noCommentsMessage');

    // Show loading?
    // commentsList.innerHTML = '<div class="spinner"></div>';

    const comments = await DB.getComments(contentId, contentType);

    if (comments && comments.length > 0) {
        renderComments(comments);
        if (noCommentsMessage) noCommentsMessage.style.display = 'none';
    } else {
        commentsList.innerHTML = '';
        if (noCommentsMessage) {
            noCommentsMessage.style.display = 'block';
            commentsList.appendChild(noCommentsMessage);
        }
    }
}



function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');
    const noCommentsMessage = document.getElementById('noCommentsMessage');

    // Clear existing except noCommentsMessage if we want, but usually we prefer full wipe if replacing
    commentsList.innerHTML = '';
    if (noCommentsMessage) {
        commentsList.appendChild(noCommentsMessage); // Keep it but hidden
        noCommentsMessage.style.display = 'none';
    }

    comments.forEach(comment => {
        const timeAgo = getTimeAgo(new Date(comment.created_at));
        const commentHTML = `
            <div class="comment-card" data-id="${comment.id}">
                <div class="comment-avatar">
                    <img src="${comment.user_avatar || 'https://placehold.co/40'}" alt="${escapeHTML(comment.user_name || 'User')}" referrerpolicy="no-referrer">
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHTML(comment.user_name || 'Anonymous')}</span>
                        <span class="comment-time">${timeAgo}</span>
                    </div>
                    <p class="comment-text">${escapeHTML(comment.comment_text)}</p>
                </div>
            </div>
        `;
        commentsList.insertAdjacentHTML('beforeend', commentHTML);
    });
}


async function postComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    const user = window.auth.getUser();
    if (!user) return alert('You must be logged in.');

    const submitBtn = document.getElementById('submitCommentBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    submitBtn.disabled = true;

    const newComment = {
        content_id: currentContentId,
        content_type: currentContentType,
        user_id: user.id,
        user_name: window.auth.getUserName(),
        user_avatar: window.auth.getUserAvatar(),
        comment_text: text
        // created_at is default now() in DB usually, but we can send if needed. Supabase handles it if column default is set.
    };

    const added = await DB.addComment(newComment);

    if (added) {
        input.value = '';
        await loadComments(currentContentId, currentContentType);
    } else {
        alert('Failed to post comment. Please try again.');
    }

    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return 'just now';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
