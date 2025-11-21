import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { server } from '../server';
import { http, HttpResponse } from 'msw';

/**
 * MSW API Tests
 *
 * Tests that verify:
 * - Mock handlers are correctly configured
 * - API endpoints return expected data
 * - Error scenarios are properly simulated
 * - Response overrides work as expected
 */

describe('MSW API Handlers', () => {
  beforeEach(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('News API Handlers', () => {
    it('should return articles for valid search query', async () => {
      const response = await fetch(
        'http://localhost:3000/api/news/search?q=test'
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toBeDefined();
      expect(Array.isArray(data.articles)).toBe(true);
      expect(data.articles.length).toBeGreaterThan(0);
    });

    it('should return 400 when search query is missing', async () => {
      const response = await fetch('http://localhost:3000/api/news/search');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query parameter is required');
    });

    it('should return empty articles for no-results query', async () => {
      const response = await fetch(
        'http://localhost:3000/api/news/search?q=no-results'
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toBeDefined();
      expect(data.articles.length).toBe(0);
    });

    it('should return articles for location query', async () => {
      const response = await fetch(
        'http://localhost:3000/api/news/location?location=New York'
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toBeDefined();
      expect(Array.isArray(data.articles)).toBe(true);
    });

    it('should return 400 when location is missing', async () => {
      const response = await fetch('http://localhost:3000/api/news/location');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Location parameter is required');
    });

    it('should contain article fields in response', async () => {
      const response = await fetch(
        'http://localhost:3000/api/news/search?q=test'
      );
      const data = await response.json();
      const article = data.articles[0];

      expect(article.title).toBeDefined();
      expect(article.description).toBeDefined();
      expect(article.url).toBeDefined();
      expect(article.source).toBeDefined();
      expect(article.publishedAt).toBeDefined();
    });
  });

  describe('Gemini API Handlers', () => {
    it('should return concept response from Gemini', async () => {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'test-key',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Generate concepts',
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.candidates).toBeDefined();
      expect(Array.isArray(data.candidates)).toBe(true);
      expect(data.candidates[0].content.parts[0].text).toBeDefined();
    });

    it('should return 401 when API key is missing', async () => {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Generate cartoon concepts',
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Missing API key');
    });

    it('should return 429 for rate limit simulation', async () => {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'test-key',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Please rate-limit this request',
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });

    it('should return script response from Gemini', async () => {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'test-key',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Generate comic script',
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.candidates).toBeDefined();
      expect(data.candidates[0].content.parts[0].text).toContain('Panel');
    });

    it('should return image response from vision API', async () => {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'test-key',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Generate image',
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.candidates).toBeDefined();
      expect(data.candidates[0].content.parts[0].inlineData).toBeDefined();
      expect(data.candidates[0].content.parts[0].inlineData.mimeType).toBe(
        'image/png'
      );
      expect(data.candidates[0].content.parts[0].inlineData.data).toBeDefined();
    });

    it('should return 400 for invalid image data', async () => {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'test-key',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'invalid image data',
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid image data');
    });
  });

  describe('Geolocation API Handler', () => {
    it('should return location data from IP API', async () => {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ip).toBeDefined();
      expect(data.city).toBe('San Francisco');
      expect(data.latitude).toBeDefined();
      expect(data.longitude).toBeDefined();
    });
  });

  describe('Health Check Handler', () => {
    it('should return ok status', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });
  });

  describe('Handler Override Testing', () => {
    it('should allow overriding handlers in tests', async () => {
      // Override the handler
      server.use(
        http.get('http://localhost:3000/api/news/search', () => {
          return HttpResponse.json({
            articles: [{ title: 'Custom Test Article' }],
          });
        })
      );

      const response = await fetch(
        'http://localhost:3000/api/news/search?q=test'
      );
      const data = await response.json();

      expect(data.articles[0].title).toBe('Custom Test Article');
    });

    it('should support overriding with error responses', async () => {
      // Override with error
      server.use(
        http.get('http://localhost:3000/api/news/search', () => {
          return HttpResponse.json(
            { error: 'Service unavailable' },
            { status: 503 }
          );
        })
      );

      const response = await fetch(
        'http://localhost:3000/api/news/search?q=test'
      );

      expect(response.status).toBe(503);
    });

    it('should support multiple handler overrides', async () => {
      // Override multiple handlers
      server.use(
        http.get('http://localhost:3000/api/news/search', () => {
          return HttpResponse.json({ articles: [] });
        }),
        http.get('http://localhost:3000/api/health', () => {
          return HttpResponse.json({ status: 'degraded' });
        })
      );

      const newsResponse = await fetch(
        'http://localhost:3000/api/news/search?q=test'
      );
      const healthResponse = await fetch('http://localhost:3000/api/health');

      const newsData = await newsResponse.json();
      const healthData = await healthResponse.json();

      expect(newsData.articles.length).toBe(0);
      expect(healthData.status).toBe('degraded');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      server.use(
        http.get('http://localhost:3000/api/news/search', () => {
          return HttpResponse.error();
        })
      );

      try {
        await fetch('http://localhost:3000/api/news/search?q=test');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed JSON responses', async () => {
      server.use(
        http.get('http://localhost:3000/api/news/search', () => {
          return new HttpResponse('Invalid JSON', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      const response = await fetch(
        'http://localhost:3000/api/news/search?q=test'
      );

      try {
        await response.json();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
