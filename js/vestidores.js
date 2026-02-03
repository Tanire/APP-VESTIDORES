/**
 * vestidores.js
 * Logic for managing "Vestidores" Lists and Positions
 */

// --- Global State ---
let isEditingId = null; // If set, we are editing this person

// --- Modal Logic ---
function openAddModal(editId = null) {
    const modal = document.getElementById('add-person-modal');
    // Clear fields
    document.getElementById('vp-name').value = '';
    document.getElementById('vp-surname').value = '';
    document.getElementById('vp-dni').value = '';
    document.getElementById('vp-phone').value = '';
    document.getElementById('vp-category').value = 'Vestidor';

    if (editId) {
        // Load data if editing (Not implemented in UI yet, but good for future)
        const person = StorageService.getVestidores().find(p => p.id === editId);
        if (person) {
            document.getElementById('vp-name').value = person.name;
            document.getElementById('vp-surname').value = person.surname;
            document.getElementById('vp-dni').value = person.dni;
            document.getElementById('vp-phone').value = person.phone;
            document.getElementById('vp-category').value = person.category;
            isEditingId = editId;
        }
    } else {
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
    const category = document.getElementById('vp-category').value;

    if (!name || !surname) {
        alert("Nombre y Apellidos son obligatorios");
        return;
    }

    const list = StorageService.getVestidores();
    
    if (isEditingId) {
        // Update existing
        const index = list.findIndex(p => p.id === isEditingId);
        if (index !== -1) {
            list[index] = { 
                ...list[index], 
                name, surname, dni, phone, category, 
                updatedAt: new Date().toISOString() 
            };
        }
    } else {
        // Create new
        const newPerson = {
            id: generateUUID(),
            name,
            surname,
            dni,
            phone,
            category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        list.push(newPerson);
    }
    
    StorageService.saveVestidores(list);
    closeModal();
    renderVestidoresList();
    
    // Trigger Sync
    if (window.SyncService) {
        // Manually trigger sync or rely on checkAutoSync if called later?
        // Let's reuse the logic in StorageService.triggerAutoSync (which we removed from loop)
        // Or better, just call checkAutoSync() in background
        checkAutoSync(); 
    }
}

function deletePerson(id) {
    if(confirm("¿Seguro que quieres borrar a esta persona?")) {
        let list = StorageService.getVestidores();
        list = list.filter(p => p.id !== id);
        StorageService.saveVestidores(list);
        renderVestidoresList();
        checkAutoSync();
    }
}

// --- Render Logic ---
function renderVestidoresList() {
    const list = StorageService.getVestidores();
    const container = document.getElementById('vestidores-list-container');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">No hay nadie apuntado aún.</p>';
        return;
    }

    // Sort by Category then Name
    list.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
    });

    list.forEach(person => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        
        // Determine badge color
        let badgeColor = '#9CA3AF'; // Default
        if (person.category === 'Vestidor') badgeColor = 'var(--primary)';
        if (person.category === 'Voluntario') badgeColor = 'var(--success)';
        if (person.category === 'Extra') badgeColor = 'var(--secondary)';

        card.innerHTML = `
            <div>
                <div style="font-weight: 600; font-size: 1.1rem; color: var(--text-main);">
                    ${person.name} ${person.surname}
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.2rem;">
                    ${person.dni ? 'DNI: ' + person.dni : ''} 
                    ${person.dni && person.phone ? '|' : ''} 
                    ${person.phone ? 'Tel: ' + person.phone : ''}
                </div>
                <span style="display: inline-block; background: ${badgeColor}; color: white; padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.7rem; font-weight: 600; margin-top: 0.5rem;">
                    ${person.category}
                </span>
            </div>
            <button class="btn btn-sm" style="background: none; color: var(--danger); font-size: 1.5rem;" onclick="deletePerson('${person.id}')">
                &times;
            </button>
        `;
        
        // Optional: click card to edit (except delete btn)
        card.addEventListener('click', (e) => {
            if(e.target.tagName !== 'BUTTON') {
                openAddModal(person.id);
            }
        });

        container.appendChild(card);
    });
}

// --- Utilities ---
function generateUUID() { // Simple UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
