// ===== VIEWPORT FIX FOR MOBILE =====
const setVH = () => {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
};

window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', () => {
    setTimeout(setVH, 200);
});
setVH();

// ===== NAVIGATION SCROLL EFFECT =====
const navbar = document.getElementById('navbar');

if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ===== MOBILE MENU TOGGLE =====
const initNav = () => {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.querySelector('.ph-mobile-menu');

    if (navToggle && navMenu) {
        // Simple toggle logic
        const toggleMenu = (e) => {
            if (e) e.stopPropagation();
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        };

        // Clear and set listener
        navToggle.onclick = toggleMenu;

        // Close menu when clicking links
        document.querySelectorAll('.ph-nav__link').forEach(link => {
            link.onclick = () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            };
        });

        // Close when clicking outside
        document.onclick = (e) => {
            if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && e.target !== navToggle) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        };
    }
};

// Initialize on DOMContentLoaded and Load for maximum reliability
document.addEventListener('DOMContentLoaded', initNav);
window.addEventListener('load', initNav);
initNav();

// ===== SMOOTH SCROLLING FOR ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        // Skip if it's just "#"
        if (href === '#') {
            e.preventDefault();
            return;
        }

        const target = document.querySelector(href);

        if (target) {
            e.preventDefault();
            const navHeight = navbar ? navbar.offsetHeight : 0;
            const targetPosition = target.offsetTop - navHeight - 20;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Close mobile menu if open
            // Close mobile menu if open
            // Close mobile menu if open
            const menu = document.querySelector('.ph-mobile-menu');
            const toggle = document.getElementById('nav-toggle');

            if (menu) {
                menu.classList.remove('active');
            }
            if (toggle) {
                toggle.classList.remove('active');
            }
        }
    });
});

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all animated elements
document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right, .scale-in').forEach(el => {
    observer.observe(el);
});

// ===== ACTIVE NAV LINK HIGHLIGHTING =====
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const navLinks = document.querySelectorAll('.ph-nav__link');

navLinks.forEach(link => {
    const linkHref = link.getAttribute('href').split('#')[0];

    if (linkHref === currentPage ||
        (currentPage === '' && linkHref === 'index.html') ||
        (currentPage === 'artist-profile.html' && linkHref === 'artists.html')) {
        link.classList.add('active');
    } else {
        link.classList.remove('active');
    }
});

// ===== CONSOLE MESSAGE =====
console.log('%c🎵 Purple Heal Entertainment',
    'color: #61397C; font-size: 24px; font-weight: bold; font-family: sans-serif;'
);
console.log('%cCreando el futuro de la música 🚀',
    'color: #d4af37; font-size: 14px; font-family: sans-serif;'
);

// ===== PERFORMANCE: LAZY LOADING IMAGES =====
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src;
    });
} else {
    // Fallback for browsers that don't support lazy loading
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
    document.body.appendChild(script);
}

// ===== PREVENT FLASH OF UNSTYLED CONTENT =====
document.documentElement.classList.add('js-enabled');

// ===== ADD LOADING ANIMATION =====

// ===== STORE VISIBILITY LOGIC =====
// ===== STORE VISIBILITY LOGIC =====
async function checkStoreVisibility() {
    try {
        const OWNER = 'PurpleHeal-Entertainment';
        const REPO = 'purple-heal-website';
        const BRANCH = 'master';
        const timestamp = Date.now();

        // Use GitHub API for instant updates (bypass CDN cache)
        const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/site_config.json?ref=${BRANCH}&t=${timestamp}`;
        
        let config = {};
        try {
            const apiRes = await fetch(apiUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (data && data.content) {
                    // GitHub API content might have newlines, sanitize before atob
                    const jsonString = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
                    config = JSON.parse(jsonString);
                    console.log('✅ Store visibility loaded via API');
                }
            } else {
                throw new Error('API failed');
            }
        } catch (e) {
            console.warn('⚠️ GitHub API fail in main.js, falling back to raw URL');
            const res = await fetch(`data/site_config.json?t=${timestamp}`);
            if (res.ok) config = await res.json();
        }

        const showStore = config.showStore === true;
        const navShop = document.getElementById('nav-shop');
        const navShopMobile = document.getElementById('nav-shop-mobile');

        if (navShop) navShop.style.display = showStore ? 'inline-block' : 'none';
        if (navShopMobile) navShopMobile.style.display = showStore ? 'block' : 'none';

    } catch (e) {
        console.warn('Store visibility check failed:', e);
    }
}

// Check on load
window.addEventListener('load', () => {
    checkStoreVisibility();
    document.body.classList.add('loaded');
});

