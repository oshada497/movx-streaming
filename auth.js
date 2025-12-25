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

    // Update user profile
    async updateProfile(updates) {
        const { data, error } = await this.supabase.auth.updateUser({
            data: updates
        });

        if (error) throw error;

        // Update local state and notify
        if (data.user) {
            this.currentUser = data.user;
            this.notifyListeners(this.currentUser);
        }
        return data;
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
        if (this.currentUser !== undefined) {
            // Only call if we've initialized (currentUser is null or object, not undefined/initial)
            // But constructor sets it to null. 
            callback(this.currentUser);
        }

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

    // --- UI Helpers ---

    // Inject Profile Modal into DOM
    injectProfileModal() {
        if (document.getElementById('profileModal')) return;

        const modalHTML = `
        <div class="modal" id="profileModal" style="display: none;">
            <div class="modal-content profile-content">
                <div class="modal-header">
                    <h3>My Profile</h3>
                    <button class="close-modal" onclick="window.auth.closeProfileModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="profile-body">
                    <div class="profile-avatar-large">
                        <img id="modalProfileAvatar" src="" alt="Profile">
                    </div>
                    <div class="form-group">
                        <label>Display Name</label>
                        <input type="text" id="modalProfileName" placeholder="Enter your name">
                    </div>
                    <div class="profile-email" id="modalProfileEmail" style="color: var(--text-muted); margin-bottom: 20px; text-align: center; font-size: 0.9rem;"></div>

                    <div class="profile-actions">
                        <button class="btn btn-primary" id="modalSaveBtn" onclick="window.auth.saveProfileName()">Save Changes</button>
                        <button class="btn btn-danger" id="modalLogoutBtn" onclick="window.auth.handleLogout()">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
            <style>
                .profile-content { max-width: 400px; }
                .profile-avatar-large { width: 100px; height: 100px; margin: 0 auto 20px; border-radius: 50%; overflow: hidden; border: 3px solid var(--accent-primary); }
                .profile-avatar-large img { width: 100%; height: 100%; object-fit: cover; }
            </style>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Open Profile Modal
    openProfileModal() {
        this.injectProfileModal();
        const modal = document.getElementById('profileModal');
        const avatar = document.getElementById('modalProfileAvatar');
        const nameInput = document.getElementById('modalProfileName');
        const email = document.getElementById('modalProfileEmail');

        if (this.currentUser) {
            avatar.src = this.getUserAvatar() || 'https://placehold.co/100x100?text=User';
            nameInput.value = this.getUserName();
            email.textContent = this.getUserEmail();
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    }

    // Close Profile Modal
    closeProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }

    // Save Profile Name
    async saveProfileName() {
        const nameInput = document.getElementById('modalProfileName');
        const newName = nameInput.value.trim();
        const btn = document.getElementById('modalSaveBtn');

        if (!newName) return alert('Name cannot be empty');

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            await this.updateProfile({ full_name: newName });
            alert('Profile updated successfully!');
            this.closeProfileModal();
        } catch (e) {
            console.error('Update failed', e);
            alert('Failed to update profile');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // Handle Logout
    async handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            await this.signOut();
            this.closeProfileModal();
            window.location.reload();
        }
    }

    // Setup generic Header UI
    setupHeaderUI() {
        const authBtn = document.getElementById('authBtn');
        if (!authBtn) return;

        authBtn.style.display = 'flex';

        // Update UI helper
        const updateBtn = (user) => {
            if (user) {
                const avatar = this.getUserAvatar();
                const name = this.getUserName();

                if (avatar) {
                    authBtn.innerHTML = `<img src="${avatar}" alt="${name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-primary);">`;
                } else {
                    authBtn.innerHTML = '<i class="fas fa-user-circle" style="font-size: 1.5rem;"></i>';
                }
                authBtn.title = name;
                authBtn.onclick = () => this.openProfileModal();
            } else {
                authBtn.innerHTML = '<i class="fab fa-google"></i>';
                authBtn.title = 'Login with Google';
                authBtn.onclick = () => this.signInWithGoogle();
            }
        };

        // Initial state
        this.ready.then(() => updateBtn(this.currentUser));

        // Listen for changes
        this.onAuthStateChange((user) => updateBtn(user));
    }

}

// Create global auth instance
window.auth = new Auth();
