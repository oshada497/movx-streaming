-- Add slug column to movies and tv_shows tables
-- This allows pretty URLs like /deadpool instead of /details?id=123

ALTER TABLE movies ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE tv_shows ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create indexes for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_tvshows_slug ON tv_shows(slug);

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        )
    );
END;
$$;

-- Update existing movies with slugs (only if slug is NULL)
UPDATE movies 
SET slug = generate_slug(title)
WHERE slug IS NULL AND title IS NOT NULL;

-- Update existing TV shows with slugs (only if slug is NULL)
UPDATE tv_shows 
SET slug = generate_slug(title)
WHERE slug IS NULL AND title IS NOT NULL;

-- Handle duplicate slugs by appending tmdb_id
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

-- Function to lookup content by slug
CREATE OR REPLACE FUNCTION get_content_by_slug(p_slug TEXT)
RETURNS TABLE (
    content_id INTEGER,
    content_type TEXT,
    tmdb_id INTEGER
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

GRANT EXECUTE ON FUNCTION get_content_by_slug TO anon, authenticated, service_role;

-- Trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.slug IS NULL AND NEW.title IS NOT NULL THEN
        NEW.slug := generate_slug(NEW.title);
        
    -- Check for duplicates and append tmdb_id if needed
        IF TG_TABLE_NAME = 'movies' THEN
            IF EXISTS (SELECT 1 FROM movies WHERE slug = NEW.slug AND id != NEW.id) THEN
                NEW.slug := NEW.slug || '-' || NEW."tmdbId"::TEXT;
            END IF;
        ELSIF TG_TABLE_NAME = 'tv_shows' THEN
            IF EXISTS (SELECT 1 FROM tv_shows WHERE slug = NEW.slug AND id != NEW.id) THEN
                NEW.slug := NEW.slug || '-' || NEW."tmdbId"::TEXT;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS movies_auto_slug ON movies;
CREATE TRIGGER movies_auto_slug
    BEFORE INSERT OR UPDATE ON movies
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_slug();

DROP TRIGGER IF EXISTS tvshows_auto_slug ON tv_shows;
CREATE TRIGGER tvshows_auto_slug
    BEFORE INSERT OR UPDATE ON tv_shows
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_slug();

-- Verify slugs were created
SELECT COUNT(*) as movies_with_slugs FROM movies WHERE slug IS NOT NULL;
SELECT COUNT(*) as tvshows_with_slugs FROM tv_shows WHERE slug IS NOT NULL;

-- Show some examples
SELECT id, title, slug, "tmdbId" FROM movies WHERE slug IS NOT NULL LIMIT 10;
