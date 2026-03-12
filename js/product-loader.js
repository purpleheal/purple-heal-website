// ====================================================
// Purple Heal - Dynamic Product Loading for Artist Profile
// ====================================================

// Load albums and merch dynamically from IndexedDB
// Load albums and merch dynamically
async function loadArtistProducts(artistId, injectedArtistData = null) {
    // Load site config
    const config = await getSiteConfig().catch(() => ({}));

    let artist = injectedArtistData;

    if (!artist) {
        // Fallback to DB if no data injected
        const artistsData = await getArtistsDataFromDB();
        artist = artistsData[artistId];
    }

    if (!artist) {
        console.error('❌ Artist not found in product-loader:', artistId);
        return;
    }

    // --- DISCOUNT LOGIC ---
    const isPromoActive = config.showOffers === true || config.showOffers === 'true'; 
    const discountAlbum = parseInt(config.promoDiscountAlbum) || 0;
    const discountMerch = parseInt(config.promoDiscountMerch) || 0;

    // Helper: Check if item gets discount
    const getDiscountPercent = (type) => {
        if (!isPromoActive) return 0;
        if (type === 'album') return discountAlbum;
        if (type === 'merch') return discountMerch;
        return 0;
    };

    // Load Albums
    const albumsContainer = document.getElementById('albumsGrid');
    if (albumsContainer) {
        if (artist.albums && artist.albums.length > 0) {
            albumsContainer.innerHTML = artist.albums.map((album, index) => {
                const firstImage = album.images && album.images.length > 0 ? album.images[0] : 'assets/images/album_cover_1_1768737641895.png';

                // Format release date if available
                let displayDate = album.year || '';
                if (album.releaseDate) {
                    const [year, month, day] = album.releaseDate.split('-');
                    const date = new Date(year, month - 1, day);
                    displayDate = date.getFullYear();
                }

                // Check for discount badge
                const discount = getDiscountPercent('album');
                const showSaleBadge = discount > 0;

                // Price Calculation
                const originalPrice = parseFloat(album.price || 0);
                let finalPrice = originalPrice;
                if (showSaleBadge && originalPrice > 0) {
                    finalPrice = originalPrice * (1 - (discount / 100));
                }

                return `
                <div class="artist-card artist-card--product fade-in" style="cursor: default; min-width: 300px; margin-right: 20px;">
                    <div style="position: relative; overflow: hidden; border-radius: 8px 8px 0 0; aspect-ratio: 1/1;">
                        <img src="${firstImage}" alt="${album.title}" class="artist-card__image" style="width: 100%; height: 100%; object-fit: cover;">
                        ${showSaleBadge ? `<div style="position: absolute; top: 10px; right: 10px; background: var(--ph-blue-accent); color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 0.9em;">-${discount}%</div>` : ''}
                    </div>
                    <div class="artist-card__content" style="background: rgba(20, 20, 23, 0.95); padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid rgba(255,255,255,0.1); border-top: none;">
                        <p style="color: var(--ph-purple-light); text-transform: uppercase; font-size: 0.8em; letter-spacing: 1px; margin-bottom: 5px;">
                            ${displayDate} • ALBUM
                        </p>
                        <h3 style="font-size: 1.2rem; margin-bottom: 15px; font-family: var(--font-primary); color: white; min-height: 2.4em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${album.title}</h3>

                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-family: 'Oxanium'; font-weight: bold;">
                                ${originalPrice > 0 ? (showSaleBadge ?
                        `<span style="text-decoration: line-through; color: #666; font-size: 0.9em; margin-right: 8px;">$${originalPrice.toFixed(2)}</span>
                                     <span style="color: var(--ph-blue-accent); font-size: 1.2rem;">$${finalPrice.toFixed(2)}</span>`
                        : `<span style="color: white; font-size: 1.2rem;">$${originalPrice.toFixed(2)}</span>`)
                        : '<span style="color: #666; font-size: 0.9em;">N/D</span>'}
                            </div>
                            <a href="product-detail.html?type=album&artist=${artistId}&index=${index}" class="ph-button ph-button--sm ph-button--primary">VER DETALLES</a>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            // Reset layout for empty state to match page container alignment
            albumsContainer.style.display = 'block';
            albumsContainer.style.margin = '0';
            albumsContainer.style.padding = '40px 0';
            albumsContainer.style.width = '100%';
            albumsContainer.innerHTML = '<div style="text-align: center; color: var(--ph-gray-lighter); font-family: var(--font-alt);">No hay albumes disponibles</div>';
        }
    }

    // Load Merch
    const merchContainer = document.getElementById('merchGrid');
    if (merchContainer) {
        if (artist.merch && artist.merch.length > 0) {
            merchContainer.innerHTML = artist.merch.map((product, index) => {
                const firstImage = product.images && product.images.length > 0 ? product.images[0] : 'assets/images/merch_tshirt_1768737656110.png';
                const isSoldOut = product.stock === 'SOLD OUT';

                // Price Calculation
                const originalPrice = parseFloat(product.price || 0);
                const discount = getDiscountPercent('merch');
                const showSale = discount > 0 && !isSoldOut;
                let finalPrice = originalPrice;

                if (showSale && originalPrice > 0) {
                    finalPrice = originalPrice * (1 - (discount / 100));
                }

                return `
                <div class="artist-card artist-card--product fade-in" style="cursor: default; min-width: 300px; margin-right: 20px;">
                    <div style="position: relative; overflow: hidden; border-radius: 8px 8px 0 0; aspect-ratio: 1/1;">
                        <img src="${firstImage}" alt="${product.name}" class="artist-card__image" style="width: 100%; height: 100%; object-fit: cover;">
                        ${showSale ? `<div style="position: absolute; top: 10px; right: 10px; background: var(--ph-blue-accent); color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 0.9em;">-${discount}%</div>` : ''}
                    </div>
                    <div class="artist-card__content" style="background: rgba(20, 20, 23, 0.95); padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid rgba(255,255,255,0.1); border-top: none;">
                        <p style="color: var(--ph-purple-light); text-transform: uppercase; font-size: 0.8em; letter-spacing: 1px; margin-bottom: 5px;">
                            ${product.category || 'MERCH'} • ${isSoldOut ? 'AGOTADO' : 'EN STOCK'}
                        </p>
                        <h3 style="font-size: 1.2rem; margin-bottom: 15px; font-family: var(--font-primary); color: white; min-height: 2.4em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${product.name}</h3>

                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-family: 'Oxanium'; font-weight: bold;">
                                ${originalPrice > 0 ? (showSale ?
                        `<span style="text-decoration: line-through; color: #666; font-size: 0.9em; margin-right: 8px;">$${originalPrice.toFixed(2)}</span>
                                     <span style="color: var(--ph-blue-accent); font-size: 1.2rem;">$${finalPrice.toFixed(2)}</span>`
                        : `<span style="color: white; font-size: 1.2rem;">$${originalPrice.toFixed(2)}</span>`)
                        : '<span style="color: #666; font-size: 0.9em;">N/D</span>'}
                            </div>
                            <a href="product-detail.html?type=merch&artist=${artistId}&index=${index}" class="ph-button ph-button--sm ph-button--primary">VER DETALLES</a>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            // Reset layout for empty state to match page container alignment
            merchContainer.style.display = 'block';
            merchContainer.style.margin = '0';
            merchContainer.style.padding = '40px 0';
            merchContainer.style.width = '100%';
            merchContainer.innerHTML = '<div style="text-align: center; color: var(--ph-gray-lighter); font-family: var(--font-alt);">No hay merchandising disponible</div>';
        }
    }

    // Setup Sliders (always run after content population is triggered)
    setupSlider('albumsGrid', 'prevAlbums', 'nextAlbums');
    setupSlider('merchGrid', 'prevMerch', 'nextMerch');

    // Call when page loads
    window.loadArtistProducts = loadArtistProducts;

    // --- SLIDER LOGIC ---
    function setupSlider(trackId, prevBtnId, nextBtnId) {
        const track = document.getElementById(trackId);
        const prevBtn = document.getElementById(prevBtnId);
        const nextBtn = document.getElementById(nextBtnId);

        if (!track || !prevBtn || !nextBtn) return;

        // Hide buttons if no overflow
        // We need to wait for images/rendering or just check scrollWidth immediately?
        // A slight delay or check after a frame might be better.
        setTimeout(() => {
            if (track.scrollWidth <= track.clientWidth) {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            } else {
                // Restore flex/block if they were hidden (css has display: flex)
                // Actually CSS has them absolute. We can just removing inline display:none
                prevBtn.style.display = '';
                nextBtn.style.display = '';
            }
        }, 500);

        // Scroll amount = width of card + gap (approx 300px + 32px)
        const scrollAmount = 320;

        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    }
}
