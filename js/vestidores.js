/**
 * vestidores.js
 * Logic for managing "Vestidores" Lists and Positions
 */

// --- Global State ---
let isEditingId = null; // If set, we are editing this person
let currentSearchQuery = '';
let currentCategoryFilter = 'all';

// --- Utilities ---
function normalizeText(str) {
    if (!str) return '';
    return str.toString()
              .trim()
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""); // Remove accents/diacritics
}

function generateUUID() { // Simple UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- Modal Logic ---
function isAuthorized() {
    return localStorage.getItem('security_code') === '250925';
}

function openAddModal(editId = null) {
    const modal = document.getElementById('add-person-modal');
    const title = document.getElementById('modal-title');
    
    // Clear fields
    document.getElementById('vp-name').value = '';
    document.getElementById('vp-surname1').value = '';
    document.getElementById('vp-surname2').value = '';
    document.getElementById('vp-dni').value = '';
    document.getElementById('vp-birth-place').value = '';
    document.getElementById('vp-birth-date').value = '';
    document.getElementById('vp-address-street').value = '';
    document.getElementById('vp-address-num').value = '';
    document.getElementById('vp-zip-code').value = '';
    document.getElementById('vp-locality').value = '';
    document.getElementById('vp-phone').value = '';
    document.getElementById('vp-email').value = '';
    document.getElementById('vp-admission-year').value = '';
    document.getElementById('vp-category').value = 'Vestidor';

    if (editId) {
        title.textContent = 'Editar Persona';
        const person = StorageService.getVestidores().find(p => p.id === editId);
        if (person) {
            document.getElementById('vp-name').value = person.name || '';
            document.getElementById('vp-surname1').value = person.surname1 || '';
            document.getElementById('vp-surname2').value = person.surname2 || '';
            document.getElementById('vp-dni').value = person.dni || '';
            document.getElementById('vp-birth-place').value = person.birthPlace || '';
            document.getElementById('vp-birth-date').value = person.birthDate || '';
            document.getElementById('vp-address-street').value = person.addressStreet || '';
            document.getElementById('vp-address-num').value = person.addressNum || '';
            document.getElementById('vp-zip-code').value = person.zipCode || '';
            document.getElementById('vp-locality').value = person.locality || '';
            document.getElementById('vp-phone').value = person.phone || '';
            document.getElementById('vp-email').value = person.email || '';
            document.getElementById('vp-admission-year').value = person.admissionYear || '';
            document.getElementById('vp-category').value = person.category || 'Vestidor';
            isEditingId = editId;
        }
    } else {
        title.textContent = 'Añadir Persona';
        isEditingId = null;
    }

    modal.style.display = 'grid';
}

function closeModal() {
    document.getElementById('add-person-modal').style.display = 'none';
}

// --- CRUD Logic ---
function savePerson() {
    const name = document.getElementById('vp-name').value.trim();
    const surname1 = document.getElementById('vp-surname1').value.trim();
    const surname2 = document.getElementById('vp-surname2').value.trim();
    const dni = document.getElementById('vp-dni').value.trim();
    const birthPlace = document.getElementById('vp-birth-place').value.trim();
    const birthDate = document.getElementById('vp-birth-date').value.trim();
    const addressStreet = document.getElementById('vp-address-street').value.trim();
    const addressNum = document.getElementById('vp-address-num').value.trim();
    const zipCode = document.getElementById('vp-zip-code').value.trim();
    const locality = document.getElementById('vp-locality').value.trim();
    const phone = document.getElementById('vp-phone').value.trim();
    const email = document.getElementById('vp-email').value.trim();
    const admissionYear = document.getElementById('vp-admission-year').value.trim();
    const category = document.getElementById('vp-category').value;

    if (!name || !surname1) {
        Toast.error("Nombre y Primer Apellido son obligatorios");
        return;
    }

    const list = StorageService.getVestidores();
    
    // Check for Duplicates based on Name, Surname1, Surname2 and DNI (ignore deleted records)
    const isDup = list.some(p => {
        if (p.deleted) return false;
        if (isEditingId && p.id === isEditingId) return false;
        
        const nameMatch = normalizeText(p.name) === normalizeText(name) && 
                          normalizeText(p.surname1) === normalizeText(surname1) &&
                          normalizeText(p.surname2) === normalizeText(surname2);
        
        // If both DNI are provided, match them. Otherwise fallback to name+surname match.
        const dniMatch = (dni && p.dni) ? (normalizeText(p.dni) === normalizeText(dni)) : true;
        
        return nameMatch && dniMatch;
    });

    if (isDup) {
        const confirmSave = confirm(`¡Advertencia! Ya existe una persona registrada con el mismo Nombre, Apellidos ${dni ? 'y DNI' : ''}. ¿Deseas guardarla de todas formas?`);
        if (!confirmSave) return;
    }
    
    if (isEditingId) {
        // Update existing
        const index = list.findIndex(p => p.id === isEditingId);
        if (index !== -1) {
            list[index] = { 
                ...list[index], 
                name, surname1, surname2, dni, birthPlace, birthDate, addressStreet, addressNum, zipCode, locality, phone, email, admissionYear, category, 
                updatedAt: new Date().toISOString() 
            };
            Toast.success("Ficha actualizada correctamente.");
        }
    } else {
        // Create new
        const newPerson = {
            id: generateUUID(),
            name, surname1, surname2, dni, birthPlace, birthDate, addressStreet, addressNum, zipCode, locality, phone, email, admissionYear, category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        list.push(newPerson);
        Toast.success("Persona registrada con éxito.");
    }
    
    StorageService.saveVestidores(list);
    closeModal();
    renderVestidoresList();
    
    // Trigger Sync
    checkAutoSync(); 
}

function deletePerson(id) {
    if(confirm("¿Seguro que quieres borrar a esta persona?")) {
        let list = StorageService.getVestidores();
        const index = list.findIndex(p => p.id === id);
        if (index !== -1) {
            list[index].deleted = true;
            list[index].updatedAt = new Date().toISOString();
            StorageService.saveVestidores(list);
            renderVestidoresList();
            Toast.success("Registro eliminado.");
            checkAutoSync();
        }
    }
}

// --- Stats Logic ---
function updateDashboardStats(allVestidores) {
    const activeList = allVestidores.filter(p => !p.deleted);
    const total = activeList.length;
    const vestidores = activeList.filter(p => p.category === 'Vestidor').length;
    const voluntarios = activeList.filter(p => p.category === 'Voluntario').length;
    const extras = activeList.filter(p => p.category === 'Extra').length;

    const elTotal = document.getElementById('stat-total');
    const elVestidores = document.getElementById('stat-vestidores');
    const elVoluntarios = document.getElementById('stat-voluntarios');
    const elExtras = document.getElementById('stat-extras');

    if (elTotal) elTotal.textContent = total;
    if (elVestidores) elVestidores.textContent = vestidores;
    if (elVoluntarios) elVoluntarios.textContent = voluntarios;
    if (elExtras) elExtras.textContent = extras;
}// --- Photo Upload Logic (v0.5.0) ---
let photoUploadingPersonId = null;

function compressPortraitImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const targetWidth = 480;
            const targetHeight = 640;
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            
            const imgRatio = img.width / img.height;
            const targetRatio = targetWidth / targetHeight;
            
            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
            
            if (imgRatio > targetRatio) {
                sWidth = img.height * targetRatio;
                sx = (img.width - sWidth) / 2;
            } else {
                sHeight = img.width / targetRatio;
                sy = (img.height - sHeight) / 2;
            }
            
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
            const base64 = canvas.toDataURL('image/jpeg', 0.85);
            callback(base64);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function triggerVestidorPhotoUpload(personId) {
    if (!isAuthorized()) return;
    photoUploadingPersonId = personId;
    const fileInput = document.getElementById('upload-vestidor-photo-input');
    if (fileInput) {
        fileInput.value = ''; // Clear value
        fileInput.click();
    }
}

function deleteVestidorPhoto(personId) {
    if (!isAuthorized()) return;
    if (confirm("¿Estás seguro de que deseas eliminar la foto de este vestidor?")) {
        const list = StorageService.getVestidores();
        const index = list.findIndex(p => p.id === personId);
        if (index !== -1) {
            list[index].photo = '';
            list[index].updatedAt = new Date().toISOString();
            StorageService.saveVestidores(list);
            renderVestidoresList();
            if (typeof Toast !== 'undefined') Toast.success("Foto eliminada correctamente.");
            checkAutoSync();
        }
    }
}

// Register file upload change listener
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('upload-vestidor-photo-input');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file || !photoUploadingPersonId) return;
            
            if (typeof Toast !== 'undefined') Toast.info("Procesando y recortando foto...");
            
            compressPortraitImage(file, function(base64Data) {
                const list = StorageService.getVestidores();
                const index = list.findIndex(p => p.id === photoUploadingPersonId);
                
                if (index !== -1) {
                    list[index].photo = base64Data;
                    list[index].updatedAt = new Date().toISOString();
                    StorageService.saveVestidores(list);
                    renderVestidoresList();
                    if (typeof Toast !== 'undefined') Toast.success("Foto de carnet guardada.");
                    checkAutoSync();
                } else {
                    if (typeof Toast !== 'undefined') Toast.error("No se encontró el registro.");
                }
                photoUploadingPersonId = null;
                fileInput.value = '';
            });
        });
    }
});

