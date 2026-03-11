// ========================================
// Purple Heal Admin - Authentication (RBAC)
// ========================================

// Current Session Storage Keys
const SESSION_KEYS = {
    LOGGED_IN: 'ph_admin_logged_in',
    LOGIN_TIME: 'ph_admin_login_time',
    USER_ROLE: 'ph_user_role',
    USERNAME: 'ph_username',
    PASSWORD_HASH: 'ph_session_token' // Storing actual password in session for verifyPassword (client-side only app)
};

// Check if user is already logged in
function checkAuth() {
    const isLoggedIn = localStorage.getItem(SESSION_KEYS.LOGGED_IN);
    const loginTime = localStorage.getItem(SESSION_KEYS.LOGIN_TIME);

    // Check if logged in and session is less than 24 hours old
    if (isLoggedIn === 'true' && loginTime) {
        const now = new Date().getTime();
        const sessionAge = now - parseInt(loginTime);
        const hours24 = 24 * 60 * 60 * 1000;

        if (sessionAge < hours24) {
            return true;
        } else {
            // Session expired
            logout();
            return false;
        }
    }

    return false;
}

// Get Current User Info
function getCurrentUser() {
    return {
        username: localStorage.getItem(SESSION_KEYS.USERNAME),
        role: localStorage.getItem(SESSION_KEYS.USER_ROLE)
    };
}

// Login function (Async now)
async function login(username, password) {
    try {
        console.log('🔐 Attempting login for:', username);

        // Use the DB function exposed in storage-db.js
        if (typeof getUserDB !== 'function') {
            console.error('❌ DB functions not ready');
            return false;
        }

        const user = await getUserDB(username);

        if (user && user.password === password) {
            console.log('✅ Login successful for:', username, 'Role:', user.role);

            // Set Session
            localStorage.setItem(SESSION_KEYS.LOGGED_IN, 'true');
            localStorage.setItem(SESSION_KEYS.LOGIN_TIME, new Date().getTime().toString());
            localStorage.setItem(SESSION_KEYS.USERNAME, user.username);
            localStorage.setItem(SESSION_KEYS.USER_ROLE, user.role);
            localStorage.setItem(SESSION_KEYS.PASSWORD_HASH, user.password); // Needed for delete verification

            return true;
        } else {
            console.warn('❌ Invalid credentials');
            return false;
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        return false;
    }
}

// Global Verify Password Helper (Uses Stored Session Password)
function verifyPassword(inputPassword) {
    const sessionPassword = localStorage.getItem(SESSION_KEYS.PASSWORD_HASH);
    return inputPassword === sessionPassword;
}
window.verifyPassword = verifyPassword;

// Role Validations
const ROLES = {
    ADMIN: 'admin',
    TOUR_MANAGER: 'tour_manager',
    PRODUCT_MANAGER: 'product_manager',
    ARTIST_MANAGER: 'artist_manager'
};

function checkPermission(requiredRole) {
    const currentRole = localStorage.getItem(SESSION_KEYS.USER_ROLE);
    if (currentRole === ROLES.ADMIN) return true; // Admin has access to everything
    return currentRole === requiredRole;
}

// Redirect if role doesn't match page access rules
function enforcePageAccess() {
    const currentRole = localStorage.getItem(SESSION_KEYS.USER_ROLE);
    const path = window.location.pathname;

    // Admin Users Page - ADMIN ONLY
    if (path.includes('admin-users.html') && currentRole !== ROLES.ADMIN) {
        window.location.href = 'admin.html';
        return;
    }

    // Tours Page - ADMIN & TOUR MANAGER ONLY
    if (path.includes('admin-tours.html') && currentRole !== ROLES.ADMIN && currentRole !== ROLES.TOUR_MANAGER) {
        window.location.href = 'admin.html';
        return;
    }

    // Main Admin (Artists) & Home - NOT for Tour Managers
    if ((path.includes('admin.html') || path.includes('admin-home.html')) && !path.includes('users') && currentRole === ROLES.TOUR_MANAGER) {
        window.location.href = 'admin-tours.html';
        return;
    }

    // Artist Manager - NOT for Home or Tours
    if ((path.includes('admin-home.html') || path.includes('admin-tours.html')) && currentRole === ROLES.ARTIST_MANAGER) {
        window.location.href = 'admin.html';
        return;
    }
}


// Logout function
function logout() {
    localStorage.removeItem(SESSION_KEYS.LOGGED_IN);
    localStorage.removeItem(SESSION_KEYS.LOGIN_TIME);
    localStorage.removeItem(SESSION_KEYS.USERNAME);
    localStorage.removeItem(SESSION_KEYS.USER_ROLE);
    localStorage.removeItem(SESSION_KEYS.PASSWORD_HASH);
    window.location.href = 'admin.html'; // Reset to login screen
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const adminPanel = document.getElementById('adminPanel');
    const loginFormElement = document.getElementById('loginFormElement');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginError = document.getElementById('loginError');

    // Init DB first to ensure users exist
    if (typeof initDB === 'function') {
        initDB().then(() => {
            console.log('📦 DB Initialized for Auth');
        });
    }

    // Check authentication status
    if (checkAuth()) {
        enforcePageAccess(); // Check if user belongs on this page
        if (loginForm) loginForm.style.display = 'none';
        if (adminPanel) adminPanel.classList.add('active');

        // Show/Hide Elements based on Role
        applyRoleUI();
    } else {
        // Not logged in
        if (adminPanel) adminPanel.classList.remove('active');
        if (loginForm) loginForm.style.display = 'block';
    }

    // Login form submission
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginFormElement.querySelector('button[type="submit"]');

            // Visual Start
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'VERIFICANDO...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';

            try {
                if (await login(username, password)) {
                    loginForm.style.display = 'none';
                    if (adminPanel) {
                        adminPanel.classList.add('active');
                        adminPanel.style.display = 'block';
                    }

                    // Redirect based on role
                    const role = localStorage.getItem(SESSION_KEYS.USER_ROLE);
                    if (window.location.pathname.includes('admin.html') && role === ROLES.TOUR_MANAGER) {
                        window.location.href = 'admin-tours.html';
                        return;
                    }

                    // Load artists list immediately after login if available
                    if (typeof renderArtistsList === 'function') {
                        renderArtistsList();
                    }

                    applyRoleUI();
                } else {
                    loginError.textContent = 'Usuario o contraseña incorrectos';
                    loginError.style.display = 'block';
                    // Reset Button
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                }
            } catch (err) {
                console.error("Login Error Catch:", err);
                loginError.textContent = 'Error de sistema: ' + err.message;
                loginError.style.display = 'block';
                // Reset Button
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
        });
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.removeEventListener('click', logout); // Avoid duplicates
        logoutBtn.addEventListener('click', logout);
    }

    // Caps Lock detection for password field
    const passwordInput = document.getElementById('password');
    const capsLockWarning = document.getElementById('capsLockWarning');

    if (passwordInput && capsLockWarning) {
        passwordInput.addEventListener('keyup', function (event) {
            if (event.getModifierState && event.getModifierState('CapsLock')) {
                capsLockWarning.style.display = 'block';
            } else {
                capsLockWarning.style.display = 'none';
            }
        });
    }
});

