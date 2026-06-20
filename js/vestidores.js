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

    modal.style.display = 'flex';
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
}

// --- Render Logic ---
function renderVestidoresList() {
    const auth = isAuthorized();
    let list = StorageService.getVestidores();
    
    // UI elements adjustments based on authorization
    const imEx = document.getElementById('import-export-actions');
    if (imEx) imEx.style.display = auth ? 'flex' : 'none';

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
                <div class="person-header">
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
                if (e.target.closest('.card-actions') || e.target.tagName === 'BUTTON') {
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
            // Not authorized: Only show name, no interaction
            card.className = `card person-card`;
            card.style.cursor = 'default';
            card.innerHTML = `
                <div class="person-header">
                    <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-main); padding: 0.25rem 0;">
                        ${person.name} ${person.surname1 || ''} ${person.surname2 || ''}
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
                        birthDate = val;
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

                // Duplicate Check (ignore deleted records)
                const isDup = list.some(p => {
                    if (p.deleted) return false;
                    const nameMatch = normalizeText(p.name) === normalizeText(name) && 
                                      normalizeText(p.surname1) === normalizeText(surname1) &&
                                      normalizeText(p.surname2) === normalizeText(surname2);
                    const dniMatch = (dni && p.dni) ? (normalizeText(p.dni) === normalizeText(dni)) : true;
                    return nameMatch && dniMatch;
                });

                if (isDup) {
                    duplicateCount++;
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
            
            if (importedCount > 0) {
                Toast.success(`¡Importados con éxito! ${importedCount} personas agregadas.`);
                checkAutoSync();
            }
            if (duplicateCount > 0) {
                Toast.warning(`${duplicateCount} registros duplicados fueron omitidos.`);
            }
            if (importedCount === 0 && duplicateCount === 0) {
                Toast.info("No se encontraron registros nuevos válidos.");
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

// --- Export Logic ---
function exportVestidoresToCSV() {
    const list = StorageService.getVestidores().filter(p => !p.deleted);
    if (list.length === 0) {
        Toast.warning("No hay datos para exportar.");
        return;
    }

    // Headers
    let csvContent = "\uFEFF"; // Add UTF-8 BOM so Excel opens with Spanish accents correctly
    csvContent += "Nombre,Apellido 1,Apellido 2,DNI,Nacido En,Fecha Nacimiento,Dirección,Nº Dirección,Código Postal,Localidad,Teléfono,Correo Electrónico,Año Ingreso,Categoría,Fecha Registro\n";

    // Rows
    list.forEach(item => {
        const row = [
            item.name,
            item.surname1,
            item.surname2,
            item.dni,
            item.birthPlace,
            item.birthDate,
            item.addressStreet,
            item.addressNum,
            item.zipCode,
            item.locality,
            item.phone,
            item.email,
            item.admissionYear,
            item.category,
            new Date(item.createdAt).toLocaleDateString()
        ].map(e => `"${e ? e.toString().replace(/"/g, '""') : ''}"`).join(",");
        csvContent += row + "\n";
    });

    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `vestidores_listado_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Toast.success("Listado exportado a CSV.");
    } catch (e) {
        console.error(e);
        Toast.error("Error al exportar los datos.");
    }
}

