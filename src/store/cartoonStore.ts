import { create } from 'zustand';
import type { CartoonData, ComicScript } from '../types';

interface CartoonState {
  cartoon: CartoonData | null;
  comicPrompt: ComicScript | null;
  imagePath: string | null;
  selectedConceptIndex: number | null;
  isLoading: boolean;
  error: string | null;
  setCartoon: (cartoon: CartoonData) => void;
  setComicPrompt: (prompt: ComicScript) => void;
  setImagePath: (path: string) => void;
  setSelectedConceptIndex: (index: number) => void;
  clearCartoon: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCartoonStore = create<CartoonState>((set) => ({
  cartoon: null,
  comicPrompt: null,
  imagePath: null,
  selectedConceptIndex: null,
  isLoading: false,
  error: null,

  setCartoon: (cartoon: CartoonData) => {
    set({ cartoon, error: null, selectedConceptIndex: null });
  },

  setComicPrompt: (comicPrompt: ComicScript) => {
    set({ comicPrompt });
  },

  setImagePath: (imagePath: string) => {
    set({ imagePath });
  },

  setSelectedConceptIndex: (selectedConceptIndex: number) => {
    set({ selectedConceptIndex, imagePath: null, comicPrompt: null });
  },

  clearCartoon: () => {
    set({
      cartoon: null,
      comicPrompt: null,
      imagePath: null,
      selectedConceptIndex: null,
      error: null,
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
