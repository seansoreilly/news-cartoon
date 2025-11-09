import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocationStore } from '../locationStore';
import type { LocationData } from '../../types';

describe('locationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useLocationStore());
    act(() => {
      result.current.clearLocation();
    });
    // Clear localStorage
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with null location and no loading/error', () => {
      const { result } = renderHook(() => useLocationStore());

      expect(result.current.location).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setLocation', () => {
    it('should set location data and clear error', () => {
      const { result } = renderHook(() => useLocationStore());
      const mockLocation: LocationData = {
        name: 'New York, NY',
        coordinates: { lat: 40.7128, lng: -74.006 },
        source: 'manual',
      };

      act(() => {
        result.current.setLocation(mockLocation);
      });

      expect(result.current.location).toEqual(mockLocation);
      expect(result.current.error).toBeNull();
    });

    it('should replace previous location', () => {
      const { result } = renderHook(() => useLocationStore());
      const location1: LocationData = {
        name: 'Location 1',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      };

      const location2: LocationData = {
        name: 'Location 2',
        coordinates: { lat: 10, lng: 20 },
        source: 'gps',
      };

      act(() => {
        result.current.setLocation(location1);
      });

      expect(result.current.location?.name).toBe('Location 1');

      act(() => {
        result.current.setLocation(location2);
      });

      expect(result.current.location?.name).toBe('Location 2');
    });

    it('should clear error when setting new location', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.setError('Previous error');
      });

      const location: LocationData = {
        name: 'Test Location',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      };

      act(() => {
        result.current.setLocation(location);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('updateCoordinates', () => {
    it('should update coordinates on existing location', () => {
      const { result } = renderHook(() => useLocationStore());
      const initialLocation: LocationData = {
        name: 'Test Location',
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
      };

      act(() => {
        result.current.setLocation(initialLocation);
      });

      act(() => {
        result.current.updateCoordinates({ lat: 40.7128, lng: -74.006 });
      });

      expect(result.current.location?.coordinates).toEqual({
        lat: 40.7128,
        lng: -74.006,
      });
      expect(result.current.location?.name).toBe('Test Location');
    });

    it('should not update coordinates if location is null', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.updateCoordinates({ lat: 40.7128, lng: -74.006 });
      });

      expect(result.current.location).toBeNull();
    });

    it('should handle negative coordinates', () => {
      const { result } = renderHook(() => useLocationStore());
      const location: LocationData = {
        name: 'Southern Hemisphere',
        coordinates: { lat: -33.8688, lng: 151.2093 },
        source: 'gps',
      };

      act(() => {
        result.current.setLocation(location);
      });

      act(() => {
        result.current.updateCoordinates({ lat: -25.2744, lng: 133.7751 });
      });

      expect(result.current.location?.coordinates).toEqual({
        lat: -25.2744,
        lng: 133.7751,
      });
    });
  });

  describe('Error Handling', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useLocationStore());
      const errorMessage = 'Geolocation permission denied';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should clear error with null', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.setError('Error message');
      });

      expect(result.current.error).toBe('Error message');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should set and clear loading state', () => {
      const { result } = renderHook(() => useLocationStore());

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

  describe('clearLocation', () => {
    it('should clear all location data and error', () => {
      const { result } = renderHook(() => useLocationStore());
      const location: LocationData = {
        name: 'Test Location',
        coordinates: { lat: 40.7128, lng: -74.006 },
        source: 'manual',
      };

      act(() => {
        result.current.setLocation(location);
        result.current.setError('Some error');
      });

      expect(result.current.location).not.toBeNull();
      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearLocation();
      });

      expect(result.current.location).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should be idempotent', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.clearLocation();
        result.current.clearLocation();
      });

      expect(result.current.location).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Combined Operations', () => {
    it('should handle full location detection flow', () => {
      const { result } = renderHook(() => useLocationStore());
      const location: LocationData = {
        name: 'San Francisco, CA',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        source: 'gps',
      };

      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setLocation(location);
        result.current.setLoading(false);
      });

      expect(result.current.location?.name).toBe('San Francisco, CA');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle error during location detection', () => {
      const { result } = renderHook(() => useLocationStore());

      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setError('Failed to detect location');
        result.current.setLoading(false);
      });

      expect(result.current.location).toBeNull();
      expect(result.current.error).toBe('Failed to detect location');
      expect(result.current.isLoading).toBe(false);
    });

    it('should update coordinates after initial location set', () => {
      const { result } = renderHook(() => useLocationStore());
      const initialLocation: LocationData = {
        name: 'London, UK',
        coordinates: { lat: 51.5074, lng: -0.1278 },
        source: 'manual',
      };

      act(() => {
        result.current.setLocation(initialLocation);
      });

      expect(result.current.location?.coordinates.lat).toBe(51.5074);

      act(() => {
        result.current.updateCoordinates({ lat: 51.508, lng: -0.128 });
      });

      expect(result.current.location?.coordinates.lat).toBe(51.508);
      expect(result.current.location?.name).toBe('London, UK');
    });
  });
});
