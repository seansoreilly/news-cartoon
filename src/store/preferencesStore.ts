import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPreferences } from '../types';

interface PreferencesState extends UserPreferences {
  setSortBy: (sortBy: 'popularity' | 'recency') => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setAutoGenerate: (autoGenerate: boolean) => void;
  reset: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  sortBy: 'popularity',
  autoGenerate: false,
};

export const usePreferencesStore = create<
  PreferencesState,
  [['zustand/persist', PreferencesState]]
>(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,

      setSortBy: (sortBy: 'popularity' | 'recency') => {
        set({ sortBy });
      },

      setTheme: (theme: 'light' | 'dark' | 'auto') => {
        set({ theme });
      },

      setAutoGenerate: (autoGenerate: boolean) => {
        set({ autoGenerate });
      },

      reset: () => {
        set(DEFAULT_PREFERENCES);
      },
    }),
    {
      name: 'preferences-storage',
    }
  )
);
