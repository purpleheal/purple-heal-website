// ========================================
// Purple Heal Admin - Tours Management (ROUTER v2 - NEW FILE)
// ========================================

// STATE
let currentTourDates = [];
let currentTourCover = null;
let currentEditingTourId = null; // Derived from URL
let editingDateIndex = null;

// INIT
async function initToursPage() {
    console.log('🎸 Initializing Tours Page (ROUTER v2)...');

    // Auth Check Removed (Handled by admin-tours.html)


    // UI Unlock Removed (Handled by admin-tours.html)


    // Hook Form immediately to ensure event is caught
    const tourFormEl = document.getElementById('tourForm');
    if (tourFormEl) {
        console.log('✅ Form found and hooked.');
        tourFormEl.onsubmit = handleTourSubmit;
    } else {
        console.error('❌ Form #tourForm not found in DOM!');
    }

    // ROUTER LOGIC
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const isNew = urlParams.get('new');

    if (editId) {
        // MODE: EDIT
        console.log('📌 Router: Edit Mode for ID', editId);
        await enterEditMode(editId);
    } else if (isNew) {
        // MODE: CREATE
        console.log('📌 Router: Create Mode');
        enterCreateMode();
    } else {
        // MODE: LIST (Default)
        console.log('📌 Router: List Mode');
        await renderToursList();
        document.getElementById('add-tour-form-container').style.display = 'none';

        const listCard = document.getElementById('tours-list').closest('.ph-card');
        if (listCard) listCard.style.display = 'block';
    }

    // Hook Form (Redundant check removed, handled above)
}

// ==========================================
// ROUTER ACTIONS (NAVIGATE)
// ==========================================

function navigateToEdit(id) {
    window.location.href = `admin-tours.html?edit=${id}`;
}

function navigateToCreate() {
    window.location.href = `admin-tours.html?new=true`;
}

function navigateToList() {
    window.location.href = `admin-tours.html`;
}

// ==========================================
// VIEW CONTROLLERS
// ==========================================

// REWRITE: CLEAN & ROBUST EDIT MODE
async function enterEditMode(id) {
    // 1. UI Setup
    const listCard = document.getElementById('tours-list').closest('.ph-card');
    if (listCard) listCard.style.display = 'none';
    document.getElementById('add-tour-form-container').style.display = 'block';

    const titleEl = document.querySelector('#add-tour-form-container h3');
    const submitBtn = document.querySelector('#tourForm button[type="submit"]');
    titleEl.textContent = 'EDITAR TOUR';
    submitBtn.textContent = 'GUARDAR CAMBIOS';

    // 2. Fetch Data (SIMPLEST METHOD: Get All -> Find)
    try {
        console.log('🔄 Fetching data for Edit Mode ID:', id);

        // Safety: Use ContentManager
        const allTours = await window.ContentManager.getTours();
        const tour = allTours.find(t => Number(t.id) === Number(id));

        if (!tour) {
            alert('❌ Post-Fetch Error: Tour not found in Cloud list.');
            navigateToList();
            return;
        }

        console.log('✅ Tour Data Retrieved:', tour.title);

        // 3. Populate State
        currentEditingTourId = id;
        currentTourDates = tour.dates ? JSON.parse(JSON.stringify(tour.dates)) : [];
        currentTourCover = tour.coverImage;

        // 4. Populate Inputs
        const titleInput = document.getElementById('tourTitle');
        if (titleInput) {
            titleInput.value = tour.title || '';
            titleInput.classList.add('populated'); // Visual cue
        }

        // 5. Render Dates
        renderDatesList();

        // 6. Render Image (Immediate check, no timeout needed if we don't block)
        if (currentTourCover) {
            const preview = document.getElementById('tourCoverPreview');
            if (preview) {
                preview.src = currentTourCover;
                preview.style.display = 'block';
            }
        }

    } catch (error) {
        console.error('🔥 CRITICAL ERROR in enterEditMode:', error);
        alert('Error cargando edición: ' + error.message);
    }
}