// --- Render Logic ---
function renderVestidoresList() {
    const auth = isAuthorized();
    let list = StorageService.getVestidores();
    
    // UI elements adjustments based on authorization
    const imEx = document.getElementById('import-export-actions');
    if (imEx) imEx.style.display = 'flex';

    const importBtn = document.getElementById('import-btn');
    if (importBtn) importBtn.style.display = auth ? 'inline-flex' : 'none';

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.style.display = 'inline-flex';

    const fab = document.getElementById('add-person-fab');
    if (fab) fab.style.display = auth ? 'flex' : 'none';

    const stats = document.getElementById('stats-dashboard');
    if (stats) stats.style.display = auth ? 'grid' : 'none';

    const tabs = document.querySelector('.filter-tabs');
    if (tabs) tabs.style.display = auth ? 'flex' : 'none';

    const searchInput = document.getElementById('search-person');
    if (searchInput) {
        searchInput.placeholder = auth ? "Buscar por nombre, DNI, dirección o teléfono..." : "Buscar por nombre o apellidos...";
    }

    // Stats calculated from full dataset (filtering internally)
    updateDashboardStats(list);

    // Filter out deleted items
    list = list.filter(p => !p.deleted);

    // Apply Filters (Only if authorized, otherwise show all categories)
    if (auth && currentCategoryFilter !== 'all') {
        list = list.filter(p => p.category === currentCategoryFilter);
    }

    if (currentSearchQuery.trim() !== '') {
        const query = normalizeText(currentSearchQuery);
        list = list.filter(p => {
            const nameMatch = normalizeText(p.name).includes(query) ||
                              normalizeText(p.surname1).includes(query) ||
                              normalizeText(p.surname2).includes(query);
            if (!auth) {
                return nameMatch;
            }
            return nameMatch ||
                   normalizeText(p.dni).includes(query) ||
                   normalizeText(p.phone).includes(query) ||
                   normalizeText(p.addressStreet).includes(query) ||
                   normalizeText(p.locality).includes(query) ||
                   normalizeText(p.birthPlace).includes(query);
        });
    }

    const container = document.getElementById('vestidores-list-container');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">No se encontraron personas con los filtros aplicados.</p>';
        return;
    }

    // Sort by Category then Name (If not authorized, sort just by Name)
    list.sort((a, b) => {
        if (auth && a.category !== b.category) return a.category.localeCompare(b.category);
        const nameA = `${a.name} ${a.surname1} ${a.surname2}`;
        const nameB = `${b.name} ${b.surname1} ${b.surname2}`;
        return nameA.localeCompare(nameB);
    });

    list.forEach(person => {
        const card = document.createElement('div');
        
        // Build Photo Component (Tamaño carnet)
        let photoHtml = '';
        if (person.photo) {
            if (auth) {
                photoHtml = `
                    <div class="vestidor-photo-container admin-editable" onclick="event.stopPropagation(); triggerVestidorPhotoUpload('${person.id}')" title="Haga clic para cambiar la foto">
                        <button class="vestidor-photo-delete-badge" onclick="event.stopPropagation(); deleteVestidorPhoto('${person.id}')" title="Eliminar Foto">&times;</button>
                        <img src="${person.photo}" alt="Foto" class="vestidor-photo" />
                        <div class="vestidor-photo-overlay">📷</div>
                    </div>
                `;
            } else {
                photoHtml = `
                    <div class="vestidor-photo-container" onclick="event.stopPropagation(); openLightbox('${person.photo}')" style="cursor: pointer;" title="Haga clic para ampliar la foto">
                        <img src="${person.photo}" alt="Foto" class="vestidor-photo" />
                    </div>
                `;
            }
        } else {
            if (auth) {
                photoHtml = `
                    <div class="vestidor-photo-container admin-editable" onclick="event.stopPropagation(); triggerVestidorPhotoUpload('${person.id}')" title="Haga clic para subir una foto">
                        <span class="vestidor-photo-placeholder">👤</span>
                        <div class="vestidor-photo-overlay">📷</div>
                    </div>
                `;
            } else {
                photoHtml = `
                    <div class="vestidor-photo-container">
                        <span class="vestidor-photo-placeholder">👤</span>
                    </div>
                `;
            }
        }
        
        if (auth) {
            card.className = `card person-card category-${person.category}`;
            
            let badgeColor = '#9CA3AF';
            if (person.category === 'Vestidor') badgeColor = 'var(--primary)';
            if (person.category === 'Voluntario') badgeColor = 'var(--secondary)';
            if (person.category === 'Extra') badgeColor = '#6B7280';

            // Details construction
            let detailsHtml = '';
            if (person.dni || person.phone || person.email) {
                let contactParts = [];
                if (person.dni) contactParts.push(`DNI: ${person.dni}`);
                if (person.phone) contactParts.push(`Tel: ${person.phone}`);
                if (person.email) contactParts.push(`Email: ${person.email}`);
                detailsHtml += `
                    <div class="detail-item" style="grid-column: span 2;">
                        <span class="detail-icon">🪪</span>
                        <span>${contactParts.join(' | ')}</span>
                    </div>
                `;
            }
            if (person.addressStreet || person.locality) {
                let addrStr = person.addressStreet || '';
                if (person.addressNum) addrStr += ` Nº ${person.addressNum}`;
                let locParts = [];
                if (person.zipCode) locParts.push(person.zipCode);
                if (person.locality) locParts.push(person.locality);
                if (locParts.length > 0) {
                    addrStr += (addrStr ? ', ' : '') + locParts.join(' ');
                }
                detailsHtml += `
                    <div class="detail-item" style="grid-column: span 2;">
                        <span class="detail-icon">📍</span>
                        <span>${addrStr}</span>
                    </div>
                `;
            }
            if (person.birthDate || person.birthPlace) {
                let birthStr = '';
                if (person.birthDate) {
                    const dateParts = person.birthDate.split('-');
                    if (dateParts.length === 3) {
                        birthStr += `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                    } else {
                        birthStr += person.birthDate;
                    }
                }
                if (person.birthPlace) {
                    birthStr += (birthStr ? ' en ' : 'Nacido/a en ') + person.birthPlace;
                }
                detailsHtml += `
                    <div class="detail-item" style="grid-column: span 2;">
                        <span class="detail-icon">🎂</span>
                        <span>Nacimiento: ${birthStr}</span>
                    </div>
                `;
            }
            if (person.admissionYear) {
                const yearsIn = new Date().getFullYear() - parseInt(person.admissionYear);
                detailsHtml += `
                    <div class="detail-item" style="grid-column: span 2;">
                        <span class="detail-icon">🔑</span>
                        <span>Ingreso: ${person.admissionYear} (${yearsIn >= 0 ? yearsIn : 0} años de antigüedad)</span>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="person-main-row">
                    ${photoHtml}
                    <div style="flex: 1; min-width: 0;">
                        <div class="person-header" style="padding: 0;">
                            <div>
                                <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-main);">
                                    ${person.name} ${person.surname1 || ''} ${person.surname2 || ''}
                                </div>
                                <span style="display: inline-block; background: ${badgeColor}; color: white; padding: 0.2rem 0.65rem; border-radius: 99px; font-size: 0.7rem; font-weight: 600; margin-top: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;">
                                    ${person.category}
                                </span>
                            </div>
                            <span class="card-chevron">▼</span>
                        </div>
                    </div>
                </div>
                <div class="person-collapsible-wrapper">
                    <div class="person-details-grid">
                        ${detailsHtml || '<div class="detail-item" style="grid-column: span 2; font-style: italic;">Sin datos adicionales registrados.</div>'}
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openAddModal('${person.id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deletePerson('${person.id}')">
                            🗑️ Borrar
                        </button>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-actions') || e.target.tagName === 'BUTTON' || e.target.closest('.vestidor-photo-container')) {
                    return;
                }
                const isExpanded = card.classList.contains('expanded');
                document.querySelectorAll('.person-card').forEach(c => {
                    c.classList.remove('expanded');
                });
                if (!isExpanded) {
                    card.classList.add('expanded');
                }
            });
        } else {
            // Not authorized: Only show name, surnames, and photo, no interaction
            card.className = `card person-card`;
            card.style.cursor = 'default';
            card.innerHTML = `
                <div class="person-main-row">
                    ${photoHtml}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-main); padding: 0.25rem 0;">
                            ${person.name} ${person.surname1 || ''} ${person.surname2 || ''}
                        </div>
                    </div>
                </div>
            `;
        }

        container.appendChild(card);
    });
}

