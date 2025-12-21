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
            const results = await TMDB.search(query);
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
    console.log('Fetched Details:', details);
    console.log('Video URL (Camel):', details.videoUrl);
    console.log('Video URL (Lower):', details.videourl);

    // Video Player Logic (Plyr + HLS.js)
    const videoSection = document.getElementById('video-player-section');
    const watchBtn = document.getElementById('watchBtn');

    // Robust check for Video URL (handles videoUrl or videourl)
    const videoSource = details.videoUrl || details.videourl || '';
    console.log('Detected Video Source:', videoSource);

    if (videoSource) {
        console.log('Initializing Player...');
        // Setup Player
        const video = document.getElementById('player');

        // Destroy existing Plyr instance if any
        if (window.plyrPlayer && typeof window.plyrPlayer.destroy === 'function') {
            window.plyrPlayer.destroy();
        }

        const source = videoSource;

        // HLS Support Detection (check if URL contains .m3u8 anywhere)
        if (window.Hls && Hls.isSupported() && source.includes('.m3u8')) {
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
                        options: availableQualities, // All quality options
                        forced: true,
                        onChange: (e) => updateQuality(e),
                    }
                };
                window.plyrPlayer = new Plyr(video, defaultOptions);
            });
        } else {
            // Default HTML5 Video (MP4/WebM) - Works for your FB CDN links
            video.src = source;
            window.plyrPlayer = new Plyr(video, {
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
                if (window.plyrPlayer) window.plyrPlayer.play();
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

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    const commentInputArea = document.getElementById('commentInputArea');

    if (session) {
        // Show comment input and set user avatar
        commentInputArea.style.display = 'flex';
        const avatarUrl = session.user.user_metadata.avatar_url || 'https://via.placeholder.com/40';
        document.getElementById('commentUserAvatar').src = avatarUrl;
    } else {
        // Hide comment input if not logged in
        commentInputArea.innerHTML = `
            <div style="text-align: center; width: 100%; color: var(--text-muted);">
                <p>Please <a href="#" onclick="loginToComment()" style="color: var(--accent-yellow);">login</a> to post a comment.</p>
            </div>
        `;
    }

    // Setup submit button
    const submitBtn = document.getElementById('submitCommentBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', postComment);
    }

    // Load existing comments
    await loadComments(contentId, contentType);
}

async function loginToComment() {
    const redirectUrl = window.location.href;
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl }
    });
}

async function loadComments(contentId, contentType) {
    const commentsList = document.getElementById('commentsList');
    const noCommentsMessage = document.getElementById('noCommentsMessage');

    try {
        const { data: comments, error } = await supabase
            .from('comments')
            .select('*')
            .eq('content_id', contentId)
            .eq('content_type', contentType)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading comments:', error);
            return;
        }

        if (comments && comments.length > 0) {
            noCommentsMessage.style.display = 'none';
            renderComments(comments);
        } else {
            noCommentsMessage.style.display = 'block';
        }
    } catch (err) {
        console.error('Error fetching comments:', err);
    }
}

function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');
    const noCommentsMessage = document.getElementById('noCommentsMessage');

    // Clear existing except noCommentsMessage
    commentsList.innerHTML = '';
    commentsList.appendChild(noCommentsMessage);
    noCommentsMessage.style.display = 'none';

    comments.forEach(comment => {
        const timeAgo = getTimeAgo(new Date(comment.created_at));
        const commentHTML = `
            <div class="comment-card" data-id="${comment.id}">
                <div class="comment-avatar">
                    <img src="${comment.user_avatar || 'https://via.placeholder.com/40'}" alt="${comment.user_name}">
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHTML(comment.user_name)}</span>
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
    const commentInput = document.getElementById('commentInput');
    const commentText = commentInput.value.trim();

    if (!commentText) {
        alert('Please enter a comment.');
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert('You must be logged in to comment.');
        return;
    }

    const user = session.user;
    const userName = user.user_metadata.full_name || user.user_metadata.name || user.email;
    const userAvatar = user.user_metadata.avatar_url || '';

    try {
        const { data, error } = await supabase
            .from('comments')
            .insert({
                content_id: currentContentId,
                content_type: currentContentType,
                user_id: user.id,
                user_name: userName,
                user_avatar: userAvatar,
                comment_text: commentText
            })
            .select();

        if (error) {
            console.error('Error posting comment:', error);
            alert('Failed to post comment. ' + error.message);
            return;
        }

        // Clear input and reload comments
        commentInput.value = '';
        await loadComments(currentContentId, currentContentType);
    } catch (err) {
        console.error('Error submitting comment:', err);
    }
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
