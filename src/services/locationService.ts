import type { LocationData, Coordinates } from '../types/location';
import { createLocationError } from '../types/error';

const GEOLOCATION_TIMEOUT = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const CACHE_KEY = 'cartoon_location_cache';

interface CachedLocation {
  data: LocationData;
  timestamp: number;
}

class LocationService {
  private cache: Map<string, CachedLocation> = new Map();

  constructor() {
    this.loadCache();
  }

  async detectLocation(): Promise<LocationData> {
    try {
      return await this.getLocationFromGPS();
    } catch (gpsError) {
      console.warn('GPS detection failed, trying IP fallback:', gpsError);
      try {
        return await this.getLocationFromIP();
      } catch (ipError) {
        throw createLocationError(
          'Could not detect location. Please enter your location manually.',
          { gpsError: String(gpsError), ipError: String(ipError) }
        );
      }
    }
  }

  async getLocationFromGPS(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const coordinates: Coordinates = {
              lat: latitude,
              lng: longitude,
            };

            const locationName = await this.getLocationName(coordinates);
            const timezone = this.getTimezoneFromCoordinates(coordinates);

            const location: LocationData = {
              name: locationName,
              coordinates,
              source: 'gps',
              timezone,
              timestamp: Date.now(),
            };

            this.setCache('gps', location);
            resolve(location);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          timeout: GEOLOCATION_TIMEOUT,
          enableHighAccuracy: false,
        }
      );
    });
  }

  async getLocationFromIP(retryCount = 0): Promise<LocationData> {
    try {
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const coordinates: Coordinates = {
        lat: data.latitude,
        lng: data.longitude,
      };

      const location: LocationData = {
        name: this.formatLocationName(data),
        coordinates,
        source: 'ip',
        timezone: data.timezone,
        timestamp: Date.now(),
      };

      this.setCache('ip', location);
      return location;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        await this.sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
        return this.getLocationFromIP(retryCount + 1);
      }

      throw error;
    }
  }

  private async getLocationName(
    coordinates: Coordinates,
    retryCount = 0
  ): Promise<string> {
    try {
      const lat = coordinates.lat;
      const lng = coordinates.lng;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const address = data.address || {};

      const parts: string[] = [];
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);

      return parts.join(', ') || 'Unknown Location';
    } catch {
      if (retryCount < MAX_RETRIES) {
        await this.sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
        return this.getLocationName(coordinates, retryCount + 1);
      }

      const lat = coordinates.lat.toFixed(2);
      const lng = coordinates.lng.toFixed(2);
      return `${lat}, ${lng}`;
    }
  }

  private formatLocationName(data: Record<string, unknown>): string {
    const parts: string[] = [];

    if (data.city) parts.push(String(data.city));
    if (data.region) parts.push(String(data.region));
    if (data.country_name) parts.push(String(data.country_name));

    return parts.join(', ') || 'Unknown Location';
  }

  private getTimezoneFromCoordinates(coordinates: Coordinates): string {
    const offsetHour = Math.round(coordinates.lng / 15);
    const hours = String(Math.abs(offsetHour)).padStart(2, '0');
    const sign = offsetHour >= 0 ? '+' : '-';

    return `UTC${sign}${hours}:00`;
  }

  private setCache(key: string, location: LocationData): void {
    this.cache.set(key, {
      data: location,
      timestamp: Date.now(),
    });
    this.saveCache();
  }

  private loadCache(): void {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<
          string,
          { data: LocationData; timestamp: number }
        >;
        Object.entries(parsed).forEach(([key, value]) => {
          this.cache.set(key, value);
        });
      }
    } catch (error) {
      console.warn('Failed to load location cache:', error);
    }
  }

  private saveCache(): void {
    try {
      const cacheObj: Record<string, CachedLocation> = {};
      this.cache.forEach((value, key) => {
        cacheObj[key] = value;
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('Failed to save location cache:', error);
    }
  }

  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem(CACHE_KEY);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const locationService = new LocationService();
