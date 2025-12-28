# View Tracking & Analytics System

## Overview
The FBFLIX streaming platform now includes a comprehensive view tracking and analytics system that monitors user viewing activity and displays trending content based on actual viewership data.

## Features

### 1. **View Count Tracking**
- Automatically tracks every time a user clicks "Watch Now" or plays an episode
- Stores individual view events with timestamps for detailed analytics
- Maintains total view counts for each movie and TV show

### 2. **View Analytics**
- Detailed view history stored in Supabase database
- Tracks both authenticated and anonymous users
- Session-based tracking for anonymous viewers
- User-based tracking for logged-in users
- Timestamp tracking for time-based analytics

### 3. **Trending Algorithm**
- Displays most-watched content in the "Trending Now" section
- Calculates trending based on views from the last 30 days
- Real-time updates as view counts change
- Fallback to recently added content if no trending data exists

### 4. **Visual Indicators**
- 🔥 Fire badge on trending content cards
- View counts displayed in human-readable format (1K, 1M, etc.)
- Animated badges with pulse and flicker effects
- Golden text for view counts in card metadata

## Database Schema

### New Columns
```sql
-- Added to movies table
view_count INTEGER DEFAULT 0

-- Added to tv_shows table
view_count INTEGER DEFAULT 0
```

### New Table: view_history
```sql
CREATE TABLE view_history (
    id BIGSERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL,
    content_type TEXT NOT NULL, -- 'movie' or 'tv'
    tmdb_id INTEGER,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID,  -- NULL for anonymous users
    session_id TEXT,  -- For anonymous tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Functions

#### increment_view_count()
Increments the view count for content and records the view in history.

```sql
SELECT increment_view_count(
    p_content_id := 123,
    p_content_type := 'movie',
    p_tmdb_id := 550,
    p_user_id := 'uuid-here',  -- optional
    p_session_id := 'session-id'  -- optional
);
```

#### get_trending_content()
Returns most-viewed content in a specified time period.

```sql
SELECT * FROM get_trending_content(
    days_limit := 30,  -- Look back 30 days
    result_limit := 10  -- Return top 10
);
```

## API Methods

### DB.trackView(contentId, contentType, tmdbId)
Tracks a view for the specified content.

```javascript
await DB.trackView(123, 'movie', 550);
```

**Parameters:**
- `contentId` (number): Database ID of the content
- `contentType` (string): 'movie' or 'tv'
- `tmdbId` (number): TMDB ID for reference

**Returns:** `Promise<boolean>` - Success status

---

### DB.getTrendingContent(daysLimit, resultLimit)
Gets trending content based on recent views.

```javascript
const trending = await DB.getTrendingContent(30, 10);
```

**Parameters:**
- `daysLimit` (number): Days to look back (default: 30)
- `resultLimit` (number): Number of results (default: 10)

**Returns:** `Promise<Array>` - Array of trending content with view counts

---

### DB.getViewStats(tmdbId, contentType)
Gets view statistics for specific content.

```javascript
const stats = await DB.getViewStats(550, 'movie');
// Returns: { totalViews: 1234, recentViews: 45, contentId: 123 }
```

**Parameters:**
- `tmdbId` (number): TMDB ID of the content
- `contentType` (string): 'movie' or 'tv'

**Returns:** `Promise<object>` - Object with totalViews, recentViews, contentId

---

### DB.getMostPopular(limit)
Gets most popular content by total views (all-time).

```javascript
const popular = await DB.getMostPopular(10);
```

**Parameters:**
- `limit` (number): Number of results (default: 10)

**Returns:** `Promise<Array>` - Array of most popular content

## Setup Instructions

### 1. Run the Database Migration
Execute the SQL migration file in your Supabase dashboard:

```bash
# File: add_view_tracking.sql
```

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `add_view_tracking.sql`
3. Execute the query

### 2. Verify Tables Created
Check that these were created:
- ✅ `view_count` column in `movies`
- ✅ `view_count` column in `tv_shows`
- ✅ `view_history` table
- ✅ `increment_view_count()` function
- ✅ `get_trending_content()` function

### 3. Deploy Frontend Updates
The frontend code is already integrated in:
- `db.js` - Database methods
- `details.js` - View tracking on playback
- `app.js` - Trending section display
- `styles.css` - Trending badge styles

## How It Works

### View Tracking Flow
```
1. User clicks "Watch Now" or plays episode
   ↓
2. details.js calls DB.trackView()
   ↓
3. Database function runs:
   - Increments view_count in movies/tv_shows table
   - Inserts record into view_history table
   - Records user_id (if logged in) or session_id
   ↓
4. View count updated in real-time
```

### Trending Calculation Flow
```
1. Homepage loads
   ↓
2. app.js calls DB.getTrendingContent(30, 6)
   ↓
3. Database function:
   - Queries view_history for last 30 days
   - Groups by content_id and content_type
   - Counts views per content
   - Orders by view count DESC
   - Returns top 6 results
   ↓
4. Trending section displays with fire badges and view counts
```

## Privacy Considerations

- **Anonymous Users**: Tracked by session ID (stored in sessionStorage)
- **Logged-in Users**: Tracked by user ID from Supabase Auth
- **No Personal Data**: Only view counts and timestamps are stored
- **Session-based**: Session ID changes per browser session

## Performance Optimizations

- Indexed columns for fast queries
- Session storage used to avoid repeated API calls
- Cache clearing on view tracking ensures fresh data
- Efficient database functions for aggregation
- Limited result sets (top 10/6) to minimize data transfer

## Future Enhancements

Potential features to add:
- [ ] Weekly trending charts
- [ ] Most popular by genre
- [ ] View duration tracking
- [ ] Recommendation engine based on viewing history
- [ ] Admin analytics dashboard
- [ ] Export view analytics as CSV
- [ ] Viewership graphs over time
- [ ] Real-time trending updates

## Troubleshooting

### Views Not Tracking
1. Check browser console for errors
2. Verify Supabase connection
3. Ensure `increment_view_count` function exists
4. Check Row Level Security policies

### Trending Section Empty
1. Verify content has been watched
2. Check `view_history` table has records
3. Try adjusting `days_limit` parameter
4. Ensure `get_trending_content` function exists

### Database Errors
```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('increment_view_count', 'get_trending_content');

-- Check view history records
SELECT COUNT(*) FROM view_history;

-- Check view counts
SELECT title, view_count FROM movies ORDER BY view_count DESC LIMIT 10;
```

## Analytics Queries

### Top 10 Movies by Views
```sql
SELECT title, view_count 
FROM movies 
WHERE view_count > 0 
ORDER BY view_count DESC 
LIMIT 10;
```

### Recent Views (Last 24 Hours)
```sql
SELECT 
    vh.content_type,
    COALESCE(m.title, t.title) as title,
    COUNT(*) as views
FROM view_history vh
LEFT JOIN movies m ON vh.content_type = 'movie' AND vh.content_id = m.id
LEFT JOIN tv_shows t ON vh.content_type = 'tv' AND vh.content_id = t.id
WHERE vh.viewed_at >= NOW() - INTERVAL '24 hours'
GROUP BY vh.content_type, COALESCE(m.title, t.title)
ORDER BY views DESC;
```

### User Viewing Activity
```sql
SELECT 
    user_id,
    COUNT(*) as total_views,
    COUNT(DISTINCT content_id) as unique_content
FROM view_history
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY total_views DESC;
```

---

**Last Updated**: December 28, 2024  
**Version**: 1.0.0  
**Author**: FBFLIX Development Team
