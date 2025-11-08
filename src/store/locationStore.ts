import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocationData } from '../types';

interface LocationState {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  setLocation: (location: LocationData) => void;
  updateCoordinates: (coordinates: { lat: number; lng: number }) => void;
  clearLocation: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useLocationStore = create<
  LocationState,
  [['zustand/persist', LocationState]]
>(
  persist(
    (set) => ({
      location: null,
      isLoading: false,
      error: null,

      setLocation: (location: LocationData) => {
        set({ location, error: null });
      },

      updateCoordinates: (coordinates: { lat: number; lng: number }) => {
        set((state) => ({
          location: state.location
            ? { ...state.location, coordinates }
            : null,
        }));
      },

      clearLocation: () => {
        set({ location: null, error: null });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'location-storage',
    }
  )
);
