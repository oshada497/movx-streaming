// ===== Worker Logic =====
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Security & CORS Headers
        const responseHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            // HSTS: Enforce HTTPS for 1 year
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            // X-Frame-Options: Prevent clickjacking (deny iframes)
            'X-Frame-Options': 'DENY',
            // CSP: Fixed invalid wildcard syntax
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.plyr.io https://cdnjs.cloudflare.com https://static.cloudflareinsights.com; media-src 'self' https://*.fbcdn.net https://scontent-cdg4-1.xx.fbcdn.net https://scontent-cdg4-2.xx.fbcdn.net https://scontent-cdg4-3.xx.fbcdn.net https://scontent-cdg4-4.xx.fbcdn.net blob: data:; img-src 'self' https://image.tmdb.org https://placehold.co data: blob:; connect-src 'self' https://*.fbcdn.net https://scontent-cdg4-1.xx.fbcdn.net https://scontent-cdg4-2.xx.fbcdn.net https://scontent-cdg4-3.xx.fbcdn.net https://scontent-cdg4-4.xx.fbcdn.net https://api.themoviedb.org https://*.supabase.co https://*.workers.dev https://cdn.plyr.io https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.plyr.io;",
            // Content Type enforcement
            'X-Content-Type-Options': 'nosniff'
        };

        // Handle CORS Preflight
        if (method === 'OPTIONS') {
            return new Response(null, { headers: responseHeaders });
        }

        // Initialize Supabase (Use specific secrets for Auth)
        // Ensure you have SUPABASE_URL and SUPABASE_KEY (Anon or Service Role depending on need) in env
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });

        // ---------------- AUTH ROUTES ----------------

        // 1. Login Redirect
        if (path === '/auth/login') {
            const frontendUrl = url.searchParams.get('redirect_to') || 'https://fbflix.online';
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(frontendUrl)}`,
                    scopes: 'email profile'
                }
            });

            if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: responseHeaders });
            return Response.redirect(data.url);
        }

        // 2. Auth Callback
        if (path === '/auth/callback') {
            const code = url.searchParams.get('code');
            const next = url.searchParams.get('next') || 'https://fbflix.online';

            if (code) {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) return new Response('Auth Error: ' + error.message, { status: 400 });

                // Start building redirect response
                // We will set the session token in a secure HttpOnly cookie
                // And another non-HttpOnly cookie for JS to know we are logged in (optional but helpful)
                const accessToken = data.session.access_token;
                const refreshToken = data.session.refresh_token;

                // Simple HTML response to trigger window.opener refresh or redirect
                // Ideally, we redirect back to the app with the tokens in cookies

                // Note: For cross-domain (worker val -> github pages), Cookies can be tricky due to SameSite policies.
                // We will append the token as a hash fragment for the frontend to handle for now, 
                // as that is robust for separate domains without complex cookie setups.
                return Response.redirect(`${next}#access_token=${accessToken}&refresh_token=${refreshToken}&type=recovery`);
            }
            return new Response('No code provided', { status: 400 });
        }

        // ---------------- API ROUTES ----------------
        try {
            // ===== TMDB Proxy =====
            if (path.startsWith('/api/tmdb')) {
                const tmdbPath = path.replace('/api/tmdb', '');
                const tmdbUrl = `https://api.themoviedb.org/3${tmdbPath}${url.search}`;
                const tmdbResponse = await fetch(tmdbUrl, {
                    headers: {
                        'Authorization': `Bearer ${env.TMDB_READ_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                const tmdbData = await tmdbResponse.json();
                return new Response(JSON.stringify(tmdbData), {
                    headers: { ...responseHeaders, 'Content-Type': 'application/json' }
                });
            }

            // ===== Gemini Proxy =====
            if (path === '/api/translate') {
                const body = await request.json();
                const text = body.text;
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`;
                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `Translate the following movie description to Sinhala:\n\n${text}` }] }]
                    })
                });
                const geminiData = await geminiResponse.json();
                return new Response(JSON.stringify(geminiData), {
                    headers: { ...responseHeaders, 'Content-Type': 'application/json' }
                });
            }

            // ===== Supabase Proxy (Movies) =====
            if (path === '/api/movies') {
                if (method === 'GET') return getSupabaseContent(env, 'movies', responseHeaders);
                if (method === 'POST') return addSupabaseContent(request, env, 'movies', responseHeaders);
            }
            if (path.startsWith('/api/movies/')) {
                const id = path.split('/').pop();
                if (method === 'PUT') return updateSupabaseContent(request, env, 'movies', id, responseHeaders);
                if (method === 'DELETE') return deleteSupabaseContent(env, 'movies', id, responseHeaders);
            }

            // ===== Supabase Proxy (TV Shows) =====
            if (path === '/api/tv') {
                if (method === 'GET') return getSupabaseContent(env, 'tv_shows', responseHeaders);
                if (method === 'POST') return addSupabaseContent(request, env, 'tv_shows', responseHeaders);
            }
            if (path.startsWith('/api/tv/')) {
                const id = path.split('/').pop();
                if (method === 'PUT') return updateSupabaseContent(request, env, 'tv_shows', id, responseHeaders);
                if (method === 'DELETE') return deleteSupabaseContent(env, 'tv_shows', id, responseHeaders);
            }

            // ===== Supabase Proxy (Episodes) =====
            if (path === '/api/episodes') {
                if (method === 'GET') return getEpisodes(request, env, responseHeaders);
                if (method === 'POST') return addSupabaseContent(request, env, 'episodes', responseHeaders);
            }
            if (path.startsWith('/api/episodes/')) {
                const id = path.split('/').pop();
                if (method === 'PUT') return updateSupabaseContent(request, env, 'episodes', id, responseHeaders);
                if (method === 'DELETE') return deleteSupabaseContent(env, 'episodes', id, responseHeaders);
            }

            return new Response('Not Found', { status: 404, headers: responseHeaders });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...responseHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};

// --- Supabase Helpers ---

async function getSupabaseContent(env, table, headers) {
    const url = `${env.SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc`;
    const response = await fetch(url, {
        headers: {
            'apikey': env.SUPABASE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_KEY}`
        }
    });
    return new Response(response.body, { headers: { ...headers, 'Content-Type': 'application/json' } });
}

async function addSupabaseContent(request, env, table, headers) {
    const body = await request.json();
    const url = `${env.SUPABASE_URL}/rest/v1/${table}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': env.SUPABASE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
    });
    return new Response(response.body, { headers: { ...headers, 'Content-Type': 'application/json' } });
}

async function updateSupabaseContent(request, env, table, id, headers) {
    const body = await request.json();
    const url = `${env.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'apikey': env.SUPABASE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    return new Response(response.body, { headers: { ...headers, 'Content-Type': 'application/json' } });
}

async function deleteSupabaseContent(env, table, id, headers) {
    const url = `${env.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'apikey': env.SUPABASE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_KEY}`
        }
    });
    return new Response(response.body, { headers: headers });
}

async function getEpisodes(request, env, headers) {
    const url = new URL(request.url);
    const tvId = url.searchParams.get('tv_show_id');
    let supabaseUrl = `${env.SUPABASE_URL}/rest/v1/episodes?select=*&order=season_number.asc,episode_number.asc`;
    if (tvId) supabaseUrl += `&tv_show_id=eq.${tvId}`;
    const response = await fetch(supabaseUrl, {
        headers: {
            'apikey': env.SUPABASE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_KEY}`
        }
    });
    return new Response(response.body, { headers: { ...headers, 'Content-Type': 'application/json' } });
}
