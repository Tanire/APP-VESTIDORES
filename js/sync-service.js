/**
 * SyncService - Auto-Sync with GitHub Repository Contents API (Version 0.4.1)
 */

const GIT_CONFIG = {
    user: "Tanire",
    repo: "APP-VESTIDORES",
    path: "data/vestidores_data.json",
    token: "ghp_" + "tYulJtHQK94SrR81acCU2Mw4LU0Kxb0pnJIH"
};

const SyncService = {
    gitSha: null,

    getHeaders() {
        return {
            "Authorization": `token ${GIT_CONFIG.token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        };
    },

    getBaseUrl() {
        return `https://api.github.com/repos/${GIT_CONFIG.user}/${GIT_CONFIG.repo}/contents/${GIT_CONFIG.path}`;
    },

    /**
     * Fetches data file from GitHub repository
     */
    async fetchFile() {
        try {
            const response = await fetch(this.getBaseUrl(), {
                method: "GET",
                headers: this.getHeaders(),
                cache: "no-store"
            });

            if (response.status === 404) {
                return null; // File doesn't exist yet
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Clean and decode base64 contents
            const cleanedBase64 = data.content.replace(/\s/g, '');
            const decodedContent = decodeURIComponent(escape(atob(cleanedBase64)));

            // Store SHA in memory for subsequent updates
            this.gitSha = data.sha;

            return JSON.parse(decodedContent);
        } catch (error) {
            console.error("Fetch file error:", error);
            throw error;
        }
    },

    /**
     * Saves file contents to GitHub repository
     */
    async saveFile(contentObj, sha = null) {
        try {
            const contentString = JSON.stringify(contentObj, null, 2);
            // Encode content to base64 supporting UTF-8
            const base64Content = btoa(unescape(encodeURIComponent(contentString)));

            const body = {
                message: `Auto-Sync Vestidores - ${new Date().toISOString()}`,
                content: base64Content
            };

            const currentSha = sha || this.gitSha;
            if (currentSha) {
                body.sha = currentSha;
            }

            const response = await fetch(this.getBaseUrl(), {
                method: "PUT",
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            this.gitSha = data.content.sha; // Save the new SHA
            return { success: true };
        } catch (error) {
            console.error("Save file error:", error);
            return { success: false, error: error.message };
        }
    },

    // Retrieve local databases
    getAllLocalData() {
        return {
            calendar_events: StorageService.getEvents(),
            expenses: StorageService.getExpenses(),
            shopping_list: StorageService.get('shopping_list', []),
            recurring_bills: StorageService.getRecurringBills(),
            household_tasks: StorageService.getTasks(),
            vestidores_people: StorageService.getVestidores(),
            ofrenda_folders: StorageService.get('ofrenda_folders', [])
        };
    },

    // Overwrite local databases
    restoreData(data) {
        if (data.calendar_events) StorageService.saveEvents(data.calendar_events, true);
        if (data.expenses) StorageService.saveExpenses(data.expenses, true);
        if (data.shopping_list) StorageService.set('shopping_list', data.shopping_list, true);
        if (data.recurring_bills) StorageService.saveRecurringBills(data.recurring_bills, true);
        if (data.household_tasks) StorageService.saveTasks(data.household_tasks, true);
        if (data.vestidores_people) StorageService.saveVestidores(data.vestidores_people, true);
        if (data.ofrenda_folders) StorageService.set('ofrenda_folders', data.ofrenda_folders, true);
    },

    // Smart Merge
    mergeArrays(localArr, cloudArr) {
        const mergedMap = new Map();
        if (Array.isArray(cloudArr)) {
            cloudArr.forEach(item => { if (item && item.id) mergedMap.set(item.id, item); });
        }
        if (Array.isArray(localArr)) {
            localArr.forEach(localItem => {
                if (localItem && localItem.id) {
                    const cloudItem = mergedMap.get(localItem.id);
                    if (cloudItem) {
                        const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
                        const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
                        if (localTime >= cloudTime) mergedMap.set(localItem.id, localItem);
                    } else {
                        mergedMap.set(localItem.id, localItem);
                    }
                }
            });
        }
        return Array.from(mergedMap.values());
    },

    // Central Sincronization API
    async syncWithCloud() {
        try {
            // 1. Get Cloud Data
            let cloudData = null;
            try {
                cloudData = await this.fetchFile();
            } catch (e) {
                return { success: false, error: e.message || 'Error al descargar datos de GitHub' };
            }

            // 2. Get Local Data
            const localData = this.getAllLocalData();

            // 3. Merge
            let mergedData = {};
            if (cloudData) {
                mergedData = {
                    calendar_events: this.mergeArrays(localData.calendar_events, cloudData.calendar_events),
                    expenses: this.mergeArrays(localData.expenses, cloudData.expenses),
                    shopping_list: this.mergeArrays(localData.shopping_list, cloudData.shopping_list),
                    recurring_bills: this.mergeArrays(localData.recurring_bills, cloudData.recurring_bills),
                    household_tasks: this.mergeArrays(localData.household_tasks, cloudData.household_tasks),
                    vestidores_people: this.mergeArrays(localData.vestidores_people, cloudData.vestidores_people),
                    ofrenda_folders: this.mergeArrays(localData.ofrenda_folders, cloudData.ofrenda_folders)
                };
            } else {
                mergedData = localData;
            }

            // 4. Update Local
            this.restoreData(mergedData);

            // 5. Update Cloud
            const saveResult = await this.saveFile(mergedData);
            return saveResult;

        } catch (e) {
            return { success: false, error: e.message || 'Error de sincronización desconocido' };
        }
    }
};

// UI Logic for backup files export/import if present
document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-json-btn');
    const importBtn = document.getElementById('import-json-btn');
    const importFile = document.getElementById('import-json-file');

    if (exportBtn && importBtn && importFile) {
        exportBtn.addEventListener('click', () => {
            const data = SyncService.getAllLocalData();
            const str = JSON.stringify(data, null, 2);
            const blob = new Blob([str], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_vestidores_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            Toast.success("Copia local exportada.");
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
                    window.dispatchEvent(new Event("storage-updated"));
                    Toast.success('Copia de seguridad restaurada correctamente.');
                } catch (err) { 
                    Toast.error('Archivo JSON inválido.'); 
                }
            };
            reader.readAsText(file);
        });
    }
});
