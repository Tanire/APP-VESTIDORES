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
      // triggerAutoSync removed to prevent loops.
      // Manual sync is now required in UI handlers.
      // if (!suppressAutoSync) { this.triggerAutoSync(); }
    } catch (e) {
      console.error(`Error saving ${key} to storage`, e);
    }
  },

  triggerAutoSync() {
    const token = localStorage.getItem("gh_token");
    const gistId = localStorage.getItem("gh_gist_id");
    if (!token || !gistId) return;

    // Debounce: Wait 3 seconds
    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    const indicator = document.getElementById("sync-indicator");
    if (indicator) {
      indicator.innerHTML =
        '<span style="color: #F59E0B;">●</span> Guardando...';
      indicator.style.opacity = "1";
    }

    this.syncTimeout = setTimeout(async () => {
      if (
        typeof SyncService !== "undefined" &&
        window.SyncService &&
        window.SyncService.syncWithCloud
      ) {
        // Use SMART SYNC (Merge) instead of simple update
        const success = await window.SyncService.syncWithCloud(token, gistId);

        if (indicator) {
          if (success) {
            indicator.innerHTML =
              '<span style="color: #10B981;">●</span> En línea';
            setTimeout(() => {
              indicator.style.opacity = "0.7";
            }, 2000);
          } else {
            indicator.innerHTML =
              '<span style="color: #EF4444;">●</span> Error al guardar';
          }
        }

        // If merge brought new data, refresh UI
        if (success) {
          window.dispatchEvent(new Event("storage-updated"));
        }
      }
    }, 3000);
  },

  // Helpers
  getEvents() {
    return this.get("calendar_events", []);
  },
  saveEvents(events, suppress = false) {
    this.set("calendar_events", events, suppress);
  },

  getExpenses() {
    return this.get("expenses", []);
  },
  saveExpenses(expenses, suppress = false) {
    this.set("expenses", expenses, suppress);
  },

  getRecurringBills() {
    return this.get("recurring_bills", []);
  },
  saveRecurringBills(bills, suppress = false) {
    this.set("recurring_bills", bills, suppress);
  },

  getTasks() {
    return this.get("household_tasks", []);
  },
  saveTasks(tasks, suppress = false) {
    this.set("household_tasks", tasks, suppress);
  },

  // Vestidores Feature
  getVestidores() {
    const list = this.get("vestidores_people", []);
    let modified = false;
    list.forEach(p => {
      // Migrate surname -> surname1 / surname2
      if (p.surname !== undefined && p.surname1 === undefined) {
        const parts = p.surname.trim().split(/\s+/);
        if (parts.length >= 2) {
          p.surname1 = parts[0];
          p.surname2 = parts.slice(1).join(' ');
        } else {
          p.surname1 = p.surname;
          p.surname2 = '';
        }
        modified = true;
      }
      
      // Migrate birthYear -> birthDate
      if (p.birthYear !== undefined && p.birthDate === undefined) {
        if (p.birthYear) {
          p.birthDate = p.birthYear + '-01-01';
        } else {
          p.birthDate = '';
        }
        modified = true;
      }

      // Normalize birthDate if stored in DD/MM/YYYY format
      if (p.birthDate && p.birthDate.includes('/')) {
        const parts = p.birthDate.split('/');
        if (parts.length === 3) {
          p.birthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          modified = true;
        }
      }

      // Migrate address -> addressStreet
      if (p.address !== undefined && p.addressStreet === undefined) {
        p.addressStreet = p.address;
        p.addressNum = '';
        p.zipCode = '';
        p.locality = '';
        modified = true;
      }

      // Initialize all new fields if undefined to prevent input binding issues
      if (p.name === undefined) { p.name = ''; modified = true; }
      if (p.surname1 === undefined) { p.surname1 = ''; modified = true; }
      if (p.surname2 === undefined) { p.surname2 = ''; modified = true; }
      if (p.dni === undefined) { p.dni = ''; modified = true; }
      if (p.birthPlace === undefined) { p.birthPlace = ''; modified = true; }
      if (p.birthDate === undefined) { p.birthDate = ''; modified = true; }
      if (p.addressStreet === undefined) { p.addressStreet = ''; modified = true; }
      if (p.addressNum === undefined) { p.addressNum = ''; modified = true; }
      if (p.zipCode === undefined) { p.zipCode = ''; modified = true; }
      if (p.locality === undefined) { p.locality = ''; modified = true; }
      if (p.phone === undefined) { p.phone = ''; modified = true; }
      if (p.email === undefined) { p.email = ''; modified = true; }
    });
    if (modified) {
      this.saveVestidores(list, true);
    }
    return list;
  },
  saveVestidores(list, suppress = false) {
    this.set("vestidores_people", list, suppress);
  },
};
