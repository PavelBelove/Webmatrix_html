export class Storage {
  constructor(namespace) {
    if (!namespace) {
      throw new Error('Storage namespace is required');
    }
    this.namespace = namespace;
    
    // Проверяем доступность localStorage
    try {
      const testKey = `${this.namespace}:test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.isAvailable = true;
    } catch (e) {
      console.warn(`LocalStorage is not available for namespace ${namespace}:`, e);
      this.isAvailable = false;
    }
  }

  // Основные методы для работы с данными
  get(key) {
    if (!this.isAvailable) {
      console.warn('LocalStorage is not available, returning null');
      return null;
    }

    try {
      const data = localStorage.getItem(`${this.namespace}:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  }

  set(key, value) {
    if (!this.isAvailable) {
      console.warn('LocalStorage is not available, skipping save');
      return;
    }

    try {
      localStorage.setItem(`${this.namespace}:${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
    }
  }

  getAll() {
    if (!this.isAvailable) {
      console.warn('LocalStorage is not available, returning empty object');
      return {};
    }

    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith(`${this.namespace}:`))
        .reduce((acc, key) => {
          const shortKey = key.replace(`${this.namespace}:`, '');
          acc[shortKey] = JSON.parse(localStorage.getItem(key));
          return acc;
        }, {});
    } catch (error) {
      console.error('Error getting all items from storage:', error);
      return {};
    }
  }

  remove(key) {
    if (!this.isAvailable) {
      console.warn('LocalStorage is not available, skipping remove');
      return;
    }

    try {
      localStorage.removeItem(`${this.namespace}:${key}`);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  }

  clear() {
    if (!this.isAvailable) {
      console.warn('LocalStorage is not available, skipping clear');
      return;
    }

    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(`${this.namespace}:`))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

// Создаем экземпляры для разных типов данных
export const settingsStorage = new Storage('settings');
export const presetsStorage = new Storage('presets');
export const chatStorage = new Storage('chat');
