import React, { useState } from 'react';
import { useLocationStore } from '../store/locationStore';
import type { LocationData } from '../types';

const SettingsPage: React.FC = () => {
  const { location, setLocation, clearLocation } = useLocationStore();
  const [defaultLocation, setDefaultLocation] = useState(location?.name || '');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // In a real implementation, these would be stored in a preferences store
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [newsCount, setNewsCount] = useState(10);

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
              <label htmlFor="darkMode" className="text-gray-700">
                Dark Mode
              </label>
              <div className="relative inline-block w-12 h-6">
                <input
                  id="darkMode"
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  className="opacity-0 w-0 h-0"
                />
                <span
                  className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${darkMode ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute h-4 w-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'} top-1`}
                  />
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="autoRefresh" className="text-gray-700">
                Auto-refresh News
              </label>
              <div className="relative inline-block w-12 h-6">
                <input
                  id="autoRefresh"
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="opacity-0 w-0 h-0"
                />
                <span
                  className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${autoRefresh ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute h-4 w-4 bg-white rounded-full transition-transform ${autoRefresh ? 'translate-x-6' : 'translate-x-1'} top-1`}
                  />
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="newsCount" className="block text-gray-700 mb-2">
                Number of News Articles ({newsCount})
              </label>
              <input
                id="newsCount"
                type="range"
                min="5"
                max="20"
                value={newsCount}
                onChange={(e) => setNewsCount(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
