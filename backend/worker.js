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
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.plyr.io https://cdnjs.cloudflare.com https://static.cloudflareinsights.com; media-src 'self' https://*.fbcdn.net https://scontent-cdg4-1.xx.fbcdn.net https://scontent-cdg4-2.xx.fbcdn.net https://scontent-cdg4-3.xx.fbcdn.net https://scontent-cdg4-4.xx.fbcdn.net blob: data:; img-src 'self' https://*.tmdb.org https://image.tmdb.org https://placehold.co data: blob:; connect-src 'self' https://*.fbcdn.net https://scontent-cdg4-1.xx.fbcdn.net https://scontent-cdg4-2.xx.fbcdn.net https://scontent-cdg4-3.xx.fbcdn.net https://scontent-cdg4-4.xx.fbcdn.net https://api.themoviedb.org https://*.supabase.co https://*.workers.dev https://cdn.plyr.io https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.plyr.io;",
            // Content Type enforcement
            'X-Content-Type-Options': 'nosniff'
        };

        // Handle CORS Preflight
        if (method === 'OPTIONS') {
            return new Response(null, { headers: responseHeaders });
        }

        // ---------------- API ROUTES ----------------
        try {
            // Note: OAuth routes removed due to ESM import issues in Workers
            // Watchlist functionality works with localStorage on frontend
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
    try {
        const url = `${env.SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc`;
        const response = await fetch(url, {
            headers: {
                'apikey': env.SUPABASE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_KEY}`
            }
        });

        const data = await response.text();
        const status = response.ok ? 200 : response.status;

        return new Response(data, {
            status,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message, table }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}

async function addSupabaseContent(request, env, table, headers) {
    try {
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

        const data = await response.text();
        const status = response.ok ? 200 : response.status;

        return new Response(data, {
            status,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}

async function updateSupabaseContent(request, env, table, id, headers) {
    try {
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

        const data = await response.text();
        const status = response.ok ? 200 : response.status;

        return new Response(data, {
            status,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}

async function deleteSupabaseContent(env, table, id, headers) {
    try {
        const url = `${env.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': env.SUPABASE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_KEY}`
            }
        });

        const data = await response.text();
        const status = response.ok ? 204 : response.status;

        return new Response(data || null, {
            status,
            headers
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}

async function getEpisodes(request, env, headers) {
    try {
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

        const data = await response.text();
        const status = response.ok ? 200 : response.status;

        return new Response(data, {
            status,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}
