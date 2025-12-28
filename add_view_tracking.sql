-- Add view tracking to movies and tv_shows tables
-- This migration adds view_count column and creates a view_history table for detailed analytics

-- Add view_count column to movies table
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add view_count column to tv_shows table
ALTER TABLE tv_shows 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create view_history table for detailed analytics
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_view_history_content ON view_history(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_view_history_tmdb ON view_history(tmdb_id, content_type);
CREATE INDEX IF NOT EXISTS idx_view_history_viewed_at ON view_history(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_history_user ON view_history(user_id);

-- Enable Row Level Security
ALTER TABLE view_history ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view view history (for analytics)
CREATE POLICY "View history is viewable by everyone"
    ON view_history FOR SELECT
    USING (true);

-- Policy: Anyone can insert view history (even anonymous users)
CREATE POLICY "Anyone can insert view history"
    ON view_history FOR INSERT
    WITH CHECK (true);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(
    p_content_id INTEGER,
    p_content_type TEXT,
    p_tmdb_id INTEGER DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Increment view count in the appropriate table
    IF p_content_type = 'movie' THEN
        UPDATE movies 
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = p_content_id;
    ELSIF p_content_type = 'tv' THEN
        UPDATE tv_shows 
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = p_content_id;
    END IF;

    -- Insert into view history
    INSERT INTO view_history (content_id, content_type, tmdb_id, user_id, session_id)
    VALUES (p_content_id, p_content_type, p_tmdb_id, p_user_id, p_session_id);
END;
$$;

-- Function to get trending content (most viewed in last 30 days) - OPTIMIZED
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
    -- Union movies (seasons is NULL) and TV shows
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
        to_jsonb(m.genres) as genres, -- FIXED: Convert text[] to JSONB
        m.platform,
        m.runtime,
        NULL::INTEGER as seasons,  -- FIXED: Movies don't have seasons
        rv.recent_view_count
    FROM recent_views rv
    INNER JOIN movies m ON rv.content_type = 'movie' AND rv.content_id = m.id
    
    UNION ALL
    
    -- 2. TV Shows Part (No runtime, Has seasons)
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
        to_jsonb(t.genres) as genres, -- FIXED: Convert text[] to JSONB
        t.platform,
        NULL::TEXT as runtime,    -- TV Shows DO NOT have runtime (FIXED HERE)
        t.seasons::INTEGER,             -- TV Shows HAVE seasons
        rv.recent_view_count
    FROM recent_views rv
    INNER JOIN tv_shows t ON rv.content_type = 'tv' AND rv.content_id = t.id
    
    ORDER BY recent_view_count DESC
    LIMIT result_limit;
END;
$$;

COMMENT ON COLUMN movies.view_count IS 'Total number of times this movie has been viewed';
COMMENT ON COLUMN tv_shows.view_count IS 'Total number of times this TV show has been viewed';
COMMENT ON TABLE view_history IS 'Detailed view history for analytics and trending calculations';
COMMENT ON FUNCTION increment_view_count IS 'Increments view count and records view in history';
COMMENT ON FUNCTION get_trending_content IS 'Returns most viewed content with ALL details in single query - optimized version';
