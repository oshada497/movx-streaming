# Supabase & Google OAuth Configuration Guide

Follow these steps **in order** to set up Google authentication. I'll implement the code once you provide the credentials.

---

## Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one if needed)
3. Go to **Project Settings** (gear icon in sidebar) → **API**
4. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (the long string under "Project API keys")

**✋ Stop here and provide me with:**
```
SUPABASE_URL: <paste Project URL here>
SUPABASE_ANON_KEY: <paste anon public key here>
```

---

## Step 2: Configure Supabase Site URL (After Step 1)

1. Still in Supabase Dashboard
2. Go to **Authentication** → **URL Configuration**
3. Set **Site URL** to: `https://fbflix.online`
4. Under **Redirect URLs**, click **Add URL** and add these one by one:
   - `https://fbflix.online`
   - `https://fbflix.online/`
   - `https://fbflix.online/**`
5. Click **Save**

---

## Step 3: Get Google OAuth Callback URL from Supabase

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Scroll down and find **Google**
3. **DO NOT enable it yet** - first copy the **Callback URL (for OAuth)**
   - It looks like: `https://xxxxx.supabase.co/auth/v1/callback`

**✋ Keep this URL handy - you'll need it in Step 4**

---

## Step 4: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select a project (or create new: **New Project** → Name it "FBFlix" → Create)
3. Wait for project to be created, then select it from the dropdown

### 4a. Configure OAuth Consent Screen (First Time Only)

1. Go to **APIs & Services** → **OAuth consent screen** (left sidebar)
2. Choose **External** → Click **CREATE**
3. Fill in the form:
   - **App name**: `FBFlix`
   - **User support email**: Select your email from dropdown
   - **Developer contact**: Enter your email
4. Click **SAVE AND CONTINUE**
5. On "Scopes" page, click **SAVE AND CONTINUE** (default scopes are fine)
6. On "Test users" page:
   - Click **+ ADD USERS**
   - Enter your email address
   - Click **SAVE AND CONTINUE**
7. Review and click **BACK TO DASHBOARD**

### 4b. Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Choose **Application type**: **Web application**
4. **Name**: `FBFlix OAuth`
5. Under **Authorized redirect URIs**:
   - Click **+ ADD URI**
   - Paste the Supabase callback URL from Step 3
   - Example: `https://xxxxx.supabase.co/auth/v1/callback`
6. Click **CREATE**
7. A popup appears with your credentials:
   - Copy **Client ID** 
   - Copy **Client Secret**

**✋ Stop here and provide me with:**
```
GOOGLE_CLIENT_ID: <paste Client ID here>
GOOGLE_CLIENT_SECRET: <paste Client Secret here>
```

---

## Step 5: Enable Google Provider in Supabase (After Step 4)

1. Back to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google** to ON
4. Paste your credentials from Step 4:
   - **Client ID (for OAuth)**: Paste the Google Client ID
   - **Client Secret (for OAuth)**: Paste the Google Client Secret
5. Click **Save**

---

## ✅ Configuration Complete!

Once you've completed all 5 steps and provided me with the credentials from Step 1 and Step 4, I'll implement the authentication code and we can test it!

**Credentials I need from you:**
1. `SUPABASE_URL` (from Step 1)
2. `SUPABASE_ANON_KEY` (from Step 1)
3. `GOOGLE_CLIENT_ID` (from Step 4) - Optional, just for reference
4. `GOOGLE_CLIENT_SECRET` (from Step 4) - Optional, just for reference

The Google credentials are already stored in Supabase, so I only really need the Supabase ones to implement the frontend code!
