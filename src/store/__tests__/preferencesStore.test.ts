import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePreferencesStore } from '../preferencesStore';

describe('preferencesStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => usePreferencesStore());
    act(() => {
      result.current.reset();
    });
    // Clear localStorage
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with default preferences', () => {
      const { result } = renderHook(() => usePreferencesStore());

      expect(result.current.theme).toBe('auto');
      expect(result.current.sortBy).toBe('popularity');
      expect(result.current.autoGenerate).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should change theme to light', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
    });

    it('should change theme to dark', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should change theme to auto', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.setTheme('auto');
      });

      expect(result.current.theme).toBe('auto');
    });

    it('should support theme switching multiple times', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });
  });

  describe('setSortBy', () => {
    it('should change sort preference to recency', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setSortBy('recency');
      });

      expect(result.current.sortBy).toBe('recency');
    });

    it('should change sort preference to popularity', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setSortBy('recency');
      });

      expect(result.current.sortBy).toBe('recency');

      act(() => {
        result.current.setSortBy('popularity');
      });

      expect(result.current.sortBy).toBe('popularity');
    });

    it('should start with popularity as default', () => {
      const { result } = renderHook(() => usePreferencesStore());

      expect(result.current.sortBy).toBe('popularity');
    });
  });

  describe('setAutoGenerate', () => {
    it('should enable auto-generate', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setAutoGenerate(true);
      });

      expect(result.current.autoGenerate).toBe(true);
    });

    it('should disable auto-generate', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setAutoGenerate(true);
      });

      expect(result.current.autoGenerate).toBe(true);

      act(() => {
        result.current.setAutoGenerate(false);
      });

      expect(result.current.autoGenerate).toBe(false);
    });

    it('should start with auto-generate disabled', () => {
      const { result } = renderHook(() => usePreferencesStore());

      expect(result.current.autoGenerate).toBe(false);
    });

    it('should toggle auto-generate multiple times', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setAutoGenerate(true);
      });

      expect(result.current.autoGenerate).toBe(true);

      act(() => {
        result.current.setAutoGenerate(false);
      });

      expect(result.current.autoGenerate).toBe(false);

      act(() => {
        result.current.setAutoGenerate(true);
      });

      expect(result.current.autoGenerate).toBe(true);
    });
  });

  describe('Independent Preference Changes', () => {
    it('should change theme without affecting other preferences', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.sortBy).toBe('popularity');
      expect(result.current.autoGenerate).toBe(false);
    });

    it('should change sort without affecting other preferences', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setSortBy('recency');
      });

      expect(result.current.theme).toBe('auto');
      expect(result.current.sortBy).toBe('recency');
      expect(result.current.autoGenerate).toBe(false);
    });

    it('should change auto-generate without affecting other preferences', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setAutoGenerate(true);
      });

      expect(result.current.theme).toBe('auto');
      expect(result.current.sortBy).toBe('popularity');
      expect(result.current.autoGenerate).toBe(true);
    });
  });

  describe('Combined Preference Changes', () => {
    it('should handle multiple preference changes together', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setTheme('dark');
        result.current.setSortBy('recency');
        result.current.setAutoGenerate(true);
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.sortBy).toBe('recency');
      expect(result.current.autoGenerate).toBe(true);
    });

    it('should handle sequential preference changes', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.setSortBy('recency');
      });

      expect(result.current.sortBy).toBe('recency');
      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.setAutoGenerate(true);
      });

      expect(result.current.autoGenerate).toBe(true);
      expect(result.current.theme).toBe('light');
      expect(result.current.sortBy).toBe('recency');
    });
  });

  describe('reset', () => {
    it('should reset all preferences to defaults', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setTheme('dark');
        result.current.setSortBy('recency');
        result.current.setAutoGenerate(true);
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.sortBy).toBe('recency');
      expect(result.current.autoGenerate).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.theme).toBe('auto');
      expect(result.current.sortBy).toBe('popularity');
      expect(result.current.autoGenerate).toBe(false);
    });

    it('should be idempotent', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.reset();
        result.current.reset();
      });

      expect(result.current.theme).toBe('auto');
      expect(result.current.sortBy).toBe('popularity');
      expect(result.current.autoGenerate).toBe(false);
    });

    it('should reset preferences even after multiple changes', () => {
      const { result } = renderHook(() => usePreferencesStore());

      // Make many changes
      act(() => {
        result.current.setTheme('dark');
        result.current.setSortBy('recency');
        result.current.setAutoGenerate(true);
        result.current.setTheme('light');
        result.current.setSortBy('popularity');
        result.current.setAutoGenerate(false);
        result.current.setTheme('auto');
      });

      // Reset to defaults
      act(() => {
        result.current.reset();
      });

      // Verify all are defaults
      expect(result.current.theme).toBe('auto');
      expect(result.current.sortBy).toBe('popularity');
      expect(result.current.autoGenerate).toBe(false);
    });

    it('should allow changes after reset', () => {
      const { result } = renderHook(() => usePreferencesStore());

      act(() => {
        result.current.setTheme('dark');
        result.current.setSortBy('recency');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.theme).toBe('auto');

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.sortBy).toBe('popularity');
      expect(result.current.autoGenerate).toBe(false);
    });
  });

  describe('Complex Workflows', () => {
    it('should handle user preference journey', () => {
      const { result } = renderHook(() => usePreferencesStore());

      // User first sets theme preference
      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');

      // Then adjusts sorting
      act(() => {
        result.current.setSortBy('recency');
      });

      expect(result.current.sortBy).toBe('recency');
      expect(result.current.theme).toBe('dark');

      // Then enables auto-generate
      act(() => {
        result.current.setAutoGenerate(true);
      });

      expect(result.current.autoGenerate).toBe(true);

      // User changes mind about theme
      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.sortBy).toBe('recency');
      expect(result.current.autoGenerate).toBe(true);
    });
  });
});
