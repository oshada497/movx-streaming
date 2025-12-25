# Simple Login Without OAuth (Recommended)

Since Cloudflare Workers has issues with dynamic ESM imports for the Supabase JS client, I recommend using a simpler authentication approach that doesn't require Google OAuth.

## Option 1: Email/Password Auth (Simpler)

Add email/password authentication directly through Supabase REST API - no imports needed!

## Option 2: Disable Authentication

For a streaming site, you might not need user authentication at all. Most streaming sites only use it for:
- Watchlist (can be stored in localStorage)
- User preferences (can be stored in localStorage)
- Admin access (can use a simple password check)

## Option 3: Use Supabase Hosted UI

Instead of handling OAuth in the worker, redirect users directly to Supabase's hosted auth UI.

---

## Quick Fix: Disable Login Button

If you don't need authentication right now, we can simply:
1. Remove the login button
2. Keep watchlist in localStorage (already working)
3. Admins can access admin panel with a simple password

Would you like me to implement one of these options?
