import React, { useState } from 'react';
import { useLocationStore } from '../../store/locationStore';
import { locationService } from '../../services/locationService';
import { AppErrorHandler } from '../../utils/errorHandler';
import type { LocationData } from '../../types/location';

const LocationDetector: React.FC = () => {
  const { location, setLocation, clearLocation, setError: setStoreError } = useLocationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [activeMethod, setActiveMethod] = useState<'gps' | 'ip' | 'manual' | null>(null);

  const handleDetectGPS = async () => {
    setIsLoading(true);
    setActiveMethod('gps');
    setError(null);

    try {
      const locationData = await locationService.getLocationFromGPS();
      setLocation(locationData);
      setStoreError(null);
    } catch (err) {
      const appError = AppErrorHandler.handleError(err);
      const userMessage = AppErrorHandler.getUserMessage(appError);
      setError(userMessage);
      setStoreError(userMessage);
    } finally {
      setIsLoading(false);
      setActiveMethod(null);
    }
  };

  const handleDetectIP = async () => {
    setIsLoading(true);
    setActiveMethod('ip');
    setError(null);

    try {
      const locationData = await locationService.getLocationFromIP();
      setLocation(locationData);
      setStoreError(null);
    } catch (err) {
      const appError = AppErrorHandler.handleError(err);
      const userMessage = AppErrorHandler.getUserMessage(appError);
      setError(userMessage);
      setStoreError(userMessage);
    } finally {
      setIsLoading(false);
      setActiveMethod(null);
    }
  };

  const handleAutoDetect = async () => {
    setIsLoading(true);
    setActiveMethod('gps');
    setError(null);

    try {
      const locationData = await locationService.detectLocation();
      setLocation(locationData);
      setStoreError(null);
    } catch (err) {
      const appError = AppErrorHandler.handleError(err);
      const userMessage = AppErrorHandler.getUserMessage(appError);
      setError(userMessage);
      setStoreError(userMessage);
    } finally {
      setIsLoading(false);
      setActiveMethod(null);
    }
  };

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedLocation = manualLocation.trim();

    if (!trimmedLocation) {
      setError('Please enter a location');
      return;
    }

    setActiveMethod('manual');
    setError(null);

    const locationData: LocationData = {
      name: trimmedLocation,
      source: 'manual',
      coordinates: { lat: 0, lng: 0 }, // Placeholder coordinates
      timezone: 'UTC',
      timestamp: Date.now(),
    };

    setLocation(locationData);
    setManualLocation('');
    setStoreError(null);
  };

  const handleChangeLocation = () => {
    setManualLocation('');
    setError(null);
    clearLocation();
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Location</h2>

      {location ? (
        <div className="bg-white p-4 rounded-lg border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-800">{location.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                Source: {location.source === 'gps' ? 'GPS' : location.source === 'ip' ? 'IP Address' : 'Manual Entry'}
              </p>
            </div>
            <button
              onClick={handleChangeLocation}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              aria-label="Change location"
            >
              Change Location
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleAutoDetect}
              disabled={isLoading}
              className="flex-1 min-w-[200px] bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
              aria-label="Auto detect location using GPS or IP"
              aria-busy={isLoading && activeMethod === 'gps'}
            >
              {isLoading && activeMethod === 'gps' ? '🔍 Auto Detecting...' : '🔍 Auto Detect'}
            </button>

            <button
              onClick={handleDetectGPS}
              disabled={isLoading}
              className="flex-1 min-w-[150px] bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              aria-label="Use GPS to detect location"
              aria-busy={isLoading && activeMethod === 'gps'}
            >
              {isLoading && activeMethod === 'gps' ? '📍 Using GPS...' : '📍 Use GPS'}
            </button>

            <button
              onClick={handleDetectIP}
              disabled={isLoading}
              className="flex-1 min-w-[150px] bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
              aria-label="Use IP address to detect location"
              aria-busy={isLoading && activeMethod === 'ip'}
            >
              {isLoading && activeMethod === 'ip' ? '🌐 Using IP...' : '🌐 Use IP'}
            </button>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label htmlFor="manual-location" className="block text-sm font-medium text-gray-700">
              Or enter your location manually:
            </label>
            <div className="flex gap-2">
              <input
                id="manual-location"
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="Enter location (e.g., New York, NY)"
                className="flex-1 border-2 border-gray-300 rounded-l-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                disabled={isLoading}
                aria-label="Enter location"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 text-white px-6 py-2 rounded-r-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Set location"
              >
                Set
              </button>
            </div>
          </form>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-800 font-medium">⚠️ {error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationDetector;
