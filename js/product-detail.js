// ========================================
// Purple Heal - Product Detail Page
// ========================================

// Get product data from URL
function getProductFromURL() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type'); // 'album' or 'merch'
    const artistId = params.get('artist');
    const productIndex = params.get('index');

    return { type, artistId, productIndex };
}

// Load product data from IndexedDB
async function loadProductData() {
    console.log('🔍 Product Detail: Starting loadProductData (Cloud)');

    const { type, artistId, productIndex } = getProductFromURL();
    console.log('📋 URL Params:', { type, artistId, productIndex });

    if (!type || !artistId || productIndex === null) {
        console.error('❌ Missing URL parameters');
        // alert('Faltan parámetros en la URL. Redirigiendo...');
        window.location.href = 'index.html';
        return;
    }

    try {
        console.log('☁️ Fetching data using DB layer...');
        // Parallel Fetch: Config & Artists
        const [config, artists] = await Promise.all([
            getSiteConfig(),
            loadArtistsDB()
        ]);

        console.log(`✅ Loaded ${artists.length} artists from cloud`);

        const artistIdNum = parseInt(artistId);
        // Find artist by matching index in array
        const artist = artists[artistIdNum];

        if (!artist) {
            console.error(`❌ Artist not found at index ${artistIdNum}`);
            // alert('Artista no encontrado');
            window.location.href = 'index.html';
            return;
        }

        console.log('✅ Found artist:', artist.name);

        let product;
        const prodIndex = parseInt(productIndex);

        if (type === 'album') {
            product = artist.albums ? artist.albums[prodIndex] : null;
            console.log('🎵 Looking for album at index', prodIndex);
        } else if (type === 'merch') {
            product = artist.merch ? artist.merch[prodIndex] : null;
            console.log('👕 Looking for merch at index', prodIndex);
        }

        if (!product) {
            console.error(`❌ Product not found at index ${prodIndex}`);
            // alert('Producto no encontrado');
            window.location.href = 'index.html';
            return;
        }

        console.log('✅ Found product:', product.title || product.name);

        // Update back button to go to artist profile
        const backBtn = document.getElementById('backToArtist');
        if (backBtn) {
            // Use artistIdNum directly (0-indexed)
            backBtn.href = `artist-profile.html?artist=${artistIdNum}`;
        }

        // Display product with config
        displayProduct(product, type, artist, config);
    } catch (error) {
        console.error('❌ Error loading product:', error);
        // alert('Error al cargar el producto: ' + error.message);
        window.location.href = 'index.html';
    }
}

// Display product information
function displayProduct(product, type, artist, config = {}) {
    // Discount Logic
    const isPromoActive = config.showOffers === true || config.showOffers === 'true';
    const discountAlbum = parseInt(config.promoDiscountAlbum) || 0;
    const discountMerch = parseInt(config.promoDiscountMerch) || 0;

    let discountPercent = 0;
    if (isPromoActive) {
        if (type === 'album') discountPercent = discountAlbum;
        if (type === 'merch') discountPercent = discountMerch;
    }

    // Set title
    document.getElementById('productTitle').textContent = type === 'album' ? product.title : product.name;

    // Set meta data
    const metaContainer = document.getElementById('productMeta');
    if (type === 'album') {
        metaContainer.innerHTML = `
            <div class="meta-item">
                <span class="meta-label">TIPO:</span>
                <span class="meta-value">${product.type}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">LANZAMIENTO:</span>
                <span class="meta-value">${product.releaseDate ? (() => {
                const [year, month, day] = product.releaseDate.split('-');
                return new Date(year, month - 1, day).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            })() : product.year}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">ARTISTA:</span>
                <span class="meta-value">${artist.name}</span>
            </div>
        `;
    } else {
        metaContainer.innerHTML = `
            ${product.category ? `
                <div class="meta-item">
                    <span class="meta-label">CATEGORIA:</span>
                    <span class="meta-value">${product.category}</span>
                </div>
            ` : ''}
            <div class="meta-item">
                <span class="meta-label">ARTISTA:</span>
                <span class="meta-value">${artist.name || 'Purple Heal'}</span>
            </div>
            ${product.sizes ? `
                <div class="meta-item">
                    <span class="meta-label">TALLAS:</span>
                    <span class="meta-value">${product.sizes}</span>
                </div>
            ` : ''}
        `;
    }

    // Set price with discount logic
    const priceElement = document.getElementById('productPrice');
    if (product.price) {
        const originalPrice = ~~product.price;
        const showSale = discountPercent > 0 && product.stock !== 'SOLD OUT';

        if (showSale) {
            const finalPrice = Math.floor(originalPrice * (1 - (discountPercent / 100)));
            priceElement.innerHTML = `
                <span style="text-decoration: line-through; color: #666; font-size: 0.7em; margin-right: 10px;">$${originalPrice}</span>
                <span style="color: var(--ph-blue-accent);">$${finalPrice}</span>
            `;

            // Add badge to main image container if not present
            const mainImgContainer = document.querySelector('.main-image');
            // Remove existing badge if any
            const existingBadge = mainImgContainer.querySelector('.discount-badge');
            if (existingBadge) existingBadge.remove();

            if (mainImgContainer) {
                // Ensure container is relative
                mainImgContainer.style.position = 'relative';
                const badge = document.createElement('div');
                badge.className = 'discount-badge';
                badge.style.cssText = 'position: absolute; top: 20px; right: 20px; background: var(--ph-blue-accent); color: white; font-weight: bold; padding: 6px 12px; border-radius: 4px; font-size: 1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.5); z-index: 10;';
                badge.textContent = `-${discountPercent}% OFF`;
                mainImgContainer.appendChild(badge);
            }
        } else {
            priceElement.textContent = '$' + product.price;
            // Remove badge if exists
            const existingBadge = document.querySelector('.discount-badge');
            if (existingBadge) existingBadge.remove();
        }
        priceElement.style.display = 'block';
    } else {
        priceElement.style.display = 'none';
    }

    // Set description
    const descElement = document.getElementById('productDescription');
    if (product.description) {
        descElement.textContent = product.description;
        descElement.style.display = 'block';
    } else {
        descElement.style.display = 'none';
    }

    // Handle stock status and purchase button
    const purchaseBtn = document.getElementById('purchaseBtn');
    const soldOutBadge = document.getElementById('soldOutBadge');

    if (product.stock === 'SOLD OUT') {
        if (soldOutBadge) soldOutBadge.style.display = 'block';
        purchaseBtn.textContent = 'SOLD OUT';
        purchaseBtn.style.opacity = '0.5';
        purchaseBtn.style.pointerEvents = 'none';
        purchaseBtn.style.cursor = 'not-allowed';
        purchaseBtn.removeAttribute('href');
    } else {
        if (soldOutBadge) soldOutBadge.style.display = 'none';
        if (product.link) {
            purchaseBtn.href = product.link;
            purchaseBtn.target = '_blank';
            purchaseBtn.rel = 'noopener noreferrer';
            purchaseBtn.textContent = 'COMPRAR AHORA';
            purchaseBtn.style.opacity = '1';
            purchaseBtn.style.pointerEvents = 'auto';
            purchaseBtn.style.cursor = 'pointer';
        } else {
            purchaseBtn.style.display = 'none';
        }
    }

    // Load images
    loadGallery(product.images || []);
}

