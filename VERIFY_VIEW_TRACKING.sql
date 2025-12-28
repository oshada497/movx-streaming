-- ==========================================
-- VIEW TRACKING VERIFICATION QUERIES
-- Run these AFTER executing COMPLETE_VIEW_FIX.sql
-- 
-- IMPORTANT: Run EACH query SEPARATELY in Supabase SQL Editor
-- Copy and paste one query at a time
-- ==========================================

-- ==========================================
-- QUERY 1: Check Setup Status
-- ==========================================
-- This should show all 'PASS' results
-- Copy and run this query:

SELECT * FROM test_view_tracking();

-- Expected: All tests show 'PASS'
-- If any show 'FAIL', re-run COMPLETE_VIEW_FIX.sql


-- ==========================================
-- QUERY 2: Top Viewed Content
-- ==========================================
-- Shows movies and TV shows with the most views
-- Copy and run this query:

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

-- Expected: List of most viewed content
-- If empty, no views have been tracked yet


-- ==========================================
-- QUERY 3: Recent View History
-- ==========================================
-- Shows the 20 most recent views
-- Copy and run this query:

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

-- Expected: Recent view entries
-- If empty, no views have been tracked yet


-- ==========================================
-- QUERY 4: Test Trending Function
-- ==========================================
-- Tests the get_trending_content function
-- Copy and run this query:

SELECT * FROM get_trending_content(30, 10);

-- Expected: Trending content from last 30 days
-- If empty, add some test views first


-- ==========================================
-- QUERY 5: Quick Stats Summary
-- ==========================================
-- Shows overview statistics
-- Copy and run this query:

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

-- Expected: Summary of system statistics


-- ==========================================
-- QUERY 6: Test Manual View Tracking (Optional)
-- ==========================================
-- First, get a valid content ID:

SELECT id, title FROM movies LIMIT 1;

-- Then uncomment and run this (replace 1 with actual ID):
-- SELECT increment_view_count(1, 'movie', 550, NULL, 'test_session');

-- Check if it worked (replace 1 with actual ID):
-- SELECT id, title, view_count FROM movies WHERE id = 1;


-- ==========================================
-- All done! View tracking is verified
-- ==========================================
