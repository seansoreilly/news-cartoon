import '@testing-library/jest-dom';
import { vi, afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

/**
 * Mock Service Worker setup
 */
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Mock fetch API
 */
globalThis.fetch = vi.fn();

/**
 * Mock localStorage
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

/**
 * Mock geolocation API
 */
const geolocationMock = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(globalThis.navigator, 'geolocation', {
  value: geolocationMock,
  writable: true,
});

/**
 * Mock window.matchMedia
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * Mock import.meta.env
 */
// Set default test environment variables
Object.assign(import.meta.env, {
  VITE_GOOGLE_API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || 'test-key',
  VITE_GNEWS_API_KEY: import.meta.env.VITE_GNEWS_API_KEY || 'test-key',
  VITE_DEFAULT_NEWS_LIMIT: import.meta.env.VITE_DEFAULT_NEWS_LIMIT || '10',
});
