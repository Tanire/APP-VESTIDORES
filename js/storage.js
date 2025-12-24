/**
 * StorageService - Manejo centralizado de localStorage
 */
const StorageService = {
  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from storage`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to storage`, e);
    }
  },

  // Helpers específicos
  getEvents() {
    return this.get('calendar_events', []);
  },

  saveEvents(events) {
    this.set('calendar_events', events);
  },

  getExpenses() {
    return this.get('expenses', []);
  },

  saveExpenses(expenses) {
    this.set('expenses', expenses);
  }
};
