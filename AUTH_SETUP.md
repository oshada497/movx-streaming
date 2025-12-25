# Authentication Setup Guide

You have successfully migrated to a **Serverless Authentication Flow**. This keeps your Supabase keys completely hidden from the frontend.

## 1. Configure Cloudflare Worker
Your Cloudflare Worker (`backend/worker.js`) now handles the OAuth handshake.
Ensure your Worker environment variables (Secrets) are set:
- `SUPABASE_URL`: Your Supabase Project URL
- `SUPABASE_KEY`: Your Supabase **Service Role Key** (Safe to use here!) or Anon Key.

## 2. Configure Google Cloud Console
You must update your Google OAuth Client to allow the new Worker redirect URI.

1. Go to **Google Cloud Console** > **APIs & Services** > **Credentials**.
2. Edit your **OAuth 2.0 Client ID**.
3. Under **Authorized redirect URIs**, ADD:
   ```
   https://movx-streaming-backend.samename253.workers.dev/auth/callback
   ```
   *(Keep your existing ones if you want, but this new one is required for the new flow).*
4. Save the changes.

## 3. Configure Supabase Dashboard
Supabase needs to know that your Worker is allowed to handle auth redirects.

1. Go to your **Supabase Dashboard** > **Authentication** > **URL Configuration**.
2. Under **Redirect URLs**, click **Add URL**.
3. Add your Worker's callback URL:
   ```
   https://movx-streaming-backend.samename253.workers.dev/auth/callback
   ```
4. Click **Save**.

## 4. How it Works
1. **User clicks Login**: Frontend redirects to `https://movx-streaming-backend.../auth/login`.
2. **Worker**: Redirects user to Google.
3. **Google**: Authenticates user and redirects back to `.../auth/callback`.
4. **Worker**: Exchanges code for session, then redirects back to your site (`https://fbflix.online`) with the access token in the URL hash.
5. **Frontend**: Grabs the token, saves it, and logs the user in.

## Troubleshooting
- **"Redirect_uri_mismatch"**: Check step 2 carefully. The URI must match EXACTLY.
- **Login loop**: Ensure your browser isn't blocking cookies or local storage.
