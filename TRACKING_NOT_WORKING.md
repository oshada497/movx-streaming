# 🚨 VIEW TRACKING NOT WORKING - EMERGENCY CHECKLIST

## You opened 3 movies but no views tracked? Let's fix it NOW.

---

## ⚡ MOST LIKELY ISSUES (Check These First)

### Issue #1: Did you run COMPLETE_VIEW_FIX.sql in Supabase?
**Check:** Go to Supabase → SQL Editor  
**Run this:**
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'increment_view_count';
```

**Expected:** Should return one row with `increment_view_count`  
**If empty:** ❌ You didn't run the fix script!  
**Solution:** Run `COMPLETE_VIEW_FIX.sql` in Supabase NOW

---

### Issue #2: Are those movies in your Supabase database?
**Check:** The movies you watched - are they added via admin panel?  
**Run this in Supabase:**
```sql
SELECT id, title, tmdb_id, view_count FROM movies LIMIT 10;
```

**If empty:** ❌ No movies in database!  
**Solution:** Add movies via admin panel FIRST before watching

**CRITICAL:** You can only track views for movies that exist in YOUR Supabase database, not just TMDB movies!

---

### Issue #3: Check browser console for errors
**Do this:**
1. Open the movie details page
2. Press F12 (open DevTools)
3. Go to Console tab
4. Click "Watch Now"
5. Look for these logs:

**Expected logs:**
```
[DB] Tracking view: {contentId: 123, ...}
[DB] View tracked successfully via RPC
```

**If you see:**
- `window.auth.supabase is undefined` → Auth issue
- `function does not exist` → You didn't run SQL script
- `storedItem is null` → Movie not in database
- No logs at all → Script not loaded

---

## 🔍 DETAILED DIAGNOSTIC (Use debug-tracking.html)

1. Open `debug-tracking.html` in your browser
2. Click through all the test buttons in order
3. The tool will tell you EXACTLY what's wrong

**Auto-checks on page load:**
- ✅ DB.trackView exists
- ✅ Auth connected
- ✅ Database connected  
- ✅ increment_view_count function exists

---

## 📋 STEP-BY-STEP FIX

### Step 1: Verify SQL Script Was Run
```sql
-- Run in Supabase SQL Editor:
SELECT * FROM test_view_tracking();
```

**All should show "PASS"**  
If not, run `COMPLETE_VIEW_FIX.sql`

---

### Step 2: Add a Movie to Database

1. Go to admin panel
2. Search for a movie (e.g., "Fight Club")
3. Add it to database
4. Note the database ID (not TMDB ID!)

---

### Step 3: Test Tracking Manually

```sql
-- Replace X with the database ID from Step 2
SELECT increment_view_count(X, 'movie', 550, NULL, 'test');

-- Check if it worked:
SELECT id, title, view_count FROM movies WHERE id = X;
```

**view_count should be 1** (or increment by 1)

---

### Step 4: Test on Website

1. Go to the movie you added
2. Open browser console (F12)
3. Click "Watch Now"
4. Check console logs

**Must see:**
```
[DB] Tracking view: ...
[DB] View tracked successfully via RPC
```

---

### Step 5: Verify in Database

```sql
-- Check view_history table:
SELECT * FROM view_history ORDER BY created_at DESC LIMIT 5;

-- Should see your view!
```

---

## 🎯 COMMON MISTAKES

### ❌ Mistake 1: Watching TMDB-only movies
**Problem:** Movie exists in TMDB but NOT in your Supabase database  
**Fix:** Add the movie via admin panel first

### ❌ Mistake 2: Didn't run SQL script
**Problem:** Database functions don't exist  
**Fix:** Run `COMPLETE_VIEW_FIX.sql` in Supabase

### ❌ Mistake 3: Wrong content ID
**Problem:** Using TMDB ID instead of database ID  
**Fix:** In details.js, it should use `storedItem.id` not `id`

### ❌ Mistake 4: Auth not initialized
**Problem:** window.auth.supabase is undefined  
**Fix:** Check if scripts load in correct order in HTML

### ❌ Mistake 5: Cache issues
**Problem:** Old code cached in browser  
**Fix:**
```javascript
// In browser console:
sessionStorage.clear();
localStorage.clear();
location.reload();
```

---

## 🔧 QUICK DEBUG COMMANDS

### Check if function exists:
```sql
SELECT routine_name, security_type 
FROM information_schema.routines 
WHERE routine_name = 'increment_view_count';
```

### Check movies in database:
```sql
SELECT COUNT(*) as total_movies FROM movies;
```

### Check view history:
```sql
SELECT COUNT(*) as total_views FROM view_history;
```

### Check recent views:
```sql
SELECT 
    content_id,
    content_type,
    viewed_at,
    session_id
FROM view_history 
ORDER BY viewed_at DESC 
LIMIT 5;
```

---

## 🆘 STILL NOT WORKING?

### Use the diagnostic tool:
1. Open `debug-tracking.html`
2. Click all test buttons
3. Click "Generate Report"
4. Share the results

### Check these specific things:

**In browser console:**
```javascript
// Check if DB.trackView exists:
console.log(typeof DB.trackView); // Should be "function"

// Check if auth works:
console.log(window.auth ? 'Auth loaded' : 'Auth missing');
console.log(window.auth?.supabase ? 'Supabase connected' : 'Supabase missing');
```

**In details.js (line 240, 276, 300):**
```javascript
await DB.trackView(storedItem.id, type, id);
```

**Check storedItem:**
```javascript
// In browser console on details page:
console.log('storedItem:', storedItem);
// Should show object with id, title, etc.
// If null → movie not in database!
```

---

## ✅ WORKING CORRECTLY LOOKS LIKE:

### In browser console:
```
[DB] Tracking view: {contentId: 1, contentType: "movie", tmdbId: 550, ...}
[DB] View tracked successfully via RPC
[DB] Cache cleared after view tracking
View tracked for: {contentId: 1, type: "movie", tmdbId: 550}
```

### In Supabase:
```sql
SELECT * FROM view_history ORDER BY created_at DESC LIMIT 1;
-- Should show your recent view

SELECT id, title, view_count FROM movies ORDER BY view_count DESC LIMIT 5;
-- Should show movies with view counts
```

---

## 🎯 FINAL CHECKLIST

Before asking for more help, verify:

- [ ] Ran `COMPLETE_VIEW_FIX.sql` in Supabase
- [ ] Ran `SELECT * FROM test_view_tracking();` - all show PASS
- [ ] Movies exist in Supabase (not just TMDB)
- [ ] Browser console shows tracking logs
- [ ] No errors in console
- [ ] Cleared browser cache
- [ ] Used `debug-tracking.html` tool

---

**If all checked and still not working, run `debug-tracking.html` and share the "Generate Report" output.**