// --- Search & Filters Event Handlers ---
function handleSearchInput(e) {
    currentSearchQuery = e.target.value;
    renderVestidoresList();
}

function setCategoryFilter(category) {
    currentCategoryFilter = category;
    
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    if (category === 'all') document.getElementById('tab-all').classList.add('active');
    else if (category === 'Vestidor') document.getElementById('tab-vestidor').classList.add('active');
    else if (category === 'Voluntario') document.getElementById('tab-voluntario').classList.add('active');
    else if (category === 'Extra') document.getElementById('tab-extra').classList.add('active');
    
    renderVestidoresList();
}

function parseExcelDate(val) {
    return window.normalizeDateToYMD(val);
}

// --- Excel/CSV Import Logic ---
async function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileInput = event.target;
    Toast.info("Leyendo archivo de Excel/CSV...");

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rawJson = XLSX.utils.sheet_to_json(worksheet);

            if (!rawJson || rawJson.length === 0) {
                Toast.error("El archivo está vacío o no es compatible.");
                fileInput.value = '';
                return;
            }

            let importedCount = 0;
            let updatedCount = 0;
            let duplicateCount = 0;
            const list = StorageService.getVestidores();

            rawJson.forEach(row => {
                let name = '';
                let surname = '';
                let surname1 = '';
                let surname2 = '';
                let dni = '';
                let phone = '';
                let email = '';
                let birthPlace = '';
                let birthDate = '';
                let addressStreet = '';
                let addressNum = '';
                let zipCode = '';
                let locality = '';
                let admissionYear = '';
                let category = 'Vestidor';

                Object.keys(row).forEach(key => {
                    const normKey = normalizeText(key);
                    const val = row[key] ? row[key].toString().trim() : '';

                    if (normKey === 'nombre' || normKey === 'name') {
                        name = val;
                    } else if (normKey === 'apellidos' || normKey === 'apellido' || normKey === 'surname' || normKey === 'surnames') {
                        surname = val;
                    } else if (normKey === 'apellido1' || normKey === 'primerapellido' || normKey === 'apellido 1' || normKey === 'primer apellido' || normKey === 'surname1') {
                        surname1 = val;
                    } else if (normKey === 'apellido2' || normKey === 'segundoapellido' || normKey === 'apellido 2' || normKey === 'segundo apellido' || normKey === 'surname2') {
                        surname2 = val;
                    } else if (normKey === 'dni' || normKey === 'nif' || normKey === 'documento') {
                        dni = val;
                    } else if (normKey === 'telefono' || normKey === 'telefonos' || normKey === 'phone' || normKey === 'tel' || normKey === 'movil') {
                        phone = val;
                    } else if (normKey === 'correo' || normKey === 'correoelectronico' || normKey === 'correo electronico' || normKey === 'email' || normKey === 'mail') {
                        email = val;
                    } else if (normKey === 'lugardenacimiento' || normKey === 'lugar nacimiento' || normKey === 'nacidoen' || normKey === 'nacido en' || normKey === 'birthplace' || normKey === 'lugar' || normKey === 'procedencia') {
                        birthPlace = val;
                    } else if (normKey === 'fechadenacimiento' || normKey === 'fecha nacimiento' || normKey === 'birthdate' || normKey === 'fechanacimiento') {
                        birthDate = parseExcelDate(val);
                    } else if (normKey === 'direccion' || normKey === 'dir' || normKey === 'calle' || normKey === 'street' || normKey === 'address') {
                        addressStreet = val;
                    } else if (normKey === 'numero' || normKey === 'num' || normKey === 'nºdireccion' || normKey === 'nº direccion' || normKey === 'nº' || normKey === 'numero direccion' || normKey === 'streetnumber') {
                        addressNum = val;
                    } else if (normKey === 'codigopostal' || normKey === 'codigo postal' || normKey === 'cp' || normKey === 'zipcode' || normKey === 'zip') {
                        zipCode = val;
                    } else if (normKey === 'localidad' || normKey === 'pueblo' || normKey === 'ciudad' || normKey === 'locality' || normKey === 'town' || normKey === 'city') {
                        locality = val;
                    } else if (normKey === 'anodeingreso' || normKey === 'anoingreso' || normKey === 'ingreso' || normKey === 'admissionyear' || normKey === 'anioingreso' || normKey === 'año de ingreso' || normKey === 'año ingreso') {
                        admissionYear = val;
                    } else if (normKey === 'categoria' || normKey === 'category' || normKey === 'tipo') {
                        const normVal = normalizeText(val);
                        if (normVal.includes('vestidor')) category = 'Vestidor';
                        else if (normVal.includes('voluntario')) category = 'Voluntario';
                        else if (normVal.includes('extra')) category = 'Extra';
                    }
                });

                if (!name) return; // Skip if no name

                // Process combined surnames split if individual not provided
                if (surname && !surname1) {
                    const parts = surname.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        surname1 = parts[0];
                        surname2 = parts.slice(1).join(' ');
                    } else {
                        surname1 = surname;
                        surname2 = '';
                    }
                }

                // Find matching record for Smart Merge (ignore deleted records)
                const existingIndex = list.findIndex(p => {
                    if (p.deleted) return false;
                    
                    // Match by DNI if both have it
                    if (dni && p.dni && normalizeText(dni) === normalizeText(p.dni)) {
                        return true;
                    }
                    
                    // Match by Name + Surname1 + Surname2
                    const nameMatch = normalizeText(p.name) === normalizeText(name) && 
                                      normalizeText(p.surname1) === normalizeText(surname1) &&
                                      normalizeText(p.surname2) === normalizeText(surname2);
                    return nameMatch;
                });

                if (existingIndex !== -1) {
                    const p = list[existingIndex];
                    let hasChanges = false;
                    
                    // Fields list to compare and update
                    const updates = {
                        name: name,
                        surname1: surname1,
                        surname2: surname2,
                        dni: dni,
                        phone: phone,
                        email: email,
                        birthPlace: birthPlace,
                        birthDate: birthDate,
                        addressStreet: addressStreet,
                        addressNum: addressNum,
                        zipCode: zipCode,
                        locality: locality,
                        admissionYear: admissionYear,
                        category: category
                    };

                    Object.keys(updates).forEach(field => {
                        const newVal = updates[field];
                        // Update only if the incoming Excel value is not empty/null
                        if (newVal !== undefined && newVal !== null && newVal.toString().trim() !== '') {
                            const oldStr = p[field] ? p[field].toString().trim() : '';
                            const newStr = newVal.toString().trim();
                            
                            if (oldStr !== newStr) {
                                p[field] = newVal;
                                hasChanges = true;
                            }
                        }
                    });

                    if (hasChanges) {
                        p.updatedAt = new Date().toISOString();
                        updatedCount++;
                    } else {
                        duplicateCount++;
                    }
                } else {
                    const newPerson = {
                        id: generateUUID(),
                        name,
                        surname1: surname1 || '',
                        surname2: surname2 || '',
                        dni: dni || '',
                        phone: phone || '',
                        email: email || '',
                        birthPlace: birthPlace || '',
                        birthDate: birthDate || '',
                        addressStreet: addressStreet || '',
                        addressNum: addressNum || '',
                        zipCode: zipCode || '',
                        locality: locality || '',
                        admissionYear: admissionYear || '',
                        category,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    list.push(newPerson);
                    importedCount++;
                }
            });

            StorageService.saveVestidores(list);
            renderVestidoresList();
            
            // Comprehensive import feedback
            if (importedCount > 0 || updatedCount > 0) {
                Toast.success(`Importación completada: ${importedCount} añadidos, ${updatedCount} actualizados.`);
                checkAutoSync();
            }
            if (duplicateCount > 0) {
                Toast.info(`${duplicateCount} registros ya existían sin cambios y se omitieron.`);
            }
            if (importedCount === 0 && updatedCount === 0 && duplicateCount === 0) {
                Toast.info("No se encontraron registros válidos en el archivo.");
            }
        } catch (error) {
            console.error("Error al importar Excel:", error);
            Toast.error("Error al importar. Comprueba el formato de tu Excel.");
        } finally {
            fileInput.value = '';
        }
    };

    reader.onerror = function() {
        Toast.error("Error al leer el archivo.");
        fileInput.value = '';
    };

    reader.readAsArrayBuffer(file);
}

