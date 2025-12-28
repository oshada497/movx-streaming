-- ==========================================
-- COMPLETE VIEW TRACKING FIX
-- Run this ENTIRE script in Supabase SQL Editor
-- This will fix all view tracking issues
-- ==========================================

-- Step 1: Ensure view_count columns exist
ALTER TABLE movies ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE tv_shows ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Step 2: Ensure view_history table exists
CREATE TABLE IF NOT EXISTS view_history (
    id BIGSERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
    tmdb_id INTEGER,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_view_history_content ON view_history(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_view_history_tmdb ON view_history(tmdb_id, content_type);
CREATE INDEX IF NOT EXISTS idx_view_history_viewed_at ON view_history(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_history_user ON view_history(user_id);
CREATE INDEX IF NOT EXISTS idx_movies_view_count ON movies(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_tvshows_view_count ON tv_shows(view_count DESC);

-- Step 4: Enable RLS and create policies
ALTER TABLE view_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable insert for everyone" ON view_history;
DROP POLICY IF EXISTS "Enable select for everyone" ON view_history;
DROP POLICY IF EXISTS "View history is viewable by everyone" ON view_history;
DROP POLICY IF EXISTS "Anyone can insert view history" ON view_history;

-- Create new policies (simpler names)
CREATE POLICY "Allow all to insert" ON view_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to select" ON view_history FOR SELECT USING (true);

-- Step 5: Fix increment_view_count function with SECURITY DEFINER
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
SECURITY DEFINER  -- This bypasses RLS and runs with elevated privileges
SET search_path = public
AS $$
BEGIN
    -- Increment view count in the appropriate table
    IF p_content_type = 'movie' THEN
        UPDATE movies 
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = p_content_id;
        
        -- Log if no rows affected
        IF NOT FOUND THEN
            RAISE WARNING 'Movie with id % not found', p_content_id;
        END IF;
    ELSIF p_content_type = 'tv' THEN
        UPDATE tv_shows 
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = p_content_id;
        
        -- Log if no rows affected
        IF NOT FOUND THEN
            RAISE WARNING 'TV show with id % not found', p_content_id;
        END IF;
    END IF;

    -- Record the detailed history
    INSERT INTO view_history (content_id, content_type, tmdb_id, user_id, session_id)
    VALUES (p_content_id, p_content_type, p_tmdb_id, p_user_id, p_session_id);
    
    RAISE NOTICE 'View tracked for % id %', p_content_type, p_content_id;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION increment_view_count TO anon, authenticated, service_role;

-- Step 6: Fix get_trending_content function
DROP FUNCTION IF EXISTS get_trending_content(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_trending_content(
    days_limit INTEGER DEFAULT 30, 
    result_limit INTEGER DEFAULT 10
)
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
STABLE  -- Function doesn't modify data
SECURITY DEFINER
SET search_path = public
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
    -- Movies
    SELECT 
        rv.content_id,
        rv.content_type,
        rv.tmdb_id,
        m.title,
        m.poster,
        m.backdrop,
        m.description,
        m.rating::NUMERIC,
        m.year,
        to_jsonb(m.genres) as genres,
        m.platform,
        m.runtime,
        NULL::INTEGER as seasons,
        rv.recent_view_count
    FROM recent_views rv
    INNER JOIN movies m ON rv.content_type = 'movie' AND rv.content_id = m.id
    
    UNION ALL
    
    -- TV Shows
    SELECT 
        rv.content_id,
        rv.content_type,
        rv.tmdb_id,
        t.title,
        t.poster,
        t.backdrop,
        t.description,
        t.rating::NUMERIC,
        t.year,
        to_jsonb(t.genres) as genres,
        t.platform,
        NULL::TEXT as runtime,
        t.seasons::INTEGER,
        rv.recent_view_count
    FROM recent_views rv
    INNER JOIN tv_shows t ON rv.content_type = 'tv' AND rv.content_id = t.id
    
    ORDER BY recent_view_count DESC
    LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trending_content TO anon, authenticated, service_role;

-- Step 7: Create a helper function to check if view tracking is working
CREATE OR REPLACE FUNCTION test_view_tracking()
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Test 1: Check if view_count columns exist
    RETURN QUERY
    SELECT 
        'Movies view_count column'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'movies' AND column_name = 'view_count'
        ) THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        'Column exists in movies table'::TEXT;
    
    RETURN QUERY
    SELECT 
        'TV Shows view_count column'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tv_shows' AND column_name = 'view_count'
        ) THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        'Column exists in tv_shows table'::TEXT;
    
    -- Test 2: Check if view_history table exists
    RETURN QUERY
    SELECT 
        'view_history table'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'view_history'
        ) THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        'Table exists'::TEXT;
    
    -- Test 3: Check if functions exist
    RETURN QUERY
    SELECT 
        'increment_view_count function'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'increment_view_count'
        ) THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        'Function exists'::TEXT;
    
    RETURN QUERY
    SELECT 
        'get_trending_content function'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'get_trending_content'
        ) THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END,
        'Function exists'::TEXT;
    
    -- Test 4: Check view history count
    RETURN QUERY
    SELECT 
        'View history records'::TEXT,
        'INFO'::TEXT,
        CONCAT('Total records: ', COUNT(*)::TEXT) as details
    FROM view_history;
    
    -- Test 5: Check movies with views
    RETURN QUERY
    SELECT 
        'Movies with views'::TEXT,
        'INFO'::TEXT,
        CONCAT('Count: ', COUNT(*)::TEXT) as details
    FROM movies
    WHERE view_count > 0;
    
    -- Test 6: Check TV shows with views
    RETURN QUERY
    SELECT 
        'TV shows with views'::TEXT,
        'INFO'::TEXT,
        CONCAT('Count: ', COUNT(*)::TEXT) as details
    FROM tv_shows
    WHERE view_count > 0;
END;
$$;

-- Step 8: Initial data check - Set any NULL view_counts to 0
UPDATE movies SET view_count = 0 WHERE view_count IS NULL;
UPDATE tv_shows SET view_count = 0 WHERE view_count IS NULL;

-- ==========================================
-- VERIFICATION SECTION
-- Run this after the main script to verify
-- ==========================================

-- Check current status
SELECT * FROM test_view_tracking();

-- Show top 10 most viewed content
SELECT 
    'movie' as type,
    title,
    view_count
FROM movies
WHERE view_count > 0
ORDER BY view_count DESC
LIMIT 10

UNION ALL

SELECT 
    'tv' as type,
    title,
    view_count
FROM tv_shows
WHERE view_count > 0
ORDER BY view_count DESC
LIMIT 10;

-- Show recent view history
SELECT 
    vh.content_type,
    COALESCE(m.title, t.title) as title,
    vh.viewed_at,
    vh.user_id,
    vh.session_id
FROM view_history vh
LEFT JOIN movies m ON vh.content_type = 'movie' AND vh.content_id = m.id
LEFT JOIN tv_shows t ON vh.content_type = 'tv' AND vh.content_id = t.id
ORDER BY vh.viewed_at DESC
LIMIT 20;

-- ==========================================
-- DONE!
-- View tracking system is now fully set up
-- ==========================================
