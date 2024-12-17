export class Storage {
  constructor(namespace) {
    if (!namespace) {
      throw new Error('Storage namespace is required');
    }
    this.namespace = namespace;
  }

  // Основные методы для работы с данными
  get(key) {
    try {
      const data = localStorage.getItem(`${this.namespace}:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(`${this.namespace}:${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
    }
  }

  getAll() {
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
    try {
      localStorage.removeItem(`${this.namespace}:${key}`);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  }

  clear() {
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
