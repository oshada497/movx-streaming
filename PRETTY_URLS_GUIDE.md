# Pretty URLs Implementation Guide

## Goal
Change URLs from:  
`https://fbflix.online/details?id=293660&type=movie`

To:  
`https://fbflix.online/deadpool`

---

## Implementation Steps

### Step 1: Run Database Migration

Run `add_slug_support.sql` in Supabase SQL Editor.

This will:
- ✅ Add `slug` column to movies and tv_shows
- ✅ Generate slugs from existing titles (e.g., "Deadpool" → "deadpool")
- ✅ Handle duplicate slugs by appending ID
- ✅ Create auto-slug generation triggers
- ✅ Create `get_content_by_slug()` lookup function

---

### Step 2: Update `db.js` - Add Slug Functions

Add these functions to the `DB` object in `db.js`:

```javascript
// In db.js, add to DB object:

async getContentBySlug(slug) {
    try {
        const { data, error } = await window.auth.supabase
            .rpc('get_content_by_slug', { p_slug: slug });
        
        if (error || !data || data.length === 0) {
            console.log('[DB] No content found for slug:', slug);
            return null;
        }
        
        const result = data[0];
        console.log('[DB] Found by slug:', result);
        
        // Now get the full content details
        if (result.content_type === 'movie') {
            return await this.getMovieByTmdbId(result.tmdb_id);
        } else {
            return await this.getTVShowByTmdbId(result.tmdb_id);
        }
    } catch (e) {
        console.error('[DB] Error getting content by slug:', e);
        return null;
    }
},

// Generate slug from title (client-side)
generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
}
```

---

### Step 3: Update Link Generation

In `app.js` and other files, change how links are generated:

**Before:**
```javascript
<a href="details.html?id=${item.tmdb_id}&type=movie">
```

**After:**
```javascript
<a href="/${item.slug || 'details?id=' + item.tmdb_id + '&type=movie'}">
```

Or create a helper function:

```javascript
// Add to app.js or create utils.js
function getContentUrl(item, type) {
    if (item.slug) {
        return `/${item.slug}`;
    }
    return `/details?id=${item.tmdb_id || item.id}&type=${type}`;
}

// Usage:
<a href="${getContentUrl(item, 'movie')}">
```

---

### Step 4: Create Route Handler

Since this is a static site on Cloudflare Pages, you need to handle routing client-side.

**Option A: Update `index.html` to handle all routes**

Add this to the beginning of your main app.js or create a new `router.js`:

```javascript
// router.js - Handle pretty URLs
async function handleRoute() {
    const path = window.location.pathname;
    
    // Skip if it's a static file or already on a page
    if (path.includes('.') || path === '/' || path === '/index.html') {
        return;
    }
    
    // Extract slug from path (e.g., "/deadpool" → "deadpool")
    const slug = path.replace(/^\//, '').replace(/\/$/, '');
    
    if (!slug) return;
    
    console.log('[Router] Handling slug:', slug);
    
    // Look up content by slug
    const content = await DB.getContentBySlug(slug);
    
    if (content) {
        // Redirect to details page with proper parameters
        const type = content.content_type || 'movie';
        const id = content.tmdb_id;
        window.location.href = `/details?id=${id}&type=${type}`;
    } else {
        // 404 - content not found
        console.error('[Router] Content not found for slug:', slug);
        // Optionally redirect to home or show 404
        window.location.href = '/';
    }
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleRoute);
} else {
    handleRoute();
}
```

---

### Step 5: Update `_redirects` File

The `_redirects` file tells Cloudflare Pages how to route requests.

Current content:
```
/*  /index.html  200
```

This catches all routes and serves `index.html`, which then runs the router.

---

## Testing

1. **Run the SQL migration**
2. **Check slugs were created:**
   ```sql
   SELECT id, title, slug FROM movies LIMIT 10;
   ```

3. **Test slug lookup:**
   ```sql
   SELECT * FROM get_content_by_slug('deadpool');
   ```

4. **Update your code** with the changes above
5. **Deploy to Cloudflare Pages**
6. **Test URLs:**
   - `https://fbflix.online/deadpool` → Should load Deadpool movie
   - `https://fbflix.online/breaking-bad` → Should load Breaking Bad

---

## Fallback Support

The system supports both URL formats:
- ✅ New: `/deadpool`
- ✅ Old: `/details?id=293660&type=movie`

This ensures existing links don't break!

---

## Auto-Slug Generation

When you add new movies via admin panel, slugs are generated automatically.

The trigger ensures:
- Slugs are created from titles
- Duplicates get ID appended (e.g., `deadpool-2`)
- Special characters are removed
- Spaces become hyphens

---

**Ready to implement? Start with Step 1!** 🚀
