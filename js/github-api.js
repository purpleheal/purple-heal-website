const DEFAULT_CONFIG = {
    OWNER: 'PurpleHeal-Entertainment',
    REPO: 'purple-heal-website',
    BRANCH: 'master' // Updated to match user's repo default
};

const GithubSync = {

    // --- Configuration Management ---
    saveConfig: (config) => {
        localStorage.setItem('ph_github_config', JSON.stringify(config));
    },

    getConfig: () => {
        const stored = localStorage.getItem('ph_github_config');
        let config = stored ? JSON.parse(stored) : DEFAULT_CONFIG;
        // Fix for PurpleHeal: Repository uses 'master' instead of 'main'
        if (!config.BRANCH || config.BRANCH === 'main') {
            config.BRANCH = 'master';
        }
        return config;
    },

    // --- Token Management ---
    _memoryToken: null, // Private variable for runtime token

    setToken: (token) => {
        GithubSync._memoryToken = token;
    },

    saveToken: (token) => {
        if (!token) return;
        localStorage.setItem('ph_github_token', token);
    },

    getToken: () => {
        // Priority: Memory > LocalStorage
        return GithubSync._memoryToken || localStorage.getItem('ph_github_token');
    },

    hasToken: () => {
        return !!(GithubSync._memoryToken || localStorage.getItem('ph_github_token'));
    },

    removeToken: () => {
        GithubSync._memoryToken = null;
        localStorage.removeItem('ph_github_token');
    },

    // --- API Interactions ---

    getObjSHA: async (path) => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        // Ensure branch is set, default to master if missing in saved config
        const branch = config.BRANCH || 'master';

        if (!token) throw new Error("No GitHub Token found. Please configure it in settings.");

        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/contents/${path}?ref=${branch}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);

        const data = await response.json();
        return { sha: data.sha }; // Return object with SHA for consistency
    },

    getFile: async (path) => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        const branch = config.BRANCH || 'master';
        const timestamp = new Date().getTime();
        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/contents/${path}?ref=${branch}&t=${timestamp}`;

        const headers = { 
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        };
        if (token) headers['Authorization'] = `token ${token}`;

        const response = await fetch(url, { headers });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);

        return await response.json();
    },

    uploadFile: async (path, content, message, isBinary = false) => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/contents/${path}`;

        let sha = null;
        try {
            const fileData = await GithubSync.getObjSHA(path);
            sha = fileData.sha;
        } catch (e) {
            // Ignore 404/Branch not found, treat as new file
            console.warn(`File or Branch not found for ${path}, creating new...`);
        }

        let base64Content;

        if (isBinary) {
            // If content is already a base64 string (from FileReader), strip header if present
            if (typeof content === 'string' && content.includes('base64,')) {
                base64Content = content.split(',')[1];
            } else {
                // Should not happen with our Logic, but fallback just in case
                base64Content = btoa(String.fromCharCode(...new Uint8Array(content)));
            }
        } else {
            // Text content (JSON) - Use UTF-8 safe encoding
            const unicodeContent = new TextEncoder().encode(content);
            let binary = '';
            const chunkSize = 0x8000; // 32KB chunks
            for (let i = 0; i < unicodeContent.length; i += chunkSize) {
                const chunk = unicodeContent.subarray(i, Math.min(i + chunkSize, unicodeContent.length));
                binary += String.fromCharCode.apply(null, chunk);
            }
            base64Content = btoa(binary);
        }

        const body = {
            message: message,
            content: base64Content
        };

        if (sha) {
            body.sha = sha;
        }

        if (config.BRANCH && config.BRANCH !== 'main') {
            body.branch = config.BRANCH;
        }

        console.log(`📤 Uploading to ${url}...`);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Upload Failed: ${errData.message}`);
        }

        return await response.json();
    },

    uploadBase64: async (path, dataUrl, message) => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/contents/${path}`;

        // Strip the data:image...;base64, header to get raw base64
        const base64Content = dataUrl.split(',')[1];
        if (!base64Content) throw new Error("Invalid Data URL format");

        let sha = null;
        try {
            const fileData = await GithubSync.getObjSHA(path);
            sha = fileData.sha;
        } catch (e) {
            // New file
        }

        const body = {
            message: message,
            content: base64Content
        };

        if (sha) body.sha = sha;
        if (config.BRANCH && config.BRANCH !== 'main') body.branch = config.BRANCH;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Upload Image Failed: ${errData.message}`);
        }
        return await response.json();
    },

    deleteFile: async (path, message) => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/contents/${path}`;

        // 1. Get SHA (Required for deletion)
        let sha = null;
        try {
            const fileData = await GithubSync.getObjSHA(path);
            sha = fileData.sha;
        } catch (e) {
            console.log(`ℹ️ File ${path} not found (already deleted), skipping deletion.`);
            return null; // File doesn't exist
        }

        // 2. Delete
        const body = {
            message: message,
            sha: sha,
            branch: config.BRANCH || 'master'
        };

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Delete Failed: ${errData.message}`);
        }
        return await response.json();
    },

    // --- GIT DATA API (ATOMIC COMMITS) ---

    // 1. Get Reference to Master
    getRef: async () => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        const branch = config.BRANCH || 'master';
        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/git/ref/heads/${branch}`;

        const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
        if (!res.ok) throw new Error(`Error getting ref: ${res.statusText}`);
        return await res.json(); // { object: { sha: "..." } }
    },

    // 2. Create Blob (For images or large files)
    createBlob: async (contentBase64) => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/git/blobs`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: contentBase64, encoding: 'base64' })
        });
        if (!res.ok) throw new Error(`Error creating blob: ${res.statusText}`);
        return await res.json(); // { sha: "..." }
    },

    // 3. Create Tree
    createTree: async (baseTreeSha, treeItems) => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/git/trees`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
        });
        if (!res.ok) throw new Error(`Error creating tree: ${res.statusText}`);
        return await res.json(); // { sha: "..." }
    },

    // 4. Create Commit
    createCommit: async (message, treeSha, parentSha) => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/git/commits`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] })
        });
        if (!res.ok) throw new Error(`Error creating commit: ${res.statusText}`);
        return await res.json(); // { sha: "..." }
    },

    // 5. Update Reference (Move Head)
    updateRef: async (sha) => {
        const token = GithubSync.getToken();
        const config = GithubSync.getConfig();
        const branch = config.BRANCH || 'master';
        const url = `https://api.github.com/repos/${config.OWNER}/${config.REPO}/git/refs/heads/${branch}`;

        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sha, force: true })
        });
        if (!res.ok) throw new Error(`Error updating ref: ${res.statusText}`);
        return await res.json();
    },

    syncAll: async (progressCallback) => {
        try {
            if (progressCallback) progressCallback("Iniciando sincronización atómica...");

            // 1. Auth Check & Get Latest Commit
            const refData = await GithubSync.getRef();
            const latestCommitSha = refData.object.sha;
            console.log(`📌 Latest Commit SHA: ${latestCommitSha}`);

            if (progressCallback) progressCallback("Leyendo datos locales...");

            // 2. Prepare Data
            let artists = [];
            let tours = [];
            let config = {};
            let users = [];

            if (window.ContentManager) {
                // Modern Path
                // Prefer local memory cache if available to avoid overwriting with stale API data
                artists = window.currentArtists || await window.ContentManager.getArtists();
                tours = window.currentTours || window.ContentManager.tours || await window.ContentManager.getTours();
                config = window.currentConfig || window.ContentManager.config || await window.ContentManager.getSiteConfig();
                // Users are not synced to public usually, but let's keep it if logic demands
            } else {
                // Legacy Fallback
                artists = typeof window.loadArtistsDB === 'function' ? await window.loadArtistsDB() : [];
                tours = typeof window.getAllToursDB === 'function' ? await window.getAllToursDB() : [];
                config = typeof window.getSiteConfig === 'function' ? await window.getSiteConfig() : {};
            }

            // Users are internal, might not need full sync to public unless for debugging
            users = typeof window.getAllUsersDB === 'function' ? await window.getAllUsersDB() : [];

            // 3. Prepare Tree Items
            let treeItems = [];

            // Add .nojekyll (Mode: 100644 for file)
            treeItems.push({
                path: '.nojekyll',
                mode: '100644',
                type: 'blob',
                content: '' // Empty content
            });

            // Add connection test
            treeItems.push({
                path: 'connection_test.txt',
                mode: '100644',
                type: 'blob',
                content: `Connection OK at ${new Date().toISOString()}`
            });

            // JSON Files (Direct content)
            const filesToSync = [
                { path: 'data/artists.json', content: JSON.stringify(artists, null, 2) },
                { path: 'data/tours.json', content: JSON.stringify(tours, null, 2) },
                { path: 'data/site_config.json', content: JSON.stringify(config, null, 2) },
                { path: 'data/users.json', content: JSON.stringify(users, null, 2) }
            ];

            filesToSync.forEach(f => {
                treeItems.push({
                    path: f.path,
                    mode: '100644',
                    type: 'blob',
                    content: f.content
                });
            });

            // 4. Handle Images (Must act as Blobs)
            const artistsToSync = JSON.parse(JSON.stringify(artists)); // Clone again just in case
            let imageCount = 0;

            // Auto-delete legacy static.yml workflow
            if (progressCallback) progressCallback("Configurando GitHub Pages...");
            try {
                // 1. Connection Test (This is now handled by treeItems.push above)
                // await GithubSync.uploadFile('connection_test.txt', 'GitHub Connection OK', 'docs: connection test');

                // 2. .nojekyll (CRITICAL for valid deployment) (This is now handled by treeItems.push above)
                // await GithubSync.uploadFile('.nojekyll', '', 'chore: add .nojekyll to bypass jekyll build');

                // 3. Remove Legacy Workflow if exists (Fix for 'Get Pages site failed')
                if (progressCallback) progressCallback("Limpiando configuraciones antiguas...");
                await GithubSync.deleteFile('.github/workflows/static.yml', 'chore: remove conflicting workflow');

            } catch (e) {
                console.warn("Non-fatal config warning:", e);
                // throw new Error("El token NO tiene permisos de escritura. Error: " + e.message);
                // Allow proceed even if delete fails (e.g. 404)
            }
            for (const artist of artistsToSync) {
                if (artist.imageData) {
                    if (progressCallback) progressCallback(`Procesando imagen de ${artist.name}...`);
                    try {
                        // Extract base64
                        const base64Content = artist.imageData.split(',')[1];
                        if (base64Content) {
                            const blobData = await GithubSync.createBlob(base64Content);
                            const fileName = `artist-${artist.id}.png`;

                            treeItems.push({
                                path: `assets/images/artists/${fileName}`,
                                mode: '100644',
                                type: 'blob',
                                sha: blobData.sha // Use blob SHA for binary
                            });
                            imageCount++;
                        }
                    } catch (e) {
                        console.error(`Error processing image for ${artist.name}`, e);
                    }
                }
            }

            if (progressCallback) progressCallback(`Subiendo ${treeItems.length} archivos en un solo commit...`);

            // 5. Create Tree
            const treeData = await GithubSync.createTree(latestCommitSha, treeItems);
            console.log(`🌳 Tree Created: ${treeData.sha}`);

            // 6. Create Commit
            const commitData = await GithubSync.createCommit(
                `feat: sync all data from Admin Panel (${new Date().toLocaleString()})`,
                treeData.sha,
                latestCommitSha
            );
            console.log(`📦 Commit Created: ${commitData.sha}`);

            // 7. Update Ref
            await GithubSync.updateRef(commitData.sha);
            console.log(`🚀 Master updated!`);

            if (progressCallback) progressCallback("¡Sincronización Completada! ✅");
            return true;

        } catch (error) {
            console.error("Sync Error:", error);
            if (progressCallback) progressCallback(`Error: ${error.message}`);
            throw error;
        }
    }
};

window.GithubSync = GithubSync;
