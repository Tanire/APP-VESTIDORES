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
function openAddModal(editId = null) {
    const modal = document.getElementById('add-person-modal');
    const title = document.getElementById('modal-title');
    
    // Clear fields
    document.getElementById('vp-name').value = '';
    document.getElementById('vp-surname').value = '';
    document.getElementById('vp-dni').value = '';
    document.getElementById('vp-phone').value = '';
    document.getElementById('vp-address').value = '';
    document.getElementById('vp-birth-year').value = '';
    document.getElementById('vp-admission-year').value = '';
    document.getElementById('vp-birth-place').value = '';
    document.getElementById('vp-category').value = 'Vestidor';

    if (editId) {
        title.textContent = 'Editar Persona';
        const person = StorageService.getVestidores().find(p => p.id === editId);
        if (person) {
            document.getElementById('vp-name').value = person.name || '';
            document.getElementById('vp-surname').value = person.surname || '';
            document.getElementById('vp-dni').value = person.dni || '';
            document.getElementById('vp-phone').value = person.phone || '';
            document.getElementById('vp-address').value = person.address || '';
            document.getElementById('vp-birth-year').value = person.birthYear || '';
            document.getElementById('vp-admission-year').value = person.admissionYear || '';
            document.getElementById('vp-birth-place').value = person.birthPlace || '';
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
    const surname = document.getElementById('vp-surname').value.trim();
    const dni = document.getElementById('vp-dni').value.trim();
    const phone = document.getElementById('vp-phone').value.trim();
    const address = document.getElementById('vp-address').value.trim();
    const birthYear = document.getElementById('vp-birth-year').value.trim();
    const admissionYear = document.getElementById('vp-admission-year').value.trim();
    const birthPlace = document.getElementById('vp-birth-place').value.trim();
    const category = document.getElementById('vp-category').value;

    if (!name || !surname) {
        Toast.error("Nombre y Apellidos son obligatorios");
        return;
    }

    const list = StorageService.getVestidores();
    
    // Check for Duplicates based on Name, Surname and DNI
    const isDup = list.some(p => {
        if (isEditingId && p.id === isEditingId) return false;
        
        const nameMatch = normalizeText(p.name) === normalizeText(name) && 
                          normalizeText(p.surname) === normalizeText(surname);
        
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
                name, surname, dni, phone, address, birthYear, admissionYear, birthPlace, category, 
                updatedAt: new Date().toISOString() 
            };
            Toast.success("Ficha actualizada correctamente.");
        }
    } else {
        // Create new
        const newPerson = {
            id: generateUUID(),
            name, surname, dni, phone, address, birthYear, admissionYear, birthPlace, category,
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
        list = list.filter(p => p.id !== id);
        StorageService.saveVestidores(list);
        renderVestidoresList();
        Toast.success("Registro eliminado.");
        checkAutoSync();
    }
}

// --- Stats Logic ---
function updateDashboardStats(allVestidores) {
    const total = allVestidores.length;
    const vestidores = allVestidores.filter(p => p.category === 'Vestidor').length;
    const voluntarios = allVestidores.filter(p => p.category === 'Voluntario').length;
    const extras = allVestidores.filter(p => p.category === 'Extra').length;

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
    let list = StorageService.getVestidores();
    
    // Stats calculated from full dataset
    updateDashboardStats(list);

    // Apply Filters
    if (currentCategoryFilter !== 'all') {
        list = list.filter(p => p.category === currentCategoryFilter);
    }

    if (currentSearchQuery.trim() !== '') {
        const query = normalizeText(currentSearchQuery);
        list = list.filter(p => {
            return normalizeText(p.name).includes(query) ||
                   normalizeText(p.surname).includes(query) ||
                   normalizeText(p.dni).includes(query) ||
                   normalizeText(p.phone).includes(query) ||
                   normalizeText(p.address).includes(query) ||
                   normalizeText(p.birthPlace).includes(query);
        });
    }

    const container = document.getElementById('vestidores-list-container');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">No se encontraron personas con los filtros aplicados.</p>';
        return;
    }

    // Sort by Category then Name
    list.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
    });

    list.forEach(person => {
        const card = document.createElement('div');
        card.className = `card person-card category-${person.category}`;
        
        let badgeColor = '#9CA3AF';
        if (person.category === 'Vestidor') badgeColor = 'var(--primary)';
        if (person.category === 'Voluntario') badgeColor = 'var(--secondary)';
        if (person.category === 'Extra') badgeColor = '#6B7280';

        // Details construction
        let detailsHtml = '';
        if (person.dni || person.phone) {
            detailsHtml += `
                <div class="detail-item">
                    <span class="detail-icon">🪪</span>
                    <span>${person.dni ? 'DNI: ' + person.dni : ''} ${person.dni && person.phone ? ' | ' : ''} ${person.phone ? 'Tel: ' + person.phone : ''}</span>
                </div>
            `;
        }
        if (person.address) {
            detailsHtml += `
                <div class="detail-item">
                    <span class="detail-icon">📍</span>
                    <span>${person.address}</span>
                </div>
            `;
        }
        if (person.birthYear || person.birthPlace) {
            let birthStr = '';
            if (person.birthYear) birthStr += `Nacimiento: ${person.birthYear}`;
            if (person.birthPlace) birthStr += `${person.birthYear ? ' en ' : 'Nacido/a en '}${person.birthPlace}`;
            detailsHtml += `
                <div class="detail-item">
                    <span class="detail-icon">🎂</span>
                    <span>${birthStr}</span>
                </div>
            `;
        }
        if (person.admissionYear) {
            const yearsIn = new Date().getFullYear() - parseInt(person.admissionYear);
            detailsHtml += `
                <div class="detail-item">
                    <span class="detail-icon">🔑</span>
                    <span>Ingreso: ${person.admissionYear} (${yearsIn >= 0 ? yearsIn : 0} años de antigüedad)</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="person-header">
                <div>
                    <div style="font-weight: 700; font-size: 1.15rem; color: var(--text-main);">
                        ${person.name} ${person.surname}
                    </div>
                    <span style="display: inline-block; background: ${badgeColor}; color: white; padding: 0.2rem 0.65rem; border-radius: 99px; font-size: 0.7rem; font-weight: 600; margin-top: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;">
                        ${person.category}
                    </span>
                </div>
                <button class="btn btn-sm" style="background: none; border: none; box-shadow: none; color: var(--danger); font-size: 1.5rem; padding: 0; margin-top: -5px;" onclick="event.stopPropagation(); deletePerson('${person.id}')">
                    &times;
                </button>
            </div>
            ${detailsHtml ? `<div class="person-details-grid">${detailsHtml}</div>` : ''}
        `;
        
        card.addEventListener('click', (e) => {
            if(e.target.tagName !== 'BUTTON') {
                openAddModal(person.id);
            }
        });

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
                let dni = '';
                let phone = '';
                let address = '';
                let birthYear = '';
                let admissionYear = '';
                let birthPlace = '';
                let category = 'Vestidor';

                Object.keys(row).forEach(key => {
                    const normKey = normalizeText(key);
                    const val = row[key] ? row[key].toString().trim() : '';

                    if (normKey === 'nombre' || normKey === 'name') {
                        name = val;
                    } else if (normKey === 'apellidos' || normKey === 'apellido' || normKey === 'surname' || normKey === 'surnames') {
                        surname = val;
                    } else if (normKey === 'dni' || normKey === 'nif' || normKey === 'documento') {
                        dni = val;
                    } else if (normKey === 'telefono' || normKey === 'telefonos' || normKey === 'phone' || normKey === 'tel' || normKey === 'movil') {
                        phone = val;
                    } else if (normKey === 'direccion' || normKey === 'dir' || normKey === 'address' || normKey === 'domicilio') {
                        address = val;
                    } else if (normKey === 'anode nacimiento' || normKey === 'anonacimiento' || normKey === 'nacimiento' || normKey === 'birthyear' || normKey === 'anionacimiento' || normKey === 'año de nacimiento' || normKey === 'año nacimiento' || normKey === 'nacido') {
                        birthYear = val;
                    } else if (normKey === 'anode ingreso' || normKey === 'anoingreso' || normKey === 'ingreso' || normKey === 'admissionyear' || normKey === 'anioingreso' || normKey === 'año de ingreso' || normKey === 'año ingreso') {
                        admissionYear = val;
                    } else if (normKey === 'lugar de nacimiento' || normKey === 'lugarnacimiento' || normKey === 'birthplace' || normKey === 'lugar' || normKey === 'procedencia') {
                        birthPlace = val;
                    } else if (normKey === 'categoria' || normKey === 'category' || normKey === 'tipo') {
                        const normVal = normalizeText(val);
                        if (normVal.includes('vestidor')) category = 'Vestidor';
                        else if (normVal.includes('voluntario')) category = 'Voluntario';
                        else if (normVal.includes('extra')) category = 'Extra';
                    }
                });

                if (!name) return; // Skip if no name

                // Duplicate Check
                const isDup = list.some(p => {
                    const nameMatch = normalizeText(p.name) === normalizeText(name) && 
                                      normalizeText(p.surname) === normalizeText(surname);
                    const dniMatch = (dni && p.dni) ? (normalizeText(p.dni) === normalizeText(dni)) : true;
                    return nameMatch && dniMatch;
                });

                if (isDup) {
                    duplicateCount++;
                } else {
                    const newPerson = {
                        id: generateUUID(),
                        name,
                        surname: surname || '',
                        dni: dni || '',
                        phone: phone || '',
                        address: address || '',
                        birthYear: birthYear || '',
                        admissionYear: admissionYear || '',
                        birthPlace: birthPlace || '',
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
    const list = StorageService.getVestidores();
    if (list.length === 0) {
        Toast.warning("No hay datos para exportar.");
        return;
    }

    // Headers
    let csvContent = "\uFEFF"; // Add UTF-8 BOM so Excel opens with Spanish accents correctly
    csvContent += "Nombre,Apellidos,DNI,Teléfono,Dirección,Año Nacimiento,Año Ingreso,Lugar Nacimiento,Categoría,Fecha Registro\n";

    // Rows
    list.forEach(item => {
        const row = [
            item.name,
            item.surname,
            item.dni,
            item.phone,
            item.address,
            item.birthYear,
            item.admissionYear,
            item.birthPlace,
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

