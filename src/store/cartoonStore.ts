import { create } from 'zustand';
import type { CartoonData, ComicScript } from '../types';

interface CartoonState {
  cartoon: CartoonData | null;
  comicScript: ComicScript | null;
  imagePath: string | null;
  selectedConceptIndex: number | null;
  isLoading: boolean;
  error: string | null;
  setCartoon: (cartoon: CartoonData) => void;
  setComicScript: (script: ComicScript) => void;
  setImagePath: (path: string) => void;
  setSelectedConceptIndex: (index: number) => void;
  clearCartoon: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCartoonStore = create<CartoonState>((set) => ({
  cartoon: null,
  comicScript: null,
  imagePath: null,
  selectedConceptIndex: null,
  isLoading: false,
  error: null,

  setCartoon: (cartoon: CartoonData) => {
    set({ cartoon, error: null, selectedConceptIndex: null });
  },

  setComicScript: (comicScript: ComicScript) => {
    set({ comicScript });
  },

  setImagePath: (imagePath: string) => {
    set({ imagePath });
  },

  setSelectedConceptIndex: (selectedConceptIndex: number) => {
    set({ selectedConceptIndex, imagePath: null, comicScript: null });
  },

  clearCartoon: () => {
    set({
      cartoon: null,
      comicScript: null,
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
