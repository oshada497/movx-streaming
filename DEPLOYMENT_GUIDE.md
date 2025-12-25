# Cloudflare Worker Deployment Guide

## ✅ Fixes Applied

All critical issues have been fixed in `backend/worker.js`:

1. **CORS Headers** - Now properly returned even on errors
2. **Error Handling** - Supabase functions wrapped in try-catch blocks
3. **CSP Updates** - Added wildcard TMDB image support (`https://*.tmdb.org`)
4. **Response Handling** - Fixed body streaming issues that caused 500 errors

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] Cloudflare account with Workers access
- [ ] Worker already created at: `movx-streaming-backend.samename253.workers.dev`
- [ ] Environment variables configured in Cloudflare Dashboard

## 🚀 Deployment Options

### Option 1: Deploy via Cloudflare Dashboard (Recommended)

Since Wrangler is not installed locally, use the web interface:

1. **Go to Cloudflare Workers Dashboard:**
   - Visit: https://dash.cloudflare.com/
   - Navigate to: **Workers & Pages** → **Overview**
   - Find and click on: `movx-streaming-backend`

2. **Update the Worker Code:**
   - Click **Quick edit** or **Edit code**
   - Copy the entire contents of `backend/worker.js`
   - Paste it into the editor, replacing all existing code
   - Click **Save and Deploy**

3. **Verify Environment Variables:**
   Make sure these are set in **Settings** → **Variables**:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `TMDB_READ_TOKEN`
   - `GEMINI_API_KEY`

### Option 2: Install Wrangler and Deploy via CLI

If you want to deploy via command line in the future:

1. **Install Wrangler globally:**
   ```powershell
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```powershell
   wrangler login
   ```

3. **Deploy from backend directory:**
   ```powershell
   cd backend
   wrangler deploy
   ```

## ✅ Post-Deployment Testing

After deploying, test these endpoints in your browser console or via curl:

### 1. Test Movies Endpoint
```javascript
fetch('https://movx-streaming-backend.samename253.workers.dev/api/movies')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected:** JSON array of movies (or empty array `[]`)
**Must Have:** NO CORS errors in console

### 2. Test TV Shows Endpoint
```javascript
fetch('https://movx-streaming-backend.samename253.workers.dev/api/tv')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected:** JSON array of TV shows (or empty array `[]`)
**Must Have:** NO CORS errors in console

### 3. Check CORS Headers
Open DevTools Network tab and check the response headers should include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Content-Type: application/json
```

## 🔍 Troubleshooting

### If you still see 500 errors:

1. **Check Cloudflare Worker Logs:**
   - Dashboard → Worker → **Logs** tab
   - Look for error messages

2. **Verify Supabase Credentials:**
   - Make sure `SUPABASE_URL` and `SUPABASE_KEY` are correct
   - Test direct Supabase REST API access

3. **Check Supabase Tables Exist:**
   - Ensure tables `movies`, `tv_shows`, and `episodes` exist
   - Verify they have the correct schema

### If you still see CORS errors:

1. **Hard refresh the frontend:**
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache

2. **Check browser console:**
   - Should see NO errors like "No 'Access-Control-Allow-Origin' header"

3. **Verify frontend is hitting the correct backend URL:**
   - Check `config.js`: API_BASE_URL should be `https://movx-streaming-backend.samename253.workers.dev`

### If images still don't load:

1. **Deploy frontend to Cloudflare Pages** (`_headers` file was updated)
2. **Hard refresh** after deployment
3. **Check CSP headers** in Network tab - should include `https://*.tmdb.org`

## 📝 Summary of Changes

**File: `backend/worker.js`**
- ✅ Moved Supabase initialization into try-catch block
- ✅ Added error handling to all helper functions
- ✅ Fixed response body handling (text() instead of body stream)
- ✅ Updated CSP to include `https://*.tmdb.org`
- ✅ Ensured CORS headers on all responses

**File: `_headers`**
- ✅ Added `https://*.tmdb.org` to CSP img-src directive

## 🎯 Next Steps

1. Deploy the updated `backend/worker.js` using Option 1 above
2. Test the endpoints as described
3. Reload your frontend at `https://fbflix.online`
4. Verify:
   - ✅ No CORS errors
   - ✅ No 500 errors
   - ✅ Images load correctly
   - ✅ Content displays properly

If everything works, you're done! 🎉
