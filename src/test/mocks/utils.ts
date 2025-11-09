import { http, HttpResponse } from 'msw';
import { server } from './server';

/**
 * MSW Testing Utilities
 *
 * Provides helper functions for common MSW testing patterns:
 * - Error simulation
 * - Response overrides
 * - Handler management
 */

/**
 * Simulate a network error for a given endpoint
 */
export function mockNetworkError(pattern: string | RegExp) {
  server.use(
    http.get(pattern, () => {
      return HttpResponse.error();
    }),
    http.post(pattern, () => {
      return HttpResponse.error();
    })
  );
}

/**
 * Simulate a timeout for a given endpoint
 */
export function mockTimeout(pattern: string | RegExp) {
  server.use(
    http.get(pattern, async () => {
      // Simulate timeout with a long delay
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(HttpResponse.json({}));
        }, 10000);
      });
    }),
    http.post(pattern, async () => {
      // Simulate timeout with a long delay
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(HttpResponse.json({}));
        }, 10000);
      });
    })
  );
}

/**
 * Simulate an HTTP error response
 */
export function mockHttpError(
  pattern: string | RegExp,
  status: number,
  errorMessage: string
) {
  server.use(
    http.get(pattern, () => {
      return HttpResponse.json({ error: errorMessage }, { status });
    }),
    http.post(pattern, () => {
      return HttpResponse.json({ error: errorMessage }, { status });
    })
  );
}

/**
 * Simulate successful response with custom data
 */
export function mockSuccess(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  pattern: string | RegExp,
  data: Record<string, any>
) {
  const httpMethod =
    method === 'GET'
      ? http.get
      : method === 'POST'
        ? http.post
        : method === 'PUT'
          ? http.put
          : http.delete;

  server.use(
    httpMethod(pattern, () => {
      return HttpResponse.json(data);
    })
  );
}

/**
 * Get the number of requests made to an endpoint
 * Note: This is a placeholder for tracking requests in tests
 */
export function getRequestCount(): number {
  // This would require accessing MSW internals - for now, we'll use a simpler approach
  // by tracking requests in individual tests
  return 0;
}

/**
 * Reset all handlers to defaults
 */
export function resetHandlers() {
  server.resetHandlers();
}

/**
 * Get all pending requests (requests that haven't been matched yet)
 */
export function getPendingRequests() {
  // This would require MSW debugging - tracked at test level
  return [];
}
