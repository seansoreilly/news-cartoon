import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartoonData, ComicScript } from '../types';

export type GenerationPhase = 'script' | 'image' | null;

interface CartoonState {
  cartoon: CartoonData | null;
  comicPrompt: ComicScript | null;
  imagePath: string | null;
  selectedConceptIndex: number | null;
  isLoading: boolean;
  error: string | null;
  generationPhase: GenerationPhase;
  setCartoon: (cartoon: CartoonData) => void;
  setComicPrompt: (prompt: ComicScript) => void;
  setImagePath: (path: string) => void;
  setSelectedConceptIndex: (index: number) => void;
  clearCartoon: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setGenerationPhase: (phase: GenerationPhase) => void;
}

export const useCartoonStore = create<
  CartoonState,
  [['zustand/persist', Partial<CartoonState>]]
>(
  persist(
    (set) => ({
      cartoon: null,
      comicPrompt: null,
      imagePath: null,
      selectedConceptIndex: null,
      isLoading: false,
      error: null,
      generationPhase: null,

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
          generationPhase: null,
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setGenerationPhase: (generationPhase: GenerationPhase) => {
        set({ generationPhase });
      },
    }),
    {
      name: 'cartoon-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        cartoon: state.cartoon,
        comicPrompt: state.comicPrompt,
        imagePath: state.imagePath,
        selectedConceptIndex: state.selectedConceptIndex,
      }),
    }
  )
);