// --- Export Modal & Verification Logic ---
function handleExportClick() {
    if (isAuthorized()) {
        openExportModal();
    } else {
        const code = prompt("Introduce el código de seguridad para exportar el listado:");
        if (code === '250925') {
            localStorage.setItem('security_code', code);
            if (typeof Toast !== 'undefined') Toast.success("Acceso verificado. Listado desbloqueado.");
            renderVestidoresList(); // Refresh list to show stats, full details, etc.
            openExportModal();
        } else if (code !== null) {
            if (typeof Toast !== 'undefined') Toast.error("Código de seguridad incorrecto.");
        }
    }
}

function openExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) {
        modal.style.display = 'grid';
        updateExportOptionsUI();
    }
}

function closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateExportOptionsUI() {
    const formats = document.getElementsByName('export-format');
    formats.forEach(f => {
        const label = document.getElementById(`label-format-${f.value}`);
        if (label) {
            if (f.checked) {
                label.style.borderColor = f.value === 'excel' ? 'var(--primary)' : 'var(--secondary)';
                label.style.backgroundColor = f.value === 'excel' ? 'rgba(27, 54, 93, 0.05)' : 'rgba(197, 160, 89, 0.05)';
                label.style.fontWeight = '600';
            } else {
                label.style.borderColor = '#e5e7eb';
                label.style.backgroundColor = 'transparent';
                label.style.fontWeight = 'normal';
            }
        }
    });

    const scopes = document.getElementsByName('export-scope');
    scopes.forEach(s => {
        const label = document.getElementById(`label-scope-${s.value}`);
        if (label) {
            if (s.checked) {
                label.style.borderColor = 'var(--primary)';
                label.style.backgroundColor = 'rgba(27, 54, 93, 0.05)';
                label.style.fontWeight = '600';
            } else {
                label.style.borderColor = '#e5e7eb';
                label.style.backgroundColor = 'transparent';
                label.style.fontWeight = 'normal';
            }
        }
    });
}

