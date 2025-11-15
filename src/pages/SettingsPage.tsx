import React, { useState, useEffect } from 'react';
import { useLocationStore } from '../store/locationStore';
import { usePreferencesStore } from '../store/preferencesStore';
import type { LocationData } from '../types';

const SettingsPage: React.FC = () => {
  const { location, setLocation, clearLocation } = useLocationStore();
  const [defaultLocation, setDefaultLocation] = useState(location?.name || '');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Use preferences store for persistent settings
  const {
    autoRefresh,
    newsCount,
    setAutoRefresh,
    setNewsCount
  } = usePreferencesStore();

  // Update local state when location changes
  useEffect(() => {
    setDefaultLocation(location?.name || '');
  }, [location]);

  const handleSaveLocation = () => {
    if (defaultLocation.trim()) {
      const newLocation: LocationData = {
        name: defaultLocation.trim(),
        coordinates: { lat: 0, lng: 0 },
        source: 'manual',
        timestamp: Date.now(),
      };
      setLocation(newLocation);
      setSaveMessage('Default location saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleClearLocation = () => {
    clearLocation();
    setDefaultLocation('');
    setSaveMessage('Location cleared successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Settings</h2>

      <div className="space-y-8">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Location Preferences</h3>

          <div className="mb-4">
            <label htmlFor="defaultLocation" className="block text-gray-700 mb-2">
              Default Location
            </label>
            <div className="flex">
              <input
                id="defaultLocation"
                type="text"
                value={defaultLocation}
                onChange={(e) => setDefaultLocation(e.target.value)}
                placeholder="Enter your default location"
                className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2"
              />
              <button
                onClick={handleSaveLocation}
                disabled={!defaultLocation.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-r-lg disabled:opacity-50"
              >
                Save
              </button>
            </div>
            <button
              onClick={handleClearLocation}
              disabled={!location}
              className="text-sm text-red-600 hover:underline mt-2 disabled:opacity-50"
            >
              Clear saved location
            </button>
          </div>

          {saveMessage && (
            <div className="text-green-600 mt-2">{saveMessage}</div>
          )}
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Display Preferences</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="autoRefresh" className="text-gray-700">
                Auto-refresh News
              </label>
              <button
                id="autoRefresh"
                type="button"
                role="switch"
                aria-checked={autoRefresh}
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                style={{ backgroundColor: autoRefresh ? 'rgb(147, 51, 234)' : 'rgb(209, 213, 219)' }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{ transform: autoRefresh ? 'translateX(1.5rem)' : 'translateX(0.25rem)' }}
                />
              </button>
            </div>

            <div>
              <label htmlFor="newsCount" className="block text-gray-700 mb-2">
                Number of News Articles ({newsCount})
              </label>
              <input
                id="newsCount"
                type="range"
                min="3"
                max="10"
                value={newsCount}
                onChange={(e) => setNewsCount(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3</span>
                <span>10</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