// Apply UI corrections based on permissions
function applyRoleUI() {
    const role = localStorage.getItem(SESSION_KEYS.USER_ROLE);
    console.log('🎨 Applying UI permissions for role:', role);

    // Hide "USERS" nav link for non-admins
    const userNavLink = document.getElementById('nav-users'); // Will create this
    if (userNavLink) {
        userNavLink.style.display = role === ROLES.ADMIN ? 'inline-block' : 'none';
    }

    // --- Product Manager restrictions ---
    if (role === ROLES.PRODUCT_MANAGER) {
        disableNav('admin-tours.html'); // No tours for product manager

        // Can't Add or Delete Artists
        const addArtistBtn = document.querySelector('button[onclick="showAddArtistForm()"]');
        if (addArtistBtn) addArtistBtn.style.display = 'none';

        // NOTE: "Delete Artist" buttons are rendered dynamically, 
        // so we need to handle them in the render function (admin-panel.js) or via CSS
        document.body.classList.add('role-product-manager');

        // Inject CSS style to hide delete buttons for artists
        const style = document.createElement('style');
        style.innerHTML = `
            body.role-product-manager .artist-item button[onclick^="deleteArtist"] { display: none !important; }
        `;
        document.head.appendChild(style);
    }

    // --- Artist Manager restrictions ---
    if (role === ROLES.ARTIST_MANAGER) {
        document.body.classList.add('role-artist-manager');
        disableNav('admin-home.html');
        disableNav('admin-tours.html');
    }

    // --- Tour Manager restrictions ---
    if (role === ROLES.TOUR_MANAGER) {
        disableNav('admin.html');
        disableNav('admin-home.html');
    }
}

// Helper: Disable Navigation Link (Make it a "dead button")
function disableNav(hrefFragment) {
    const links = document.querySelectorAll(`a.admin-tab[href*="${hrefFragment}"]`);
    links.forEach(link => {
        link.removeAttribute('href'); // Remove link
        link.style.opacity = '0.3';
        link.style.cursor = 'not-allowed';
        link.style.pointerEvents = 'none'; // Ensure no interactions
        link.style.borderColor = 'transparent';
        link.title = 'Acceso Restringido';

        // Remove hover effect class if any, or just rely on inline styles overriding
    });
}
