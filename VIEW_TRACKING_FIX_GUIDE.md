# View Tracking System - Complete Fix Guide

## Problem Diagnosis

Your view count updating system is not working. This guide will help you identify and fix the issue.

## Common Issues and Solutions

### Issue 1: Database Functions Not Created or Missing Permissions

**Symptoms:**
- Views are not incrementing when you click "Watch Now"
- Console shows RPC errors or "function does not exist"
- Trending section shows no data or outdated data

**Solution:**
Run the `COMPLETE_VIEW_FIX.sql` script in your Supabase SQL Editor.

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `COMPLETE_VIEW_FIX.sql`
3. Paste and execute the script
4. Check the verification output at the bottom

---

### Issue 2: Row Level Security (RLS) Blocking Updates

**Symptoms:**
- Direct inserts to `view_history` work, but RPC calls fail
- Console shows permission errors

**Fix Applied:**
The `COMPLETE_VIEW_FIX.sql` script adds `SECURITY DEFINER` to functions, which bypasses RLS.

**Verify:**
```sql
-- Check function security
SELECT routine_name, security_type 
FROM information_schema.routines 
WHERE routine_name IN ('increment_view_count', 'get_trending_content');
```

Should show `security_type` as `DEFINER`.

---

### Issue 3: Missing or Null view_count Columns

**Symptoms:**
- View counts show as `null` or `NaN`
- Sorting doesn't work properly

**Fix:**
The script ensures all NULL values are set to 0 and adds proper defaults.

**Verify:**
```sql
-- Check for NULL view counts
SELECT COUNT(*) FROM movies WHERE view_count IS NULL;
SELECT COUNT(*) FROM tv_shows WHERE view_count IS NULL;
```

Both should return 0.

---

### Issue 4: Frontend Not Calling trackView

**Symptoms:**
- No console logs when clicking "Watch Now"
- Database never receives view tracking calls

**Check:**
Open browser console and look for these logs when you click "Watch Now":
```
[DB] Tracking view: {contentId: X, contentType: "movie", ...}
View tracked for: {contentId: X, ...}
```

**Fix:**
The tracking calls are already in place in `details.js` lines 240, 276, and 300.

**Verify Code:**
```javascript
// This should exist in details.js
await DB.trackView(storedItem.id, type, id);
```

---

### Issue 5: Auth Not Initialized

**Symptoms:**
- Console shows "window.auth.supabase is undefined"
- trackView returns false immediately

**Fix:**
Ensure auth.js loads before db.js in `details.html`.

**Check Loading Order:**
```html
<script src="config.js?v=2.6" defer></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
<script src="auth.js?v=2.6" defer></script>
<script src="db.js?v=2.6" defer></script>
<script src="details.js?v=2.6" defer></script>
```

---

### Issue 6: storedItem is NULL

**Symptoms:**
- Console shows "View tracked for:" but with undefined values
- Only TMDB content (not in database) is being tracked

**Fix:**
Content must be added to Supabase database first via Admin Panel.

**Check:**
1. Go to admin panel
2. Search for the movie/TV show
3. Add it to your database
4. Try watching again

---

## Step-by-Step Debugging Process

### Step 1: Run the Fix Script
1. Go to Supabase → SQL Editor
2. Run `COMPLETE_VIEW_FIX.sql`
3. Check the verification output

### Step 2: Verify Database Setup
Run this query in Supabase SQL Editor:
```sql
SELECT * FROM test_view_tracking();
```

All tests should show "PASS".

### Step 3: Test Manual View Tracking
Run this in Supabase SQL Editor:
```sql
-- Replace 1 with an actual content ID from your movies table
SELECT increment_view_count(1, 'movie', 550, NULL, 'test_session');

-- Check if it worked
SELECT id, title, view_count FROM movies WHERE id = 1;
```

The view_count should increment by 1.

