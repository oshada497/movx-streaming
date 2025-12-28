-- ==========================================
-- DETAILED VERIFICATION QUERIES
-- ⚠️ IMPORTANT: Copy and run EACH query ONE AT A TIME
-- Do NOT run this entire file at once!
-- ==========================================

-- ==========================================
-- QUERY 1: Quick Setup Check ✅
-- Copy lines 9-10 and run:
-- ==========================================

SELECT * FROM test_view_tracking();


-- ==========================================
-- QUERY 2: Top Viewed Content
-- Copy lines 18-35 and run:
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


-- ==========================================
-- QUERY 3: Recent View History
-- Copy lines 43-53 and run:
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


-- ==========================================
-- QUERY 4: Test Trending Function
-- Copy lines 61-62 and run:
-- ==========================================

SELECT * FROM get_trending_content(30, 10);


-- ==========================================
-- QUERY 5: System Statistics
-- Copy lines 70-99 and run:
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
-- QUERY 6: Get Sample Movie ID (for testing)
-- Copy lines 107-108 and run:
-- ==========================================

SELECT id, title FROM movies LIMIT 1;

-- After getting an ID above, test tracking by running:
-- (Replace X with the actual ID from above)
--
-- SELECT increment_view_count(X, 'movie', 550, NULL, 'test_session');
--
-- Then check if it worked:
-- SELECT id, title, view_count FROM movies WHERE id = X;


-- ==========================================
-- Remember: Run each query SEPARATELY!
-- ==========================================
