import { db, auth } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import AuthManager from './auth-manager.js';

// Central CMS Logic
const ContentManager = {

    // Initialize: Auth -> Role -> Token -> GithubSync
    init: async () => {
        return new Promise((resolve, reject) => {
            // Wait for Auth
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                unsubscribe(); // Run once

                if (!user) {
                    console.warn("CMS: No user logged in.");
                    reject("No user");
                    return;
                }

                try {
                    console.log(`CMS: Initializing for ${user.email}...`);

                    // 1. Get Role (non-fatal if it fails)
                    let role = sessionStorage.getItem('ph_user_role') || 'editor'; // Check cache first
                    try {
                        role = await AuthManager.getUserRole(user.email) || role;
                    } catch (roleErr) {
                        console.warn("CMS: Could not fetch role from Firestore, using cached/default:", role, roleErr.message);
                    }

                    // 2. Get Secrets (Token)
                    // Security Rule: Only readable if role == 'admin' or 'editor'
                    try {
                        const secretsRef = doc(db, "config", "secrets");
                        const secretsSnap = await getDoc(secretsRef);

                        if (secretsSnap.exists()) {
                            const secrets = secretsSnap.data();
                            if (secrets.github_token) {
                                console.log("CMS: GitHub Token loaded securely from Firestore.");

                                // Inject into GithubSync
                                if (window.GithubSync) {
                                    window.GithubSync.setToken(secrets.github_token);
                                    window.GithubSync.saveToken(secrets.github_token); // PERSIST to localStorage

                                    // Update Config too if repo/owner changed in DB
                                    const currentConfig = window.GithubSync.getConfig();
                                    currentConfig.OWNER = secrets.repo_owner || currentConfig.OWNER;
                                    currentConfig.REPO = secrets.repo_name || currentConfig.REPO;
                                    window.GithubSync.saveConfig(currentConfig);
                                } else {
                                    console.error("CMS: GithubSync not found on window.");
                                }
                            } else {
                                console.error("CMS: Secrets found but 'github_token' is empty.");
                            }
                        } else {
                            console.error("CMS: No secrets document found in Firestore.");
                        }
                    } catch (secretsErr) {
                        console.warn("CMS: Could not read secrets from Firestore:", secretsErr.message);
                        // FALLBACK: Try localStorage cached token
                        if (window.GithubSync && window.GithubSync.hasToken()) {
                            console.log("CMS: Using cached GitHub Token from localStorage.");
                        } else {
                            console.error("CMS: No cached token available. GitHub operations will fail.");
                        }
                    }

                    resolve({ user, role });

                } catch (error) {
                    console.error("CMS Initialization Error:", error);
                    reject(error);
                }
            });
        });
    },

    // --- High Level Data Methods ---

    getArtists: async () => {
        // Fetch from API to ensure fresh data
        const data = await ContentManager._fetchInfo('data/artists.json');
        return data || [];
    },

    uploadArtistImage: async (artistName, fileData) => {
        // Sanitize filename: remove spaces, special chars, lowercase
        const safeName = artistName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const timestamp = Date.now();
        const filename = `${safeName}-${timestamp}.jpg`;
        const path = `assets/images/artists/${filename}`;

        console.log(`CMS: Uploading image to ${path}...`);

        // Upload Binary
        await window.GithubSync.uploadFile(path, fileData, `Upload image for ${artistName}`, true);

        // Return Raw URL (Note: Use raw.githubusercontent for direct access)
        const config = window.GithubSync.getConfig();
        return `https://raw.githubusercontent.com/${config.OWNER}/${config.REPO}/${config.BRANCH}/${path}`;
    },

    uploadAlbumImage: async (artistName, albumTitle, fileData, index) => {
        const safeArtist = artistName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const safeTitle = albumTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const timestamp = Date.now();
        const filename = `${safeArtist}-${safeTitle}-${index}-${timestamp}.jpg`;
        const path = `assets/images/albums/${filename}`;

        console.log(`CMS: Uploading album image to ${path}...`);
        await window.GithubSync.uploadFile(path, fileData, `Upload album image for ${albumTitle}`, true);

        const config = window.GithubSync.getConfig();
        return `https://raw.githubusercontent.com/${config.OWNER}/${config.REPO}/${config.BRANCH}/${path}`;
    },

    uploadMerchImage: async (artistName, productName, fileData, index) => {
        const safeArtist = artistName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const safeProduct = productName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const timestamp = Date.now();
        const filename = `${safeArtist}-${safeProduct}-${index}-${timestamp}.jpg`;
        const path = `assets/images/merch/${filename}`;

        console.log(`CMS: Uploading merch image to ${path}...`);
        await window.GithubSync.uploadFile(path, fileData, `Upload merch image for ${productName}`, true);

        const config = window.GithubSync.getConfig();
        return `https://raw.githubusercontent.com/${config.OWNER}/${config.REPO}/${config.BRANCH}/${path}`;
    },

    saveArtists: async (artists) => {
        const content = JSON.stringify(artists, null, 2);
        return await window.GithubSync.uploadFile('data/artists.json', content, 'Update artists.json via CMS');
    },

    getTours: async () => {
        const data = await ContentManager._fetchInfo('data/tours.json');
        return data || [];
    },

    uploadTourImage: async (tourTitle, fileData) => {
        const safeTitle = tourTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const timestamp = Date.now();
        const filename = `${safeTitle}-${timestamp}.jpg`;
        const path = `assets/images/tours/${filename}`;

        console.log(`CMS: Uploading tour image to ${path}...`);
        await window.GithubSync.uploadFile(path, fileData, `Upload tour image for ${tourTitle}`, true);

        const config = window.GithubSync.getConfig();
        return `https://raw.githubusercontent.com/${config.OWNER}/${config.REPO}/${config.BRANCH}/${path}`;
    },

    saveTours: async (tours) => {
        const content = JSON.stringify(tours, null, 2);
        return await window.GithubSync.uploadFile('data/tours.json', content, 'Update tours.json via CMS');
    },

    getSiteConfig: async () => {
        const data = await ContentManager._fetchInfo('data/site_config.json');
        return data || {};
    },

    saveSiteConfig: async (config) => {
        const content = JSON.stringify(config, null, 2);
        return await window.GithubSync.uploadFile('data/site_config.json', content, 'Update site_config.json via CMS');
    },

    // ALIAS for consistency
    saveConfig: async (config) => {
        return await ContentManager.saveSiteConfig(config);
    },

    // Helper to fetch JSON from Repo
    _fetchInfo: async (path) => {
        if (!window.GithubSync) throw new Error("GithubSync not ready");

        // Try getting via API (Auth) first to ensure latest version (bypass CDN cache)
        // content is base64
        try {
            const data = await window.GithubSync.getFile(path);
            if (data && data.content) {
                // Decode UTF8 properly
                const jsonString = new TextDecoder().decode(Uint8Array.from(atob(data.content), c => c.charCodeAt(0)));
                return JSON.parse(jsonString);
            }
        } catch (e) {
            console.warn(`CMS: API fetch failed for ${path}, trying Raw...`, e);
        }

        // Fallback: Raw URL (might be cached)
        const config = window.GithubSync.getConfig();
        const url = `https://raw.githubusercontent.com/${config.OWNER}/${config.REPO}/${config.BRANCH}/${path}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        return await res.json();
    }
};

window.ContentManager = ContentManager; // Expose globally
export default ContentManager;