### Step 4: Check Frontend Console
1. Open your site in browser
2. Open Developer Tools (F12) → Console tab
3. Navigate to a movie details page
4. Click "Watch Now"
5. Look for these logs:

**Expected Logs:**
```
[DB] Tracking view: {contentId: 123, contentType: "movie", tmdbId: 550, ...}
[DB] View tracked successfully via RPC
[DB] Cache cleared after view tracking
View tracked for: {contentId: 123, type: "movie", tmdbId: 550}
```

**Error Logs to Watch For:**
- "window.auth.supabase is undefined" → Auth issue
- "function increment_view_count does not exist" → Database function missing
- "permission denied" → RLS issue (should be fixed by script)

### Step 5: Verify View History
After clicking "Watch Now", run this in Supabase:
```sql
SELECT * FROM view_history ORDER BY created_at DESC LIMIT 5;
```

You should see your recent view.

### Step 6: Check Trending Content
Run this in Supabase:
```sql
SELECT * FROM get_trending_content(30, 10);
```

Should return content sorted by view count.

---

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] Ran `COMPLETE_VIEW_FIX.sql` script
- [ ] Verified all tests in `test_view_tracking()` pass
- [ ] Added content to database via admin panel (not just viewing TMDB content)
- [ ] Console shows tracking logs when clicking "Watch Now"
- [ ] `view_history` table receives new records
- [ ] `view_count` column increments in movies/tv_shows tables
- [ ] `get_trending_content()` returns data
- [ ] Trending section displays on homepage
- [ ] No RLS permission errors in console

---

## If Still Not Working

### Check These Specific Issues:

**1. Content Not In Database**
```javascript
// In details.js, check if storedItem exists
console.log('storedItem:', storedItem);
```

If `storedItem` is null, the content is not in your Supabase database. Add it via admin panel first.

**2. Different TMDB ID vs Database ID**
The function needs the **database ID** (from Supabase), not the TMDB ID.

```javascript
// Correct:
await DB.trackView(storedItem.id, type, id); // storedItem.id is database ID

// Wrong:
await DB.trackView(id, type, id); // id is TMDB ID
```

**3. Cache Issues**
Clear browser cache and sessionStorage:
```javascript
// In console
sessionStorage.clear();
localStorage.clear();
location.reload();
```

**4. Multiple Database Instances**
Ensure you're using the correct Supabase project URL in `config.js`.

---

## Expected Behavior After Fix

1. **When you click "Watch Now":**
   - Console logs appear
   - `view_history` table gets a new record
   - `view_count` increments in movies/tv_shows table

2. **On Homepage:**
   - "Trending Now" section shows most-viewed content
   - Fire badges appear on trending items
   - View counts display next to titles

3. **Database:**
   - `view_history` table fills with data
   - Movies/TV shows have non-zero `view_count` values
   - `get_trending_content()` function returns sorted results

---

## Support SQL Queries

### Check Recent Views
```sql
SELECT 
    content_type,
    content_id,
    tmdb_id,
    viewed_at,
    user_id,
    session_id
FROM view_history
ORDER BY viewed_at DESC
LIMIT 10;
```

### Check Top Viewed Content
```sql
SELECT 'movie' as type, title, view_count
FROM movies
ORDER BY view_count DESC
LIMIT 5

UNION ALL

SELECT 'tv' as type, title, view_count
FROM tv_shows
ORDER BY view_count DESC
LIMIT 5;
```

### Manual View Count Reset (if needed)
```sql
-- Reset all view counts to 0
UPDATE movies SET view_count = 0;
UPDATE tv_shows SET view_count = 0;
DELETE FROM view_history;
```

---

## Contact Points

If the issue persists after following this guide:

1. Check Supabase logs for errors
2. Share console error messages
3. Run `test_view_tracking()` and share results
4. Share the output of recent view_history records

---

**Last Updated:** December 28, 2024  
**Version:** 2.0 (Complete Fix)
