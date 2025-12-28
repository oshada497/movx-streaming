-- Fix missing RPC function and ensure slugs are correct
-- Run this in Supabase SQL Editor

-- 1. Ensure get_content_by_slug exists (Re-create to be safe)
DROP FUNCTION IF EXISTS get_content_by_slug(text);

CREATE OR REPLACE FUNCTION get_content_by_slug(p_slug TEXT)
RETURNS TABLE (
    content_id BIGINT,
    content_type TEXT,
    tmdb_id BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Try movies first
    RETURN QUERY
    SELECT id, 'movie'::TEXT, "tmdbId"
    FROM movies
    WHERE slug = p_slug
    LIMIT 1;
    
    -- If no movie found, try TV shows
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT id, 'tv'::TEXT, "tmdbId"
        FROM tv_shows
        WHERE slug = p_slug
        LIMIT 1;
    END IF;
END;
$$;

-- 2. Grant permissions (Crucial!)
GRANT EXECUTE ON FUNCTION get_content_by_slug TO anon, authenticated, service_role;

-- 3. Retry duplicate slug fix (Safe to re-run)
-- This ensures 'deadpool-123' format if 'deadpool' is taken by another item
UPDATE movies m1
SET slug = slug || '-' || "tmdbId"::TEXT
WHERE EXISTS (
    SELECT 1 FROM movies m2 
    WHERE m2.slug = m1.slug AND m2.id != m1.id
);

UPDATE tv_shows t1
SET slug = slug || '-' || "tmdbId"::TEXT
WHERE EXISTS (
    SELECT 1 FROM tv_shows t2 
    WHERE t2.slug = t1.slug AND t2.id != t1.id
);

-- 4. Verify it works
SELECT * FROM get_content_by_slug('deadpool');