// Load image gallery
let currentImageIndex = 0;
let galleryImages = [];

function loadGallery(images) {
    const mainImage = document.getElementById('mainImage');
    const thumbnailGallery = document.getElementById('thumbnailGallery');

    if (!images || images.length === 0) {
        if (mainImage) {
            mainImage.src = '';
            mainImage.alt = 'No hay imágenes disponibles';
            mainImage.style.display = 'none';
        }
        if (thumbnailGallery) {
            thumbnailGallery.innerHTML = '<p style="color: var(--ph-gray-lighter);">No hay imágenes disponibles</p>';
        }
        return;
    }

    galleryImages = images;
    currentImageIndex = 0;

    // Set first image as main
    if (mainImage) {
        mainImage.src = images[0];
        mainImage.alt = 'Imagen principal del producto';
        mainImage.style.display = 'block';
    }

    // Create thumbnails with navigation
    if (thumbnailGallery) {
        if (images.length > 1) {
            thumbnailGallery.innerHTML = `
                <div style="display: flex; align-items: center; gap: var(--space-md);">
                    ${images.length > 4 ? `
                        <button onclick="scrollThumbnails(-1)" class="thumbnail-nav" style="flex-shrink: 0; background: var(--ph-purple); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s;">
                            ←
                        </button>
                    ` : ''}
                    
                    <div id="thumbnailContainer" style="display: flex; gap: var(--space-sm); overflow-x: auto; scroll-behavior: smooth; flex: 1;">
                        ${images.map((img, index) => `
                            <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage(${index})" 
                                 style="cursor: pointer; flex-shrink: 0; width: 100px; height: 100px; border-radius: var(--radius-sm); overflow: hidden; border: 3px solid ${index === 0 ? 'var(--ph-purple)' : 'transparent'}; transition: all 0.3s;">
                                <img src="${img}" alt="Miniatura ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        `).join('')}
                    </div>
                    
                    ${images.length > 4 ? `
                        <button onclick="scrollThumbnails(1)" class="thumbnail-nav" style="flex-shrink: 0; background: var(--ph-purple); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s;">
                            →
                        </button>
                    ` : ''}
                </div>
            `;
            thumbnailGallery.style.display = 'block';
        } else {
            thumbnailGallery.style.display = 'none';
        }
    }
}

// Scroll thumbnails
function scrollThumbnails(direction) {
    const container = document.getElementById('thumbnailContainer');
    if (container) {
        const scrollAmount = 120; // thumbnail width + gap
        container.scrollLeft += direction * scrollAmount;
    }
}

// Change main image
function changeMainImage(index) {
    if (index < 0 || index >= galleryImages.length) return;

    currentImageIndex = index;
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        mainImage.src = galleryImages[index];
    }

    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.add('active');
            thumb.style.borderColor = 'var(--ph-purple)';
        } else {
            thumb.classList.remove('active');
            thumb.style.borderColor = 'transparent';
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadProductData);
