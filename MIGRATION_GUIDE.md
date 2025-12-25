# Migration Guide: Moving to Cloudflare Workers

To secure your application, we have moved the backend logic to a Cloudflare Worker. This ensures your API keys are never exposed to the browser.

## Step 1: Deploy the Worker

1.  **Install Wrangler** (Cloudflare CLI) if you haven't:
    ```bash
    npm install -g wrangler
    ```

2.  **Login to Cloudflare**:
    ```bash
    wrangler login
    ```

3.  **Navigate to the backend folder**:
    ```bash
    cd backend
    ```

4.  **Set your Secrets** (IMPORTANT):
    Run these commands one by one and paste your keys when prompted:
    ```bash
    wrangler secret put SUPABASE_URL
    wrangler secret put SUPABASE_KEY
    wrangler secret put TMDB_READ_TOKEN
    wrangler secret put GEMINI_API_KEY
    ```
    *Note: For `TMDB_READ_TOKEN`, you can use your API Key if you adjust the `worker.js` header slightly, or just use the API Key as the secret.*

5.  **Deploy**:
    ```bash
    wrangler deploy
    ```

6.  **Copy your Worker URL**:
    After deployment, Cloudflare will give you a URL like `https://movx-streaming-backend.yourname.workers.dev`.

## Step 2: Update Frontend

Once you have your Worker URL:

1.  Open `config.js` in the root folder.
2.  Replace the `API_BASE_URL` (or add it) with your new Worker URL.
3.  We will then update `db.js`, `api.js`, and `translator.js` to fetch from this URL instead of using keys directly.
