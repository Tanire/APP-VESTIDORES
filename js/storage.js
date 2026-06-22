/**
 * StorageService - Manejo centralizado de localStorage con Auto-Sync (SMART MERGE)
 */

// Normalizador universal de fechas a YYYY-MM-DD
window.normalizeDateToYMD = function(val) {
  if (!val) return '';
  val = val.toString().trim();
  if (!val) return '';

  // 1. Número de serie de Excel (ej: 32827)
  if (/^\d+(\.\d+)?$/.test(val)) {
    const serial = parseFloat(val);
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    
    const year = date_info.getFullYear();
    let month = (date_info.getMonth() + 1).toString().padStart(2, '0');
    let day = date_info.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. Formatos con separadores: / o - o .
  const parts = val.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const p0 = parts[0].trim();
    const p1 = parts[1].trim();
    const p2 = parts[2].trim();

    if (p0.length === 4) {
      // YYYY-MM-DD (ej: 1980/08/15 o 1980-08-15)
      return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
    } else if (p2.length === 4) {
      // DD-MM-YYYY (ej: 15/08/1980 o 15-08-1980)
      return `${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
    } else if (p2.length === 2) {
      // DD-MM-YY (ej: 15/08/80 o 15-08-80)
      let year = parseInt(p2);
      year = year > 30 ? 1900 + year : 2000 + year;
      return `${year}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
    }
  }

  // 3. Fallback a parse nativo de Date
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}

  return '';
};

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

      // Normalize birthDate using universal normalizer
      if (p.birthDate) {
        const normalized = window.normalizeDateToYMD(p.birthDate);
        if (p.birthDate !== normalized) {
          p.birthDate = normalized;
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
      if (p.photo === undefined) { p.photo = ''; modified = true; }
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
