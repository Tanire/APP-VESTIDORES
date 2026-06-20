/**
 * ofrendas.js
 * Logic for managing photos folders and gallery within the "Ofrenda" section.
 */

// --- Global State ---
let activeFolderId = null; // Current open folder ID, if null we are in folders list view

// Helper to check authorization
function isOfrendaAuthorized() {
    return localStorage.getItem('security_code') === '250925';
}

// Helper to generate UUIDs
function generateFolderUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- Render Logic ---
function renderOfrendaFolders() {
    const container = document.getElementById('ofrenda-folders-area');
    if (!container) return;

    const authorized = isOfrendaAuthorized();

    if (!authorized) {
        // Locked card placeholder
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 2rem 1.5rem; border-left: 4px solid var(--accent); background: var(--bg-card);">
                <div style="font-size: 3rem; margin-bottom: 0.75rem;">🔒</div>
                <h3 style="margin-bottom: 0.5rem; color: var(--text-main);">Carpetas de Fotos Protegidas</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem; max-width: 320px; margin-left: auto; margin-right: auto;">
                    Introduce el código de verificación en Ajustes para poder visualizar y gestionar las carpetas de fotos.
                </p>
                <button class="btn btn-primary btn-sm" onclick="navigateTo('settings.html')">
                    Ir a Ajustes
                </button>
            </div>
        `;
        return;
    }

    const folders = StorageService.get('ofrenda_folders', []);

    // Filter out deleted folders
    const activeFolders = folders.filter(f => !f.deleted);

    if (activeFolderId === null) {
        // --- 1. Folders List View ---
        let folderCardsHtml = '';
        
        // Add new folder card button
        folderCardsHtml += `
            <div class="folder-card" style="border: 2px dashed #d1d5db; background: transparent; display: flex; justify-content: center;" onclick="openFolderModal()">
                <div class="folder-card-icon" style="color: var(--text-muted);">➕</div>
                <div class="folder-card-title" style="color: var(--text-muted);">Añadir Carpeta</div>
                <div class="folder-card-count">Crear nueva</div>
            </div>
        `;

        activeFolders.forEach(folder => {
            const photoCount = folder.photos ? folder.photos.filter(p => !p.deleted).length : 0;
            const updateDate = folder.updatedAt ? new Date(folder.updatedAt).toLocaleDateString() : 'Sin fecha';
            
            // Check for a preview photo (first active photo)
            const activePhotos = folder.photos ? folder.photos.filter(p => !p.deleted) : [];
            let iconHtml = '<div class="folder-card-icon">📁</div>';
            if (activePhotos.length > 0) {
                iconHtml = `<div class="folder-card-thumbnail" style="background-image: url('${activePhotos[0].base64}');" onclick="event.stopPropagation(); openLightbox('${activePhotos[0].base64}')" title="Haga clic en la foto para ampliar"></div>`;
            }
            
            folderCardsHtml += `
                <div class="folder-card" onclick="openFolder('${folder.id}')">
                    <button class="folder-delete-btn" title="Eliminar Carpeta" onclick="event.stopPropagation(); deleteFolder('${folder.id}')">
                        &times;
                    </button>
                    ${iconHtml}
                    <div class="folder-card-title">${folder.name}</div>
                    <div class="folder-card-count">${photoCount} fotos</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 0.25rem;">Act: ${updateDate}</div>
                </div>
            `;
        });

        container.innerHTML = `
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
                📸 Carpetas de Fotos
            </h3>
            <div class="folder-grid">
                ${folderCardsHtml}
            </div>
        `;
    } else {
        // --- 2. Inner Folder Photos Gallery View ---
        const folder = folders.find(f => f.id === activeFolderId);
        if (!folder || folder.deleted) {
            activeFolderId = null;
            renderOfrendaFolders();
            return;
        }

        const activePhotos = folder.photos ? folder.photos.filter(p => !p.deleted) : [];

        let photosHtml = '';
        activePhotos.forEach(photo => {
            photosHtml += `
                <div class="photo-card" onclick="openLightbox('${photo.base64}')">
                    <button class="photo-delete-btn" title="Eliminar Foto" onclick="event.stopPropagation(); deletePhoto('${folder.id}', '${photo.id}')">
                        &times;
                    </button>
                    <img src="${photo.base64}" alt="Photo" loading="lazy" />
                </div>
            `;
        });

        if (activePhotos.length === 0) {
            photosHtml = `
                <div style="grid-column: span 12; text-align: center; padding: 3rem 1.5rem; color: var(--text-muted); font-style: italic;">
                    No hay fotos en esta carpeta. ¡Sube tu primera foto!
                </div>
            `;
        }

        container.innerHTML = `
            <div class="photo-gallery-header">
                <div>
                    <button class="btn btn-secondary btn-sm" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="goBackToFolders()">
                        ⬅ Volver
                    </button>
                    <h3 style="font-size: 1.15rem; font-weight: 700; margin-top: 0.75rem; color: var(--text-main); word-break: break-word;">
                        📁 ${folder.name}
                    </h3>
                </div>
                <button class="btn btn-primary btn-sm" style="padding: 0.5rem 1rem;" onclick="triggerPhotoUpload()">
                    📤 Subir Foto
                </button>
            </div>
            
            <div class="photo-grid">
                ${photosHtml}
            </div>
        `;
    }
}

// --- Folder Management ---
function openFolderModal() {
    document.getElementById('of-folder-name').value = '';
    document.getElementById('add-folder-modal').style.display = 'grid';
}

function closeFolderModal() {
    document.getElementById('add-folder-modal').style.display = 'none';
}

function createNewFolder() {
    const nameInput = document.getElementById('of-folder-name');
    const name = nameInput.value.trim();

    if (!name) {
        if (typeof Toast !== 'undefined') Toast.error("El nombre de la carpeta es obligatorio");
        return;
    }

    const folders = StorageService.get('ofrenda_folders', []);
    
    // Check duplicates
    const dup = folders.some(f => !f.deleted && f.name.toLowerCase() === name.toLowerCase());
    if (dup) {
        if (typeof Toast !== 'undefined') Toast.error("Ya existe una carpeta con ese nombre");
        return;
    }

    const newFolder = {
        id: generateFolderUUID(),
        name: name,
        photos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false
    };

    folders.push(newFolder);
    StorageService.set('ofrenda_folders', folders);
    closeFolderModal();
    renderOfrendaFolders();
    if (typeof Toast !== 'undefined') Toast.success("Carpeta creada correctamente");

    // Sync cloud
    if (typeof checkAutoSync !== 'undefined') checkAutoSync();
}

function deleteFolder(id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta carpeta y todas sus fotos?")) {
        const folders = StorageService.get('ofrenda_folders', []);
        const index = folders.findIndex(f => f.id === id);
        if (index !== -1) {
            folders[index].deleted = true;
            folders[index].updatedAt = new Date().toISOString();
            StorageService.set('ofrenda_folders', folders);
            
            if (activeFolderId === id) activeFolderId = null;
            renderOfrendaFolders();
            if (typeof Toast !== 'undefined') Toast.success("Carpeta eliminada");

            if (typeof checkAutoSync !== 'undefined') checkAutoSync();
        }
    }
}

function openFolder(id) {
    activeFolderId = id;
    renderOfrendaFolders();
}

// Global hook for goBackToFolders so HTML/other scripts can reference it
function goBackToFolders() {
    activeFolderId = null;
    renderOfrendaFolders();
}

// --- Photo Upload & Compression ---
function triggerPhotoUpload() {
    const fileInput = document.getElementById('upload-photo-input');
    if (fileInput) fileInput.click();
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset file input value
    const fileInput = event.target;
    
    if (typeof Toast !== 'undefined') Toast.info("Comprimiendo y subiendo imagen...");

    compressImage(file, function(base64Data) {
        const folders = StorageService.get('ofrenda_folders', []);
        const index = folders.findIndex(f => f.id === activeFolderId);
        
        if (index !== -1) {
            if (!folders[index].photos) folders[index].photos = [];
            
            const newPhoto = {
                id: generateFolderUUID(),
                base64: base64Data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deleted: false
            };
            
            folders[index].photos.push(newPhoto);
            folders[index].updatedAt = new Date().toISOString();
            
            StorageService.set('ofrenda_folders', folders);
            renderOfrendaFolders();
            
            if (typeof Toast !== 'undefined') Toast.success("Foto subida correctamente");
            
            if (typeof checkAutoSync !== 'undefined') checkAutoSync();
        } else {
            if (typeof Toast !== 'undefined') Toast.error("No se pudo cargar la carpeta");
        }
        fileInput.value = '';
    });
}

// Canvas-based image compression to maintain lightweight Base64 storage
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const max_size = 1024; // Limit dimensions to 1024px maximum

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

            // Compress to JPEG with 0.7 quality
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            callback(base64);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function deletePhoto(folderId, photoId) {
    if (confirm("¿Estás seguro de que quieres eliminar esta foto?")) {
        const folders = StorageService.get('ofrenda_folders', []);
        const index = folders.findIndex(f => f.id === folderId);
        
        if (index !== -1) {
            const photoIndex = folders[index].photos.findIndex(p => p.id === photoId);
            if (photoIndex !== -1) {
                folders[index].photos[photoIndex].deleted = true;
                folders[index].photos[photoIndex].updatedAt = new Date().toISOString();
                folders[index].updatedAt = new Date().toISOString();
                
                StorageService.set('ofrenda_folders', folders);
                renderOfrendaFolders();
                
                if (typeof Toast !== 'undefined') Toast.success("Foto eliminada");
                
                if (typeof checkAutoSync !== 'undefined') checkAutoSync();
            }
        }
    }
}

// --- Lightbox Methods ---
function openLightbox(src) {
    const lightbox = document.getElementById('photo-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.style.display = 'grid';
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('photo-lightbox');
    if (lightbox) {
        lightbox.style.display = 'none';
    }
}

// Initialize on Storage Updates
window.addEventListener('storage-updated', () => {
    // Only re-render if the ofrenda section is currently visible
    const section = document.getElementById('ofrenda-section');
    if (section && section.style.display !== 'none') {
        renderOfrendaFolders();
    }
});
