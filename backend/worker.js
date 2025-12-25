
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // CORS Headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // ===== TMDB Proxy =====
            if (path.startsWith('/api/tmdb')) {
                return handleTmdbRequest(request, env, path.replace('/api/tmdb', ''));
            }

            // ===== Gemini Proxy =====
            if (path === '/api/translate') {
                return handleTranslateRequest(request, env);
            }

            // ===== Supabase Proxy (Movies) =====
            if (path === '/api/movies') {
                if (method === 'GET') return getSupabaseContent(env, 'movies');
                if (method === 'POST') return addSupabaseContent(request, env, 'movies');
            }
            if (path.startsWith('/api/movies/')) { // DELETE / UPDATE
                const id = path.split('/').pop();
                if (method === 'PUT') return updateSupabaseContent(request, env, 'movies', id);
                if (method === 'DELETE') return deleteSupabaseContent(env, 'movies', id);
            }

            // ===== Supabase Proxy (TV Shows) =====
            if (path === '/api/tv') {
                if (method === 'GET') return getSupabaseContent(env, 'tv_shows');
                if (method === 'POST') return addSupabaseContent(request, env, 'tv_shows');
            }
            if (path.startsWith('/api/tv/')) {
                const id = path.split('/').pop();
                if (method === 'PUT') return updateSupabaseContent(request, env, 'tv_shows', id);
                if (method === 'DELETE') return deleteSupabaseContent(env, 'tv_shows', id);
            }

            return new Response('Not Found', { status: 404, headers: corsHeaders });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};

// --- Handlers ---

async function handleTmdbRequest(request, env, subPath) {
    const url = new URL(request.url);
    const tmdbUrl = `https://api.themoviedb.org/3${subPath}${url.search}`;

    const response = await fetch(tmdbUrl, {
        headers: {
            'Authorization': `Bearer ${env.TMDB_READ_TOKEN}`, // Or use API Key param
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

async function handleTranslateRequest(request, env) {
    const body = await request.json();
    const text = body.text;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `Translate the following movie description to Sinhala:\n\n${text}` }] }]
        })
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

// --- Supabase Helpers (Using REST API to avoid bulky client lib in Worker) ---

async function getSupabaseContent(env, table) {
    const url = `${env.SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc`;
    const response = await fetch(url, {
        headers: {
            'apikey': env.SUPABASE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_KEY}`
        }
    });
    return new Response(response.body, {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

async function addSupabaseContent(request, env, table) {
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

    return new Response(response.body, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

async function updateSupabaseContent(request, env, table, id) {
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

    return new Response(response.body, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

async function deleteSupabaseContent(env, table, id) {
    const url = `${env.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'apikey': env.SUPABASE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_KEY}`
        }
    });
    return new Response(response.body, { headers: { 'Access-Control-Allow-Origin': '*' } });
}