function confirmExport() {
    const formats = document.getElementsByName('export-format');
    let format = 'excel';
    for (const f of formats) {
        if (f.checked) {
            format = f.value;
            break;
        }
    }

    const scopes = document.getElementsByName('export-scope');
    let scope = 'all';
    for (const s of scopes) {
        if (s.checked) {
            scope = s.value;
            break;
        }
    }

    closeExportModal();

    if (format === 'excel') {
        exportVestidoresToExcel(scope);
    } else {
        exportVestidoresToPDF(scope);
    }
}

// --- Export Logic ---
function exportVestidoresToExcel(scope = 'all') {
    const list = StorageService.getVestidores().filter(p => !p.deleted);
    if (list.length === 0) {
        if (typeof Toast !== 'undefined') Toast.warning("No hay datos para exportar.");
        return;
    }

    // Sort by Category then Name
    list.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        const nameA = `${a.name} ${a.surname1} ${a.surname2}`;
        const nameB = `${b.name} ${b.surname1} ${b.surname2}`;
        return nameA.localeCompare(nameB);
    });

    let formattedData;
    if (scope === 'names') {
        formattedData = list.map(item => ({
            'Nombre': item.name || '',
            'Primer Apellido': item.surname1 || '',
            'Segundo Apellido': item.surname2 || '',
            'Categoría': item.category || 'Vestidor'
        }));
    } else {
        formattedData = list.map(item => ({
            'Nombre': item.name || '',
            'Primer Apellido': item.surname1 || '',
            'Segundo Apellido': item.surname2 || '',
            'DNI': item.dni || '',
            'Nacido En': item.birthPlace || '',
            'Fecha Nacimiento': item.birthDate ? item.birthDate.split('-').reverse().join('/') : '',
            'Dirección (Calle)': item.addressStreet || '',
            'Nº': item.addressNum || '',
            'Código Postal': item.zipCode || '',
            'Localidad': item.locality || '',
            'Teléfono': item.phone || '',
            'Correo Electrónico': item.email || '',
            'Año Ingreso': item.admissionYear || '',
            'Categoría': item.category || 'Vestidor',
            'Fecha Creación': item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES') : ''
        }));
    }

    try {
        const ws = XLSX.utils.json_to_sheet(formattedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vestidores");
        
        const scopeStr = scope === 'names' ? 'nombres' : 'toda_info';
        XLSX.writeFile(wb, `vestidores_listado_${scopeStr}_${new Date().toISOString().split('T')[0]}.xlsx`);
        if (typeof Toast !== 'undefined') Toast.success("Listado exportado a Excel (.xlsx).");
    } catch (e) {
        console.error(e);
        if (typeof Toast !== 'undefined') Toast.error("Error al exportar a Excel.");
    }
}

