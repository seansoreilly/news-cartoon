import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPreferences } from '../types';

interface PreferencesState extends UserPreferences {
  setSortBy: (sortBy: 'popularity' | 'recency') => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setAutoGenerate: (autoGenerate: boolean) => void;
  setAutoRefresh: (autoRefresh: boolean) => void;
  setNewsCount: (newsCount: number) => void;
  reset: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  sortBy: 'popularity',
  autoGenerate: false,
  autoRefresh: false,
  newsCount: 5,
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

      setAutoRefresh: (autoRefresh: boolean) => {
        set({ autoRefresh });
      },

      setNewsCount: (newsCount: number) => {
        set({ newsCount });
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
