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

// --- IndexedDB Helper Helpers ---
const DB_NAME = 'app_vestidores_db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function idbGetAll() {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const result = {};
      const request = store.openCursor();
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          result[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      request.onerror = () => reject(request.error);
    });
  });
}

function idbSet(key, value) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

// --- Symmetric Encryption Helpers (RC4) ---
function rc4(key, str) {
  var s = [], j = 0, x, res = '';
  for (var i = 0; i < 256; i++) {
    s[i] = i;
  }
  for (i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
  }
  i = 0; j = 0;
  for (var y = 0; y < str.length; y++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
    res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
  }
  return res;
}

function encryptString(str, key) {
  if (!str) return '';
  const utf8Str = unescape(encodeURIComponent(str));
  const encrypted = rc4(key, utf8Str);
  let hex = '';
  for (let i = 0; i < encrypted.length; i++) {
    hex += encrypted.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

function decryptString(hex, key) {
  if (!hex) return '';
  let encrypted = '';
  for (let i = 0; i < hex.length; i += 2) {
    encrypted += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  const decryptedUtf8 = rc4(key, encrypted);
  try {
    return decodeURIComponent(escape(decryptedUtf8));
  } catch (e) {
    return decryptedUtf8;
  }
}

const SENSITIVE_FIELDS = ['dni', 'phone', 'email', 'birthPlace', 'birthDate', 'addressStreet', 'addressNum', 'zipCode', 'locality', 'admissionYear'];

function encryptPerson(person, key) {
  if (!key) return person;
  const sensitiveObj = {};
  let hasSensitiveData = false;

  SENSITIVE_FIELDS.forEach(field => {
    if (person[field] !== undefined && person[field] !== null && person[field] !== '') {
      sensitiveObj[field] = person[field];
      hasSensitiveData = true;
    }
  });

  if (!hasSensitiveData) return person;

  const cleanPerson = { ...person };
  SENSITIVE_FIELDS.forEach(field => {
    cleanPerson[field] = '';
  });

  const encryptedStr = encryptString(JSON.stringify(sensitiveObj), key);
  cleanPerson.encryptedData = encryptedStr;
  return cleanPerson;
}

function decryptPerson(person, key) {
  if (!person.encryptedData || !key) return person;
  try {
    const decryptedStr = decryptString(person.encryptedData, key);
    if (!decryptedStr) return person;
    const sensitiveObj = JSON.parse(decryptedStr);
    const restoredPerson = { ...person };
    Object.keys(sensitiveObj).forEach(field => {
      restoredPerson[field] = sensitiveObj[field];
    });
    return restoredPerson;
  } catch (e) {
    console.error("Error decrypting person:", e);
    return person;
  }
}

const StorageService = {
  syncTimeout: null,
  cache: {},
  initialized: false,

  async init() {
    if (this.initialized) return;
    try {
      const idbData = await idbGetAll();
      this.cache = idbData || {};

      // Migration from localStorage for primary tables
      const keysToMigrate = [
        "vestidores_people",
        "ofrenda_folders",
        "calendar_events",
        "expenses",
        "shopping_list",
        "recurring_bills",
        "household_tasks"
      ];

      let migrated = false;
      for (const key of keysToMigrate) {
        if (this.cache[key] === undefined) {
          const localVal = localStorage.getItem(key);
          if (localVal !== null) {
            try {
              const parsed = JSON.parse(localVal);
              this.cache[key] = parsed;
              await idbSet(key, parsed);
              localStorage.removeItem(key);
              migrated = true;
            } catch (e) {
              console.error(`Migration error for ${key}:`, e);
            }
          }
        }
      }
      this.initialized = true;
      console.log("StorageService: IndexedDB cache loaded successfully.");
    } catch (e) {
      console.error("StorageService IndexedDB init error:", e);
      this.cache = {};
      this.initialized = true; // Mark true to avoid loop, fallback to memory
    }
  },

  get(key, defaultValue) {
    if (this.cache && this.cache[key] !== undefined) {
      return this.cache[key];
    }
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (this.cache) this.cache[key] = parsed;
        return parsed;
      }
    } catch (e) {}
    return defaultValue;
  },

  set(key, value, suppressAutoSync = false) {
    if (!this.cache) this.cache = {};
    this.cache[key] = value;

    idbSet(key, value).catch(e => {
      console.error(`IndexedDB write error for ${key}:`, e);
    });

    const isLargeData = ["vestidores_people", "ofrenda_folders"].includes(key);
    if (!isLargeData) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }
  },

  triggerAutoSync() {
    const token = localStorage.getItem("gh_token");
    const gistId = localStorage.getItem("gh_gist_id");
    if (!token || !gistId) return;

    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    const indicator = document.getElementById("sync-indicator");
    if (indicator) {
      indicator.innerHTML = '<span style="color: #F59E0B;">●</span> Guardando...';
      indicator.style.opacity = "1";
    }

    this.syncTimeout = setTimeout(async () => {
      if (
        typeof SyncService !== "undefined" &&
        window.SyncService &&
        window.SyncService.syncWithCloud
      ) {
        const success = await window.SyncService.syncWithCloud(token, gistId);
        if (indicator) {
          if (success) {
            indicator.innerHTML = '<span style="color: #10B981;">●</span> En línea';
            setTimeout(() => {
              indicator.style.opacity = "0.7";
            }, 2000);
          } else {
            indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error al guardar';
          }
        }
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

    // Client-side decryption pass if authorized
    const key = localStorage.getItem('security_code');
    const decryptedList = list.map(p => {
      if (p.encryptedData && key === '250925') {
        return decryptPerson(p, key);
      }
      return p;
    });

    return decryptedList;
  },

  saveVestidores(list, suppress = false) {
    const key = localStorage.getItem('security_code');
    const encryptedList = list.map(p => {
      if (key === '250925') {
        return encryptPerson(p, key);
      }
      return p;
    });
    this.set("vestidores_people", encryptedList, suppress);
  },
};