function exportVestidoresToPDF(scope = 'all') {
    if (typeof window.jspdf === 'undefined') {
        if (typeof Toast !== 'undefined') Toast.error("La librería PDF no está disponible. Comprueba tu conexión.");
        return;
    }

    const list = StorageService.getVestidores().filter(p => !p.deleted);
    if (list.length === 0) {
        if (typeof Toast !== 'undefined') Toast.warning("No hay datos para exportar.");
        return;
    }

    // Sort by Category then Name
    list.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        const nameA = `${a.name} ${a.surname1} ${a.surname2}`;
        const nameB = `${b.name} ${b.surname1} ${b.surname2}`;
        return nameA.localeCompare(nameB);
    });

    const { jsPDF } = window.jspdf;
    const isNamesOnly = scope === 'names';
    const doc = new jsPDF(isNamesOnly ? 'p' : 'l', 'mm', 'a4');

    // Header title
    doc.setFontSize(16);
    doc.setTextColor(27, 54, 93); // Navy (#1B365D)
    doc.text('LISTADO DE PERSONAL - VESTIDORES', 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // Muted gray (#6B7280)
    const currentDate = new Date().toLocaleDateString('es-ES');
    const scopeLabel = isNamesOnly ? 'Solo nombres y categoría' : 'Información completa';
    doc.text(`Fecha de generación: ${currentDate} | Alcance: ${scopeLabel} | Total: ${list.length} personas`, 14, 21);

    // Draw gold line below header
    doc.setDrawColor(197, 160, 89); // Gold (#C5A059)
    doc.setLineWidth(0.5);
    doc.line(14, 24, doc.internal.pageSize.width - 14, 24);

    // Generate table data
    let headers, rows;
    if (isNamesOnly) {
        headers = ['Nombre', 'Primer Apellido', 'Segundo Apellido', 'Categoría'];
        rows = list.map(item => [
            item.name || '',
            item.surname1 || '',
            item.surname2 || '',
            item.category || 'Vestidor'
        ]);
    } else {
        headers = ['Nombre', 'Primer Apellido', 'Segundo Apellido', 'DNI', 'Categoría', 'Teléfono', 'Dirección', 'Localidad', 'Nacimiento', 'Ingreso'];
        rows = list.map(item => [
            item.name || '',
            item.surname1 || '',
            item.surname2 || '',
            item.dni || '',
            item.category || 'Vestidor',
            item.phone || '',
            (item.addressStreet || '') + (item.addressNum ? ' ' + item.addressNum : ''),
            (item.locality || ''),
            (item.birthDate ? item.birthDate.split('-').reverse().join('/') : '') + (item.birthPlace ? ' (' + item.birthPlace + ')' : ''),
            item.admissionYear || ''
        ]);
    }

    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 28,
        theme: 'striped',
        headStyles: { 
            fillColor: [27, 54, 93], // Navy
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        },
        styles: { 
            font: 'helvetica', 
            fontSize: isNamesOnly ? 10 : 8,
            cellPadding: 3
        },
        margin: { left: 14, right: 14 }
    });

    const scopeStr = isNamesOnly ? 'nombres' : 'toda_info';
    doc.save(`vestidores_listado_${scopeStr}_${new Date().toISOString().split('T')[0]}.pdf`);
    if (typeof Toast !== 'undefined') Toast.success("Listado exportado a PDF (.pdf).");
}

