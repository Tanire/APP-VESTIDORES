/**
 * StorageService - Manejo centralizado de localStorage con Auto-Sync (SMART MERGE)
 */
const StorageService = {
  syncTimeout: null,

  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from storage`, e);
      return defaultValue;
    }
  },

  set(key, value, suppressAutoSync = false) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (!suppressAutoSync) {
        this.triggerAutoSync();
      }
    } catch (e) {
      console.error(`Error saving ${key} to storage`, e);
    }
  },

  triggerAutoSync() {
    const token = localStorage.getItem('gh_token');
    const gistId = localStorage.getItem('gh_gist_id');
    if (!token || !gistId) return;

    // Debounce: Wait 3 seconds
    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
      indicator.innerHTML = '<span style="color: #F59E0B;">●</span> Guardando...';
      indicator.style.opacity = '1';
    }

    this.syncTimeout = setTimeout(async () => {
      if (typeof SyncService !== 'undefined' && window.SyncService && window.SyncService.syncWithCloud) {
        // Use SMART SYNC (Merge) instead of simple update
        const success = await window.SyncService.syncWithCloud(token, gistId);

        if (indicator) {
          if (success) {
            indicator.innerHTML = '<span style="color: #10B981;">●</span> En línea';
            setTimeout(() => { indicator.style.opacity = '0.7'; }, 2000);
          } else {
            indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error al guardar';
          }
        }

        // If merge brought new data, refresh UI
        if (success) {
          window.dispatchEvent(new Event('storage-updated'));
        }
      }
    }, 3000);
  },

  // Helpers
  getEvents() { return this.get('calendar_events', []); },
  saveEvents(events, suppress = false) { this.set('calendar_events', events, suppress); },

  getExpenses() { return this.get('expenses', []); },
  saveExpenses(expenses, suppress = false) { this.set('expenses', expenses, suppress); },

  getRecurringBills() { return this.get('recurring_bills', []); },
  saveRecurringBills(bills, suppress = false) { this.set('recurring_bills', bills, suppress); }
};
