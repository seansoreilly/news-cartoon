import type { LocationData } from '../types/location';
import type { CartoonConcept } from '../types/cartoon';

const STORAGE_KEYS = {
  LOCATION: 'cartoon-app-location',
  NEWS: 'cartoon-app-news',
  CONCEPTS: 'cartoon-app-concepts',
  SELECTED_CONCEPT: 'cartoon-app-selected-concept',
  GENERATED_IMAGE: 'cartoon-app-generated-image',
  HISTORY: 'cartoon-app-history',
  PREFERENCES: 'cartoon-app-preferences',
};

// Generic storage functions
const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage: ${key}`, error);
  }
};

const getFromStorage = <T>(key: string): T | null => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error reading from localStorage: ${key}`, error);
    return null;
  }
};

const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage: ${key}`, error);
  }
};

// Specific storage functions
export const saveLocation = (location: LocationData): void => {
  saveToStorage(STORAGE_KEYS.LOCATION, location);
};

export const getLocation = (): LocationData | null => {
  return getFromStorage<LocationData>(STORAGE_KEYS.LOCATION);
};

export const saveNews = (news: any): void => {
  saveToStorage(STORAGE_KEYS.NEWS, news);
};

export const getNews = (): any | null => {
  return getFromStorage<any>(STORAGE_KEYS.NEWS);
};

export const saveCartoon = (cartoon: any): void => {
  saveToStorage(STORAGE_KEYS.CONCEPTS, cartoon);
};

export const getCartoon = (): any | null => {
  return getFromStorage<any>(STORAGE_KEYS.CONCEPTS);
};

export const saveSelectedConcept = (concept: CartoonConcept): void => {
  saveToStorage(STORAGE_KEYS.SELECTED_CONCEPT, concept);
};

export const getSelectedConcept = (): CartoonConcept | null => {
  return getFromStorage<CartoonConcept>(STORAGE_KEYS.SELECTED_CONCEPT);
};

export const saveGeneratedImage = (imageUrl: string): void => {
  saveToStorage(STORAGE_KEYS.GENERATED_IMAGE, imageUrl);
};

export const getGeneratedImage = (): string | null => {
  return getFromStorage<string>(STORAGE_KEYS.GENERATED_IMAGE);
};

export const addToHistory = (item: any): void => {
  const history = getFromStorage<any[]>(STORAGE_KEYS.HISTORY) || [];
  history.unshift({
    ...item,
    id: Date.now().toString(),
    timestamp: Date.now(),
  });
  saveToStorage(STORAGE_KEYS.HISTORY, history.slice(0, 50));
};

export const getHistory = (): any[] => {
  return getFromStorage<any[]>(STORAGE_KEYS.HISTORY) || [];
};

export const clearHistory = (): void => {
  removeFromStorage(STORAGE_KEYS.HISTORY);
};

export const savePreferences = (preferences: any): void => {
  saveToStorage(STORAGE_KEYS.PREFERENCES, preferences);
};

export const getPreferences = (): any | null => {
  return getFromStorage<any>(STORAGE_KEYS.PREFERENCES);
};

export const clearSession = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeFromStorage(key);
  });
};