// --- Posiciones Feature Global State (v0.6.0) ---
let currentZoom = 1;
const ZOOM_STEP = 0.2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

let isPanning = false;
let panStart = { x: 0, y: 0 };
let currentPan = { x: 0, y: 0 };

function initPosicionesView() {
    const authorized = isAuthorized();
    
    // Hide or show admin-only buttons (upload and reset manto image)
    const uploadBtn = document.getElementById('upload-manto-btn');
    const resetBtn = document.getElementById('reset-manto-btn');
    const sidebar = document.getElementById('posiciones-sidebar');
    
    if (authorized) {
        if (uploadBtn) uploadBtn.style.display = 'inline-block';
        if (resetBtn) resetBtn.style.display = 'inline-block';
        if (sidebar) sidebar.style.display = 'flex';
    } else {
        if (uploadBtn) uploadBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
    }

    // Load Manto Image
    loadMantoImage();

    // Reset zoom and pan
    resetZoomManto();

    // Render pins and list
    renderPosiciones();

    // Set up dragging/panning events on the manto viewport
    setupMantoViewportEvents();
}

function loadMantoImage() {
    const imgEl = document.getElementById('manto-image');
    if (!imgEl) return;

    const customManto = localStorage.getItem('manto_image_custom');
    if (customManto) {
        imgEl.src = customManto;
    } else {
        imgEl.src = 'assets/manto_placeholder.png';
    }
}

function resetMantoImage() {
    if (!isAuthorized()) return;
    if (confirm('¿Estás seguro de que quieres restaurar la imagen por defecto del manto?')) {
        localStorage.removeItem('manto_image_custom');
        loadMantoImage();
        if (typeof Toast !== 'undefined') Toast.success('Imagen del manto restaurada.');
    }
}

function handleMantoUpload(event) {
    if (!isAuthorized()) return;
    const file = event.target.files[0];
    if (!file) return;

    if (typeof Toast !== 'undefined') Toast.info('Cargando y optimizando imagen del manto...');

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const max_size = 1200; // Limit dimensions to 1200px maximum for mantle

            if (width > height) {
                if (width > max_size) {
                    height = Math.round(height * max_size / width);
                    width = max_size;
                }
            } else {
                if (height > max_size) {
                    width = Math.round(width * max_size / height);
                    height = max_size;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            try {
                localStorage.setItem('manto_image_custom', base64);
                loadMantoImage();
                if (typeof Toast !== 'undefined') Toast.success('Imagen del manto actualizada correctamente.');
            } catch (err) {
                if (typeof Toast !== 'undefined') Toast.error('La imagen es demasiado grande para guardar localmente.');
                console.error(err);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset
}

function updateZoomTransform() {
    const container = document.getElementById('manto-zoom-container');
    if (!container) return;
    container.style.transform = `scale(${currentZoom}) translate(${currentPan.x}px, ${currentPan.y}px)`;
}

function zoomInManto() {
    currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);
    updateZoomTransform();
}

function zoomOutManto() {
    currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);
    updateZoomTransform();
}

function resetZoomManto() {
    currentZoom = 1;
    currentPan = { x: 0, y: 0 };
    updateZoomTransform();
}

function setupMantoViewportEvents() {
    const viewport = document.getElementById('manto-viewport');
    const container = document.getElementById('manto-zoom-container');
    if (!viewport || !container) return;

    viewport.onmousedown = function(e) {
        if (e.target.closest('.manto-pin') || e.target.closest('button')) return;
        
        isPanning = true;
        viewport.style.cursor = 'grabbing';
        panStart.x = e.clientX - currentPan.x * currentZoom;
        panStart.y = e.clientY - currentPan.y * currentZoom;
    };

    window.onmousemove = function(e) {
        if (!isPanning) return;
        currentPan.x = (e.clientX - panStart.x) / currentZoom;
        currentPan.y = (e.clientY - panStart.y) / currentZoom;
        updateZoomTransform();
    };

    window.onmouseup = function() {
        if (isPanning) {
            isPanning = false;
            viewport.style.cursor = 'grab';
        }
    };

    // Touch support for panning
    viewport.ontouchstart = function(e) {
        if (e.target.closest('.manto-pin') || e.target.closest('button')) return;
        if (e.touches.length === 1) {
            isPanning = true;
            const touch = e.touches[0];
            panStart.x = touch.clientX - currentPan.x * currentZoom;
            panStart.y = touch.clientY - currentPan.y * currentZoom;
        }
    };

    viewport.ontouchmove = function(e) {
        if (!isPanning) return;
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            currentPan.x = (touch.clientX - panStart.x) / currentZoom;
            currentPan.y = (touch.clientY - panStart.y) / currentZoom;
            updateZoomTransform();
        }
    };

    viewport.ontouchend = function() {
        isPanning = false;
    };

    const pinsContainer = document.getElementById('pins-container');
    if (pinsContainer) {
        pinsContainer.ondragover = function(e) {
            e.preventDefault();
        };

        pinsContainer.ondrop = function(e) {
            e.preventDefault();
            const authorized = isAuthorized();
            if (!authorized) return;

            const vestidorId = e.dataTransfer.getData('text/plain');
            if (!vestidorId) return;

            const rect = pinsContainer.getBoundingClientRect();
            const xPx = (e.clientX - rect.left);
            const yPx = (e.clientY - rect.top);
            
            const xPercent = parseFloat(((xPx / rect.width) * 100).toFixed(2));
            const yPercent = parseFloat(((yPx / rect.height) * 100).toFixed(2));

            placeVestidor(vestidorId, xPercent, yPercent);
        };
    }
}

