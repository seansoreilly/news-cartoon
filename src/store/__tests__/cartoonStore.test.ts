import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCartoonStore } from '../cartoonStore';
import type { CartoonData, ComicScript } from '../../types';

describe('cartoonStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useCartoonStore());
    act(() => {
      result.current.clearCartoon();
    });
  });

  describe('Initial State', () => {
    it('should initialize with null values and no loading/error', () => {
      const { result } = renderHook(() => useCartoonStore());

      expect(result.current.cartoon).toBeNull();
      expect(result.current.comicPrompt).toBeNull();
      expect(result.current.imagePath).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setCartoon', () => {
    it('should set cartoon data and clear error', () => {
      const { result } = renderHook(() => useCartoonStore());
      const mockCartoon: CartoonData = {
        topic: 'Political Satire',
        location: 'New York',
        ideas: [
          {
            title: 'Concept 1',
            premise: 'A funny premise',
            why_funny: 'It is humorous',
            location: 'New York',
          },
        ],
        ranking: ['Concept 1'],
        winner: 'Concept 1',
        generatedAt: Date.now(),
      };

      act(() => {
        result.current.setCartoon(mockCartoon);
      });

      expect(result.current.cartoon).toEqual(mockCartoon);
      expect(result.current.error).toBeNull();
    });

    it('should replace previous cartoon', () => {
      const { result } = renderHook(() => useCartoonStore());
      const cartoon1: CartoonData = {
        topic: 'First Topic',
        location: 'Location 1',
        ideas: [{ title: 'Idea 1', premise: 'Premise 1', why_funny: 'Funny 1', location: 'Location 1' }],
        ranking: ['Idea 1'],
        winner: 'Idea 1',
        generatedAt: Date.now(),
      };

      const cartoon2: CartoonData = {
        topic: 'Second Topic',
        location: 'Location 2',
        ideas: [{ title: 'Idea 2', premise: 'Premise 2', why_funny: 'Funny 2', location: 'Location 2' }],
        ranking: ['Idea 2'],
        winner: 'Idea 2',
        generatedAt: Date.now(),
      };

      act(() => {
        result.current.setCartoon(cartoon1);
      });

      expect(result.current.cartoon?.topic).toBe('First Topic');

      act(() => {
        result.current.setCartoon(cartoon2);
      });

      expect(result.current.cartoon?.topic).toBe('Second Topic');
    });
  });

  describe('setComicPrompt', () => {
    it('should set comic script data', () => {
      const { result } = renderHook(() => useCartoonStore());
      const mockScript: ComicScript = {
        panels: [
          { panelNumber: 1, description: 'Panel 1 description' },
          { panelNumber: 2, description: 'Panel 2 description' },
        ],
        description: 'Comic script description',
        generatedAt: Date.now(),
      };

      act(() => {
        result.current.setComicPrompt(mockScript);
      });

      expect(result.current.comicPrompt).toEqual(mockScript);
    });

    it('should handle empty comic script', () => {
      const { result } = renderHook(() => useCartoonStore());
      const emptyScript: ComicScript = {
        panels: [],
        description: 'Empty script',
        generatedAt: Date.now(),
      };

      act(() => {
        result.current.setComicPrompt(emptyScript);
      });

      expect(result.current.comicPrompt?.panels).toHaveLength(0);
    });

    it('should replace previous comic script', () => {
      const { result } = renderHook(() => useCartoonStore());
      const script1: ComicScript = {
        panels: [{ panelNumber: 1, description: 'First script' }],
        description: 'First description',
        generatedAt: Date.now(),
      };

      const script2: ComicScript = {
        panels: [{ panelNumber: 1, description: 'Second script' }],
        description: 'Second description',
        generatedAt: Date.now(),
      };

      act(() => {
        result.current.setComicPrompt(script1);
      });

      expect((result.current.comicPrompt?.panels[0] as any)?.description).toBe('First script');

      act(() => {
        result.current.setComicPrompt(script2);
      });

      expect((result.current.comicPrompt?.panels[0] as any)?.description).toBe('Second script');
    });
  });

  describe('setImagePath', () => {
    it('should set image path', () => {
      const { result } = renderHook(() => useCartoonStore());
      const imagePath = 'data:image/png;base64,iVBORw0KGgoAAAANS...';

      act(() => {
        result.current.setImagePath(imagePath);
      });

      expect(result.current.imagePath).toBe(imagePath);
    });

    it('should replace previous image path', () => {
      const { result } = renderHook(() => useCartoonStore());

      act(() => {
        result.current.setImagePath('/image1.png');
      });

      expect(result.current.imagePath).toBe('/image1.png');

      act(() => {
        result.current.setImagePath('/image2.png');
      });

      expect(result.current.imagePath).toBe('/image2.png');
    });

    it('should handle empty string image path', () => {
      const { result } = renderHook(() => useCartoonStore());

      act(() => {
        result.current.setImagePath('');
      });

      expect(result.current.imagePath).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useCartoonStore());
      const errorMessage = 'Failed to generate cartoon';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should clear error with null', () => {
      const { result } = renderHook(() => useCartoonStore());

      act(() => {
        result.current.setError('Error message');
      });

      expect(result.current.error).toBe('Error message');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear error when setting cartoon', () => {
      const { result } = renderHook(() => useCartoonStore());

      act(() => {
        result.current.setError('Previous error');
      });

      const cartoon: CartoonData = {
        topic: 'Topic',
        location: 'Location',
        ideas: [],
        ranking: [],
        winner: 'Winner',
        generatedAt: Date.now(),
      };

      act(() => {
        result.current.setCartoon(cartoon);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should set and clear loading state', () => {
      const { result } = renderHook(() => useCartoonStore());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('clearCartoon', () => {
    it('should clear all cartoon data and error', () => {
      const { result } = renderHook(() => useCartoonStore());
      const cartoon: CartoonData = {
        topic: 'Topic',
        location: 'Location',
        ideas: [{ title: 'Idea', premise: 'Premise', why_funny: 'Funny', location: 'Location' }],
        ranking: ['Idea'],
        winner: 'Idea',
        generatedAt: Date.now(),
      };

      const script: ComicScript = {
        panels: [{ panelNumber: 1, description: 'Panel 1' }],
        description: 'Script description',
        generatedAt: Date.now(),
      };

      act(() => {
        result.current.setCartoon(cartoon);
        result.current.setComicPrompt(script);
        result.current.setImagePath('/image.png');
        result.current.setError('Some error');
      });

      expect(result.current.cartoon).not.toBeNull();
      expect(result.current.comicPrompt).not.toBeNull();
      expect(result.current.imagePath).not.toBeNull();
      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearCartoon();
      });

      expect(result.current.cartoon).toBeNull();
      expect(result.current.comicPrompt).toBeNull();
      expect(result.current.imagePath).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should be idempotent', () => {
      const { result } = renderHook(() => useCartoonStore());

      act(() => {
        result.current.clearCartoon();
        result.current.clearCartoon();
      });

      expect(result.current.cartoon).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Combined Operations', () => {
    it('should handle full cartoon generation flow', () => {
      const { result } = renderHook(() => useCartoonStore());
      const cartoon: CartoonData = {
        topic: 'News Topic',
        location: 'Location',
        ideas: [{ title: 'Idea 1', premise: 'Premise 1', why_funny: 'Funny 1', location: 'Location' }],
        ranking: ['Idea 1'],
        winner: 'Idea 1',
        generatedAt: Date.now(),
      };

      const script: ComicScript = {
        panels: [
          { panelNumber: 1, description: 'Setup' },
          { panelNumber: 2, description: 'Punchline' },
        ],
        description: 'Comic script',
        generatedAt: Date.now(),
      };

      const imagePath = '/generated-image.png';

      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setCartoon(cartoon);
        result.current.setComicPrompt(script);
        result.current.setImagePath(imagePath);
        result.current.setLoading(false);
      });

      expect(result.current.cartoon?.topic).toBe('News Topic');
      expect(result.current.comicPrompt?.panels).toHaveLength(2);
      expect(result.current.imagePath).toBe(imagePath);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle error in the middle of operations', () => {
      const { result } = renderHook(() => useCartoonStore());

      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setError('Generation failed');
        result.current.setLoading(false);
      });

      expect(result.current.cartoon).toBeNull();
      expect(result.current.error).toBe('Generation failed');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
