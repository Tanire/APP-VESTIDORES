const SyncService = {
    async createGist(token) {
        const data = {
            description: "Casa Mocholí Data - Sync",
            public: false,
            files: {
                "family_data.json": {
                    content: JSON.stringify(this.getAllLocalData())
                }
            }
        };

        try {
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Error creando Gist');
            const json = await response.json();
            return json.id;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async updateGist(token, gistId) {
        const data = {
            files: {
                "family_data.json": {
                    content: JSON.stringify(this.getAllLocalData())
                }
            }
        };

        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    async getGist(token, gistId) {
        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (!response.ok) throw new Error('Error leyendo Gist');
            const json = await response.json();
            const content = json.files["family_data.json"].content;
            return JSON.parse(content);
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    getAllLocalData() {
        return {
            calendar_events: StorageService.getEvents(),
            expenses: StorageService.getExpenses(),
            shopping_list: StorageService.get('shopping_list', [])
        };
    },

    restoreData(data) {
        if (data.calendar_events) StorageService.saveEvents(data.calendar_events);
        if (data.expenses) StorageService.saveExpenses(data.expenses);
        if (data.shopping_list) StorageService.set('shopping_list', data.shopping_list);
    }
};

// UI Logic for Settings Page
document.addEventListener('DOMContentLoaded', () => {
    // Only run if elements exist (we are on settings page)
    const tokenInput = document.getElementById('gh-token');
    const gistIdInput = document.getElementById('gh-gist-id');
    const saveBtn = document.getElementById('save-config-btn');
    const uploadBtn = document.getElementById('sync-upload-btn');
    const downloadBtn = document.getElementById('sync-download-btn');
    const statusDiv = document.getElementById('sync-status');

    // Config Local
    const exportBtn = document.getElementById('export-json-btn');
    const importBtn = document.getElementById('import-json-btn');
    const importFile = document.getElementById('import-json-file');

    if (!tokenInput) return; // Not on settings page

    // Load saved config
    tokenInput.value = localStorage.getItem('gh_token') || '';
    gistIdInput.value = localStorage.getItem('gh_gist_id') || '';

    function showStatus(msg, color = 'var(--text-main)') {
        statusDiv.textContent = msg;
        statusDiv.style.color = color;
        setTimeout(() => { statusDiv.textContent = ''; }, 3000);
    }

    saveBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        const gistId = gistIdInput.value.trim();

        if (token) localStorage.setItem('gh_token', token);
        if (gistId) localStorage.setItem('gh_gist_id', gistId);

        showStatus('Configuración guardada', 'var(--secondary)');
    });

    uploadBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('gh_token');
        let gistId = localStorage.getItem('gh_gist_id');

        if (!token) {
            alert('Falta el Token de GitHub');
            return;
        }

        statusDiv.textContent = 'Subiendo...';

        if (!gistId) {
            // Create new
            const newId = await SyncService.createGist(token);
            if (newId) {
                localStorage.setItem('gh_gist_id', newId);
                gistIdInput.value = newId;
                showStatus('¡Sync Creado y Subido!', 'var(--secondary)');
            } else {
                showStatus('Error creando Gist', 'var(--danger)');
            }
        } else {
            // Update
            const success = await SyncService.updateGist(token, gistId);
            if (success) showStatus('Datos actualizados en Nube', 'var(--secondary)');
            else showStatus('Error subiendo datos', 'var(--danger)');
        }
    });

    downloadBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('gh_token');
        const gistId = localStorage.getItem('gh_gist_id');

        if (!token || !gistId) {
            alert('Falta Token o ID de Gist');
            return;
        }

        statusDiv.textContent = 'Descargando...';
        const data = await SyncService.getGist(token, gistId);

        if (data) {
            SyncService.restoreData(data);
            showStatus('Datos restaurados correctamente', 'var(--secondary)');
        } else {
            showStatus('Error descargando datos', 'var(--danger)');
        }
    });

    // Local Export/Import
    exportBtn.addEventListener('click', () => {
        const data = SyncService.getAllLocalData();
        const str = JSON.stringify(data, null, 2);
        const blob = new Blob([str], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_familia_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    importBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                SyncService.restoreData(data);
                alert('Copia de seguridad restaurada');
            } catch (err) {
                alert('Archivo JSON inválido');
            }
        };
        reader.readAsText(file);
    });
});