function enterCreateMode() {
    // Hide List, Show Form
    const listCard = document.getElementById('tours-list').closest('.ph-card');
    if (listCard) listCard.style.display = 'none';

    document.getElementById('add-tour-form-container').style.display = 'block';

    const titleEl = document.querySelector('#add-tour-form-container h3');
    const submitBtn = document.querySelector('#tourForm button[type="submit"]');

    titleEl.textContent = 'CREAR NUEVO TOUR';
    submitBtn.textContent = 'CREAR TOUR';

    // Clear State
    document.getElementById('tourTitle').value = '';
    currentEditingTourId = null;
    currentTourDates = [];
    currentTourCover = null;
    document.getElementById('tourCoverPreview').style.display = 'none';

    renderDatesList();
}

// ==========================================
// CORE LOGIC (Dates, Images, Save)
// ==========================================

// Preview Cover Image
function previewTourCover(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentTourCover = e.target.result;
            const preview = document.getElementById('tourCoverPreview');
            preview.src = currentTourCover;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Toggle Ticket Link
function toggleTicketLink() {
    const status = document.getElementById('statusInput').value;
    const container = document.getElementById('ticketLinkContainer');
    const input = document.getElementById('ticketLinkInput');

    if (status === 'coming_soon') {
        container.style.opacity = '0.5';
        input.disabled = true;
        input.value = '';
    } else {
        container.style.opacity = '1';
        input.disabled = false;
    }
}

// Add/Update Date
function addTourDate() {
    const dateInput = document.getElementById('dateInput');
    const venueInput = document.getElementById('venueInput');
    const cityInput = document.getElementById('cityInput');
    const statusInput = document.getElementById('statusInput');
    const ticketLinkInput = document.getElementById('ticketLinkInput');
    const errorMsg = document.getElementById('dateError');

    // Basic Validation
    if (!dateInput.value || !venueInput.value || !cityInput.value) {
        if (errorMsg) {
            errorMsg.textContent = 'Por favor completa campos.';
            errorMsg.style.display = 'block';
        } else {
            alert('Por favor completa campos obligatorios.');
        }
        return;
    }

    const dateObj = {
        date: dateInput.value,
        venue: venueInput.value,
        city: cityInput.value,
        status: statusInput.value,
        ticketLink: ticketLinkInput.value || '#'
    };

    if (editingDateIndex !== null) {
        console.log('📅 Updating existing date at index:', editingDateIndex);
        currentTourDates[editingDateIndex] = dateObj;
        editingDateIndex = null;

        // Reset UI
        const btn = document.querySelector('button[onclick="addTourDate()"]');
        if (btn) {
            btn.innerHTML = 'AGREGAR FECHA';
            btn.classList.remove('ph-button--gold');
        }
        const cancelBtn = document.getElementById('cancelDateEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'none';

    } else {
        console.log('📅 Adding new date');
        currentTourDates.push(dateObj);
    }

    renderDatesList();

    // Reset Form
    dateInput.value = '';
    venueInput.value = '';
    cityInput.value = '';
    ticketLinkInput.value = '';
    statusInput.value = 'ticket';
    toggleTicketLink();
    if (errorMsg) errorMsg.style.display = 'none';
}

function editDateInList(index) {
    console.log('📅 Edit requested for index:', index);
    editingDateIndex = index;
    const d = currentTourDates[index];

    document.getElementById('dateInput').value = d.date;
    document.getElementById('venueInput').value = d.venue;
    document.getElementById('cityInput').value = d.city;
    document.getElementById('statusInput').value = d.status;
    document.getElementById('ticketLinkInput').value = d.ticketLink === '#' ? '' : d.ticketLink;
    toggleTicketLink();

    const btn = document.querySelector('button[onclick="addTourDate()"]');
    if (btn) {
        btn.innerHTML = 'ACTUALIZAR FECHA';
        btn.classList.add('ph-button--gold');
    }
    const cancelBtn = document.getElementById('cancelDateEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelDateEdit() {
    editingDateIndex = null;
    document.getElementById('dateInput').value = '';
    document.getElementById('venueInput').value = '';
    document.getElementById('cityInput').value = '';
    document.getElementById('ticketLinkInput').value = '';
    document.getElementById('statusInput').value = 'ticket';
    toggleTicketLink();

    const btn = document.querySelector('button[onclick="addTourDate()"]');
    if (btn) {
        btn.innerHTML = 'AGREGAR FECHA';
        btn.classList.remove('ph-button--gold');
    }
    const cancelBtn = document.getElementById('cancelDateEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function removeTourDate(index) {
    console.log('📅 Removing date at index:', index);
    currentTourDates.splice(index, 1);
    if (editingDateIndex === index) cancelDateEdit();
    renderDatesList();
}

function renderDatesList() {
    console.log('📅 Rendering dates list:', currentTourDates.length);
    const c = document.getElementById('datesListPreview');
    if (!c) return;

    if (currentTourDates.length === 0) {
        c.innerHTML = '<p style="color:gray;text-align:center;">Sin fechas.</p>';
        return;
    }
    c.innerHTML = currentTourDates.map((d, i) => {
        let st = d.status ? d.status.toUpperCase().replace('_', ' ') : 'N/A';
        let col = d.status === 'sold_out' ? '#e74c3c' : (d.status === 'coming_soon' ? '#f39c12' : '#2ecc71');

        // Determine background if editing
        let bg = (editingDateIndex === i) ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255,255,255,0.05)';
        let border = (editingDateIndex === i) ? '1px solid #FFD700' : 'none';

        return `
        <div style="background: ${bg}; border: ${border}; margin-bottom: 5px; padding: 10px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px;">
            <div>
                <strong>${d.date}</strong> | ${d.city}
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                <span style="color:${col}; font-weight:bold; font-size:0.8em;">${st}</span>
                <button type="button" onclick="editDateInList(${i})" class="ph-button ph-button--outline" style="padding: 2px 8px; font-size: 0.7em;">EDIT</button>
                <button type="button" onclick="removeTourDate(${i})" class="ph-button ph-button--outline" style="padding: 2px 8px; font-size: 0.7em; border-color: red; color: red;">DEL</button>
            </div>
        </div>`;
    }).join('');
}


// Helper for Inline Messages
function showFormMessage(msg, type = 'success') {
    const msgEl = document.getElementById('tourFormMessage');
    if (msgEl) {
        msgEl.innerHTML = `<div class="ph-alert ph-alert--${type}" style="padding: 10px; border-radius: 8px; margin-top: 10px; background: ${type === 'success' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'}; border: 1px solid ${type === 'success' ? '#2ecc71' : '#e74c3c'}; color: ${type === 'success' ? '#2ecc71' : '#e74c3c'}; text-align: center;">${msg}</div>`;
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        alert(msg); // Fallback
    }
}

// SAVE HANDLER
async function handleTourSubmit(e) {
    e.preventDefault();

    // VISUAL FEEDBACK
    const btn = e.target.querySelector('button[type="submit"]');
    const OriginalBtnText = btn ? btn.textContent : 'GUARDAR';
    if (btn) {
        btn.textContent = 'GUARDANDO...';
        btn.disabled = true;
    }

    // VALIDATION
    const title = document.getElementById('tourTitle').value;
    if (!title.trim()) {
        showFormMessage('FALTA TITULO: Por favor escribe un nombre para el tour.', 'error');
        if (btn) { btn.textContent = OriginalBtnText; btn.disabled = false; }
        return;
    }

    if (currentTourDates.length === 0) {
        showFormMessage('FALTAN FECHAS: Debes agregar al menos una fecha.', 'error');
        if (btn) { btn.textContent = OriginalBtnText; btn.disabled = false; }
        return;
    }

    if (!currentTourCover) {
        showFormMessage('FALTA IMAGEN: Sube un banner o espera a que cargue.', 'error');
        if (btn) { btn.textContent = OriginalBtnText; btn.disabled = false; }
        return;
    }

    // SAVE HANDLER
    try {
        const datesDeepCopy = JSON.parse(JSON.stringify(currentTourDates));

        // Prepare Object
        const tourToSave = {
            title: title,
            coverImage: currentTourCover,
            dates: datesDeepCopy,
            createdAt: new Date().toISOString()
        };

        // Fetch latest list from Cloud
        let tours = await window.ContentManager.getTours();
        if (!Array.isArray(tours)) tours = [];

        if (currentEditingTourId) {
            // EDIT MODE: UPDATE EXISTING
            const rawId = Number(currentEditingTourId);
            tourToSave.id = rawId; // IMPORTANT: Keep the ID
            console.log('UPDATING Existing Tour ID:', rawId);

            // --- ContentManager Update Logic ---
            const index = tours.findIndex(t => Number(t.id) === rawId);
            if (index !== -1) {
                tours[index] = tourToSave; // Update in place
            } else {
                tours.push(tourToSave); // Fallback Append
            }
            await window.ContentManager.saveTours(tours);
            // -----------------------------------

        } else {
            // CREATE MODE: GAP-FILLING ID CALCULATION
            console.log('CREATING New Tour - Calculating ID...');
            try {
                const existingIds = tours.map(t => Number(t.id));

                // Find lowest missing positive integer
                let nextId = 1;
                while (existingIds.includes(nextId)) {
                    nextId++;
                }

                tourToSave.id = nextId;
                console.log('   -> Assigned Gap/Next ID:', nextId);

                // --- ContentManager Create Logic ---
                tours.push(tourToSave);
                await window.ContentManager.saveTours(tours);
                // -----------------------------------

            } catch (idErr) {
                console.error('Error calculating ID:', idErr);
                throw idErr;
            }
        }

        console.log('Sending Object to Cloud:', tourToSave);

        // SUCCESS - SHOW MESSAGE THEN REDIRECT
        showFormMessage('TOUR GUARDADO EN LA NUBE. Redirigiendo...', 'success');

        setTimeout(() => {
            // FORCE REDIRECT TO CLEAN URL (List Mode)
            window.location.href = 'admin-tours.html';
        }, 1500);

    } catch (err) {
        console.error(err);
        showFormMessage('ERROR AL GUARDAR: ' + err.message, 'error');
        if (btn) { btn.textContent = OriginalBtnText; btn.disabled = false; }
    }
}

// FORCE EXPORT
window.handleTourSubmit = handleTourSubmit;

// DEBUG TOOL
async function dumpAllData() {
    console.log('📦 DUMPING CLOUD CONTENTS...');
    try {
        const tours = await window.ContentManager.getTours();
        console.log('--- RAW DB DATA START ---');
        console.log(JSON.stringify(tours, null, 2));
        console.log('--- RAW DB DATA END ---');

        // Show in visual log too
        tours.forEach(t => {
            console.log(`ID: ${t.id} | Title: ${t.title} | Dates: ${t.dates ? t.dates.length : 0} | Cover: ${t.coverImage ? 'Yes (' + t.coverImage.length + ' chars)' : 'No'}`);
        });

        alert(`Hay ${tours.length} tours en la nube.`);
    } catch (e) {
        console.error(e);
        alert('Error dumping data');
    }
}
window.dumpAllData = dumpAllData;

console.log('✅ handleTourSubmit & dumpAllData EXPORTED to Global Scope');

// Render List (Home)
async function renderToursList() {
    const c = document.getElementById('tours-list');
    if (!c) return;

    c.innerHTML = '<p style="text-align:center; padding:20px;">Cargando tours de la nube...</p>';
    try {
        // Use ContentManager
        const tours = await window.ContentManager.getTours();

        if (!tours || tours.length === 0) {
            c.innerHTML = '<p style="text-align:center; padding:20px;">No hay tours creados.</p>';
            return;
        }

        c.innerHTML = tours.map(t => `
            <div class="ph-card" style="margin-bottom: 20px;">
                <div style="height:120px; background:url('${t.coverImage}') center/cover; position:relative;">
                     <!-- Optional: Status overlay -->
                </div>
                <div class="admin-tour-card-footer">
                    <div>
                        <h3 style="margin:0;">${t.title} <small style="color:gray; font-size:0.6em;">#${t.id}</small></h3>
                        <p style="margin:5px 0 0 0; color: #aaa; font-size:0.9em;">${t.dates ? t.dates.length : 0} Fechas</p>
                    </div>
                    <div class="admin-tour-actions">
                        <button onclick="navigateToEdit(${t.id})" class="ph-button ph-button--outline">EDITAR</button>
                        <button onclick="deleteTour(${t.id})" class="ph-button ph-button--outline" style="border-color: #e74c3c; color: #e74c3c;">ELIMINAR</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); c.innerHTML = 'Error cargando tours.'; }
}

async function deleteTour(id) {
    if (confirm('¿Eliminar tour #' + id + '?')) {
        try {
            const tours = await window.ContentManager.getTours();
            const newTours = tours.filter(t => Number(t.id) !== Number(id));
            await window.ContentManager.saveTours(newTours);

            // Reload UI
            await renderToursList();
            showFormMessage('Tour eliminado.', 'success');
        } catch (e) {
            alert('Error deleting: ' + e.message);
        }
    }
}
