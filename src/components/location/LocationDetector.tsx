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
    <div className="vintage-border p-3 sm:p-4 md:p-6 mb-6" style={{
      background: 'var(--color-newsprint-light)',
      position: 'relative'
    }}>
      <div className="breaking-news" style={{
        position: 'absolute',
        top: '-12px',
        left: '20px',
        fontSize: 'var(--text-xs)'
      }}>
        BREAKING NEWS SEARCH
      </div>

      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <span className="flex items-center justify-center w-8 h-8" style={{
          background: 'var(--color-editorial-red)',
          color: 'var(--color-newsprint-light)',
          fontFamily: 'var(--font-ui)',
          fontWeight: 'var(--font-bold)',
          borderRadius: '50%',
          border: '2px solid var(--color-ink)'
        }}>1</span>
        <h2 className="headline-article" style={{ color: 'var(--color-ink)', margin: 0 }}>
          NEWS BUREAU DESK
        </h2>
      </div>

      {location ? (
        <div className="comic-panel p-3 sm:p-4" style={{ background: 'var(--color-press-yellow)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="label" style={{ color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                CURRENT BEAT:
              </p>
              <p className="headline-article" style={{
                color: 'var(--color-editorial-red)',
                fontSize: 'var(--text-xl)',
                margin: 0
              }}>
                {location.name}
              </p>
            </div>
            <button
              onClick={handleChangeLocation}
              className="btn-secondary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: 'var(--text-sm)'
              }}
              aria-label="Change search keywords"
            >
              CHANGE BEAT
            </button>
          </div>
        </div>
      ) : (
        <div className="paper-texture p-3 sm:p-4 space-y-4" style={{
          background: 'var(--gradient-newsprint)',
          border: '1px dashed var(--border-secondary)'
        }}>
          <button
            onClick={handleAutoDetect}
            disabled={isLoading}
            className="w-full btn-primary"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: 'var(--text-base)'
            }}
            aria-label="Detect my location automatically"
            aria-busy={isLoading}
          >
            {isLoading ? 'SEARCHING WIRE SERVICE...' : '📍 AUTO-DETECT LOCATION'}
          </button>

          <div className="newspaper-divider">
            <span style={{
              background: 'var(--gradient-newsprint)',
              fontSize: 'var(--text-xs)'
            }}>OR</span>
          </div>

          <form onSubmit={handleManualSubmit}>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="manual-location"
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="Type keywords (e.g., technology, sports, politics)"
                className="flex-1"
                style={{
                  border: '2px solid var(--border-primary)',
                  borderRadius: '0',
                  padding: '0.75rem 1rem',
                  fontSize: 'var(--text-base)',
                  fontFamily: 'var(--font-ui)',
                  background: 'var(--bg-paper)',
                  color: 'var(--text-primary)'
                }}
                disabled={isLoading}
                aria-label="Enter search keywords"
              />
              <button
                type="submit"
                disabled={isLoading || !manualLocation.trim()}
                className="btn-primary"
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: 'var(--text-base)'
                }}
                aria-label="Set search keywords"
              >
                SEARCH
              </button>
            </div>
          </form>

          {error && (
            <div className="speech-bubble" style={{
              background: 'var(--color-newsprint-light)',
              borderColor: 'var(--color-editorial-red)',
              padding: '1rem'
            }}>
              <p className="body-text" style={{
                color: 'var(--color-editorial-red)',
                margin: 0,
                fontWeight: 'var(--font-bold)'
              }}>
                ⚠️ {error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationDetector;
