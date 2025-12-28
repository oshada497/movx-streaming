-- ==========================================
-- VIEW TRACKING VERIFICATION QUERIES
-- Run these AFTER executing COMPLETE_VIEW_FIX.sql
-- ==========================================

-- 1. Check if all components are set up correctly
SELECT * FROM test_view_tracking();

-- Expected output: All tests should show 'PASS'
-- If any show 'FAIL', re-run COMPLETE_VIEW_FIX.sql


-- ==========================================
-- 2. Check top viewed movies and TV shows
-- ==========================================

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

-- Expected output: List of most viewed content
-- If empty, no views have been tracked yet


-- ==========================================
-- 3. Check recent view history
-- ==========================================

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

-- Expected output: Recent view entries
-- If empty, no views have been tracked yet


-- ==========================================
-- 4. Test the increment_view_count function
-- ==========================================

-- Get a valid content ID first
SELECT id, title FROM movies LIMIT 1;

-- Then test tracking (replace 1 with an actual ID from above)
-- SELECT increment_view_count(1, 'movie', 550, NULL, 'test_session');

-- Check if it worked
-- SELECT id, title, view_count FROM movies WHERE id = 1;


-- ==========================================
-- 5. Test get_trending_content function
-- ==========================================

SELECT * FROM get_trending_content(30, 10);

-- Expected output: Trending content from last 30 days
-- If empty, add some test views first


-- ==========================================
-- 6. Quick stats summary
-- ==========================================

SELECT 
    'Total Movies' as metric,
    COUNT(*)::TEXT as value
FROM movies

UNION ALL

SELECT 
    'Movies with Views',
    COUNT(*)::TEXT
FROM movies
WHERE view_count > 0

UNION ALL

SELECT 
    'Total TV Shows',
    COUNT(*)::TEXT
FROM tv_shows

UNION ALL

SELECT 
    'TV Shows with Views',
    COUNT(*)::TEXT
FROM tv_shows
WHERE view_count > 0

UNION ALL

SELECT 
    'Total View History Records',
    COUNT(*)::TEXT
FROM view_history

UNION ALL

SELECT 
    'Views in Last 24 Hours',
    COUNT(*)::TEXT
FROM view_history
WHERE viewed_at >= NOW() - INTERVAL '24 hours';


-- ==========================================
-- All done! View tracking is verified
-- ==========================================
