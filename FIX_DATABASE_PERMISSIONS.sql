-- ==========================================
-- SUPER FIX: PERMISSIONS & TYPE SAFETY
-- Run this ENTIRE script in Supabase SQL Editor
-- ==========================================

-- 1. FIX: increment_view_count
-- We recreate it with SECURITY DEFINER to bypass RLS failures on UPDATE
DROP FUNCTION IF EXISTS increment_view_count(INTEGER, TEXT, INTEGER, UUID, TEXT);

CREATE OR REPLACE FUNCTION increment_view_count(
    p_content_id INTEGER,
    p_content_type TEXT,
    p_tmdb_id INTEGER DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- <<< CRITICAL: Grants admin rights to this function only
AS $$
BEGIN
    -- Increment view count in the appropriate table
    -- Fails silently if ID doesn't exist, but won't crash due to permissions anymore
    IF p_content_type = 'movie' THEN
        UPDATE movies 
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = p_content_id;
    ELSIF p_content_type = 'tv' THEN
        UPDATE tv_shows 
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = p_content_id;
    END IF;

    -- Record the detailed history
    INSERT INTO view_history (content_id, content_type, tmdb_id, user_id, session_id)
    VALUES (p_content_id, p_content_type, p_tmdb_id, p_user_id, p_session_id);
END;
$$;

-- Grant execute permission to everyone (since it's a tracking function)
GRANT EXECUTE ON FUNCTION increment_view_count TO anon, authenticated, service_role;


-- 2. FIX: get_trending_content
-- Ensuring all types match perfectly (NUMERIC, INTEGER, JSONB)
DROP FUNCTION IF EXISTS get_trending_content(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_trending_content(days_limit INTEGER DEFAULT 30, result_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    content_id INTEGER,
    content_type TEXT,
    tmdb_id INTEGER,
    title TEXT,
    poster TEXT,
    backdrop TEXT,
    description TEXT,
    rating NUMERIC,
    year TEXT,
    genres JSONB,
    platform TEXT,
    runtime TEXT,
    seasons INTEGER,
    view_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH recent_views AS (
        SELECT 
            vh.content_id,
            vh.content_type,
            vh.tmdb_id,
            COUNT(*) as recent_view_count
        FROM view_history vh
        WHERE vh.viewed_at >= NOW() - (days_limit || ' days')::INTERVAL
        GROUP BY vh.content_id, vh.content_type, vh.tmdb_id
    )
    -- 1. Movies
    SELECT 
        rv.content_id,
        rv.content_type,
        rv.tmdb_id,
        m.title,
        m.poster,
        m.backdrop,
        m.description,
        m.rating::NUMERIC,     -- Explicit Cast
        m.year,
        to_jsonb(m.genres),    -- Convert text[] to JSONB
        m.platform,
        m.runtime,             
        NULL::INTEGER as seasons, 
        rv.recent_view_count
    FROM recent_views rv
    INNER JOIN movies m ON rv.content_type = 'movie' AND rv.content_id = m.id
    
    UNION ALL
    
    -- 2. TV Shows
    SELECT 
        rv.content_id,
        rv.content_type,
        rv.tmdb_id,
        t.title,
        t.poster,
        t.backdrop,
        t.description,
        t.rating::NUMERIC,     -- Explicit Cast
        t.year,
        to_jsonb(t.genres),    -- Convert text[] to JSONB
        t.platform,
        NULL::TEXT as runtime,    
        t.seasons::INTEGER,    -- Explicit Cast
        rv.recent_view_count
    FROM recent_views rv
    INNER JOIN tv_shows t ON rv.content_type = 'tv' AND rv.content_id = t.id
    
    ORDER BY recent_view_count DESC
    LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trending_content TO anon, authenticated, service_role;

-- 3. VERIFY: RLS Policies
-- Ensure view_history is writable
ALTER TABLE view_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for everyone" ON view_history;
CREATE POLICY "Enable insert for everyone" ON view_history FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable select for everyone" ON view_history;
CREATE POLICY "Enable select for everyone" ON view_history FOR SELECT USING (true);
