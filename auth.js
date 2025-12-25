// ===== Authentication Module =====
// Handles Google OAuth via Supabase

class Auth {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.authStateListeners = [];
        this.ready = this.init();
    }

    async init() {
        // Initialize Supabase client
        const { createClient } = supabase;
        this.supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

        // Check for existing session
        const { data: { session } } = await this.supabase.auth.getSession();

        if (session) {
            this.currentUser = session.user;
            this.notifyListeners(session.user);
        }

        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);

            if (session) {
                this.currentUser = session.user;
                this.notifyListeners(session.user);
            } else {
                this.currentUser = null;
                this.notifyListeners(null);
            }
        });
    }

    // Sign in with Google
    async signInWithGoogle() {
        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });

        if (error) {
            console.error('OAuth error:', error);
            throw error;
        }

        return data;
    }

    // Sign out
    async signOut() {
        const { error } = await this.supabase.auth.signOut();

        if (error) {
            console.error('Sign out error:', error);
            throw error;
        }

        this.currentUser = null;
        this.notifyListeners(null);
    }

    // Get current user
    getUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Add listener for auth state changes
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);

        // Immediately call with current state
        callback(this.currentUser);

        // Return unsubscribe function
        return () => {
            this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
        };
    }

    // Notify all listeners of auth state change
    notifyListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (e) {
                console.error('Auth listener error:', e);
            }
        });
    }

    // Get user email
    getUserEmail() {
        return this.currentUser?.email || null;
    }

    // Get user name
    getUserName() {
        return this.currentUser?.user_metadata?.full_name ||
            this.currentUser?.user_metadata?.name ||
            this.currentUser?.email?.split('@')[0] ||
            'User';
    }

    // Get user avatar
    getUserAvatar() {
        return this.currentUser?.user_metadata?.avatar_url ||
            this.currentUser?.user_metadata?.picture ||
            null;
    }
}

// Create global auth instance
window.auth = new Auth();