function getInitials(name, surname1) {
    const firstChar = name ? name.trim().charAt(0) : '';
    const secondChar = surname1 ? surname1.trim().charAt(0) : '';
    return (firstChar + secondChar).toUpperCase() || '👤';
}

function renderPosiciones() {
    const authorized = isAuthorized();
    const list = StorageService.getVestidores();
    const activeVestidores = list.filter(p => !p.deleted);

    // 1. Render Pins on the mantle
    const pinsContainer = document.getElementById('pins-container');
    if (pinsContainer) {
        pinsContainer.innerHTML = '';
        activeVestidores.forEach(person => {
            if (person.position && person.position.x !== undefined && person.position.y !== undefined) {
                const pin = document.createElement('div');
                pin.className = 'manto-pin' + (authorized ? '' : ' read-only');
                pin.style.left = person.position.x + '%';
                pin.style.top = person.position.y + '%';
                
                // Construct avatar photo or initials
                let avatarHtml = '';
                if (person.photo) {
                    avatarHtml = `<div class="manto-pin-avatar"><img src="${person.photo}" alt="${person.name}" /></div>`;
                } else {
                    const initials = getInitials(person.name, person.surname1);
                    avatarHtml = `<div class="manto-pin-initials">${initials}</div>`;
                }
                
                // Construct tooltip
                const fullName = `${person.name} ${person.surname1 || ''} ${person.surname2 || ''}`.trim();
                const tooltipHtml = `<div class="manto-pin-tooltip">${fullName}</div>`;
                
                pin.innerHTML = avatarHtml + tooltipHtml;

                // Click event to toggle tooltip
                pin.onclick = function(e) {
                    e.stopPropagation();
                    const isActive = pin.classList.contains('active');
                    document.querySelectorAll('.manto-pin').forEach(p => p.classList.remove('active'));
                    if (!isActive) {
                        pin.classList.add('active');
                    }
                };

                if (authorized) {
                    pin.draggable = true;
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'pin-remove-btn';
                    removeBtn.innerHTML = '&times;';
                    removeBtn.title = 'Quitar posición';
                    removeBtn.onclick = function(e) {
                        e.stopPropagation();
                        unplaceVestidor(person.id);
                    };
                    pin.appendChild(removeBtn);

                    pin.ondragstart = function(e) {
                        e.dataTransfer.setData('text/plain', person.id);
                        // Hide tooltip during drag
                        pin.classList.remove('active');
                    };
                }

                pinsContainer.appendChild(pin);
            }
        });
    }

    // 2. Render Unpositioned List in sidebar (only if authorized/admin)
    const unpositionedList = document.getElementById('unpositioned-list');
    if (unpositionedList) {
        unpositionedList.innerHTML = '';
        
        const unpositioned = activeVestidores.filter(person => !person.position || person.position.x === undefined);
        
        if (unpositioned.length === 0) {
            unpositionedList.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.8rem; padding: 1rem;">Todos posicionados</div>';
        } else {
            unpositioned.forEach(person => {
                const item = document.createElement('div');
                item.className = 'unpositioned-item';
                item.innerHTML = `${person.name} ${person.surname1 || ''}`;
                
                if (authorized) {
                    item.draggable = true;
                    item.ondragstart = function(e) {
                        e.dataTransfer.setData('text/plain', person.id);
                    };
                    
                    item.onclick = function() {
                        placeVestidor(person.id, 50, 50);
                    };
                }
                unpositionedList.appendChild(item);
            });
        }
    }
}

function placeVestidor(id, x, y) {
    if (!isAuthorized()) return;
    const list = StorageService.getVestidores();
    const index = list.findIndex(p => p.id === id);
    if (index !== -1) {
        list[index].position = { x, y };
        list[index].updatedAt = new Date().toISOString();
        StorageService.saveVestidores(list);
        renderPosiciones();
        
        if (typeof checkAutoSync !== 'undefined') checkAutoSync();
    }
}

function unplaceVestidor(id) {
    if (!isAuthorized()) return;
    const list = StorageService.getVestidores();
    const index = list.findIndex(p => p.id === id);
    if (index !== -1) {
        delete list[index].position;
        list[index].updatedAt = new Date().toISOString();
        StorageService.saveVestidores(list);
        renderPosiciones();
        
        if (typeof checkAutoSync !== 'undefined') checkAutoSync();
    }
}

// Global listener to close tooltips when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.manto-pin')) {
        document.querySelectorAll('.manto-pin').forEach(p => p.classList.remove('active'));
    }
});


