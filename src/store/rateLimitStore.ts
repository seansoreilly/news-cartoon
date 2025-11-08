import { create } from 'zustand';
import type { RateLimitEntry } from '../types';

interface RateLimitState {
  imageGenerations: RateLimitEntry[];
  checkRateLimit: (limit: number, windowMs: number) => boolean;
  recordGeneration: () => void;
  reset: () => void;
}

export const useRateLimitStore = create<RateLimitState>((set, get) => ({
  imageGenerations: [],

  checkRateLimit: (limit: number, windowMs: number): boolean => {
    const { imageGenerations } = get();
    const now = Date.now();
    const validGenerations = imageGenerations.filter(
      (entry) => now - entry.timestamp < windowMs
    );

    return validGenerations.reduce((count, entry) => count + entry.count, 0) < limit;
  },

  recordGeneration: () => {
    set((state) => {
      const now = Date.now();
      const updated = [...state.imageGenerations];

      const lastEntry = updated[updated.length - 1];
      if (lastEntry && lastEntry.timestamp === now) {
        lastEntry.count += 1;
      } else {
        updated.push({ timestamp: now, count: 1 });
      }

      return { imageGenerations: updated };
    });
  },

  reset: () => {
    set({ imageGenerations: [] });
  },
}));
