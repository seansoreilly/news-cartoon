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

  const handleAutoDetect = async () => {
    setIsLoading(true);
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
    }
  };

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedLocation = manualLocation.trim();

    if (!trimmedLocation) {
      setError('Please enter search keywords');
      return;
    }

    setError(null);

    const locationData: LocationData = {
      name: trimmedLocation,
      source: 'manual',
      coordinates: { lat: 0, lng: 0 }, // Placeholder coordinates
      timezone: 'UTC',
      timestamp: Date.now(),
    };

    console.log('[LocationDetector] Setting location:', locationData);
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
    <div className="p-3 sm:p-4 md:p-6 rounded-lg shadow-md mb-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">1</span>
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Search Keywords</h2>
      </div>

      {location ? (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 rounded-lg border-2 border-green-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-base sm:text-lg font-semibold text-gray-800">{location.name}</p>
            </div>
            <button
              onClick={handleChangeLocation}
              className="text-xs sm:text-sm bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 whitespace-nowrap"
              aria-label="Change search keywords"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 rounded-lg space-y-4">
          <button
            onClick={handleAutoDetect}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 shadow-lg"
            aria-label="Detect my location automatically"
            aria-busy={isLoading}
          >
            {isLoading ? '🔍 Detecting your location...' : '📍 Detect My Location'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-br from-purple-50 to-pink-50 text-gray-500">OR</span>
            </div>
          </div>

          <form onSubmit={handleManualSubmit}>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="manual-location"
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="Enter search keywords (e.g., technology, sports)"
                className="flex-1 border-2 border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 transition-all"
                disabled={isLoading}
                aria-label="Enter search keywords"
              />
              <button
                type="submit"
                disabled={isLoading || !manualLocation.trim()}
                className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md whitespace-nowrap"
                aria-label="Set search keywords"
              >
                Search
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
