import { http, HttpResponse } from 'msw';

/**
 * Mock Data Fixtures
 */

// Mock news articles
const mockArticles = {
  articles: [
    {
      title: 'Breaking News 1',
      description: 'This is a test article about current events',
      url: 'https://example.com/news/1',
      source: { name: 'Test News Source', url: 'https://example.com' },
      publishedAt: '2025-01-01T12:00:00Z',
      content: 'Full content of the test article goes here',
      image: 'https://example.com/image1.jpg',
    },
    {
      title: 'Breaking News 2',
      description: 'Another important test article',
      url: 'https://example.com/news/2',
      source: { name: 'Another News Source', url: 'https://example.com' },
      publishedAt: '2025-01-01T11:00:00Z',
      content: 'More content about the news',
      image: 'https://example.com/image2.jpg',
    },
    {
      title: 'Breaking News 3',
      description: 'Yet another test article',
      url: 'https://example.com/news/3',
      source: { name: 'Test News Source', url: 'https://example.com' },
      publishedAt: '2025-01-01T10:00:00Z',
      content: 'Additional news content',
    },
  ],
};

const emptyArticles = { articles: [] };

// Mock Gemini API responses
const mockGeminiConceptResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: '1. **Political Theater**: A satirical take on recent political developments\n2. **Economic Rollercoaster**: Editorial cartoon about market trends\n3. **Climate Crisis**: Editorial perspective on environmental issues\n4. **Tech Takeover**: Commentary on technology in society\n5. **Social Media Madness**: Critique of social media culture',
          },
        ],
      },
    },
  ],
};

const mockGeminiScriptResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: 'Panel 1: A politician on a tightrope, holding a briefcase\nPanel 2: The tightrope starts to wobble\nPanel 3: The politician juggles multiple objects labeled "promises"\nPanel 4: Everything falls down, showing chaos below',
          },
        ],
      },
    },
  ],
};

const mockGeminiImageResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            },
          },
        ],
      },
    },
  ],
};

/**
 * MSW Handlers
 *
 * These handlers mock API responses for testing. Each handler can be overridden
 * in individual tests using server.use(handler).
 */
export const handlers = [
  // News API: Search endpoint
  http.get('http://localhost:3000/api/news/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return HttpResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Simulate empty results for specific queries
    if (query === 'no-results') {
      return HttpResponse.json(emptyArticles);
    }

    return HttpResponse.json(mockArticles);
  }),

  // News API: Location endpoint
  http.get('http://localhost:3000/api/news/location', ({ request }) => {
    const url = new URL(request.url);
    const location = url.searchParams.get('location');

    if (!location) {
      return HttpResponse.json(
        { error: 'Location parameter is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json(mockArticles);
  }),

  // Gemini: Unified concept and script generation
  http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    async ({ request }) => {
      // Check for authentication
      if (!request.headers.get('x-goog-api-key')) {
        return HttpResponse.json(
          { error: 'Missing API key' },
          { status: 401 }
        );
      }

      // Parse body safely
      try {
        const body = await request.json() as Record<string, any>;
        const text = body.contents?.[0]?.parts?.[0]?.text || '';

        // Simulate rate limiting for specific prompts
        if (text.includes('rate-limit')) {
          return HttpResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 }
          );
        }

        // Return script response for script-related prompts
        if (text.includes('comic script') || text.includes('Generate comic script')) {
          return HttpResponse.json(mockGeminiScriptResponse);
        }

        // Default to concept response
        return HttpResponse.json(mockGeminiConceptResponse);
      } catch {
        // Continue if body is not JSON
        return HttpResponse.json(mockGeminiConceptResponse);
      }
    }
  ),

  // Gemini: Image generation (vision API)
  http.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    async ({ request }) => {
      if (!request.headers.get('x-goog-api-key')) {
        return HttpResponse.json(
          { error: 'Missing API key' },
          { status: 401 }
        );
      }

      // Parse body safely to check for invalid data simulation
      try {
        const body = await request.json() as Record<string, any>;

        // Simulate error for invalid image data
        if (
          (body.contents?.[0]?.parts?.[0]?.text || '').includes('invalid')
        ) {
          return HttpResponse.json(
            { error: 'Invalid image data' },
            { status: 400 }
          );
        }
      } catch {
        // Continue if body is not JSON
      }

      return HttpResponse.json(mockGeminiImageResponse);
    }
  ),

  // IP Geolocation API (for location detection)
  http.get('https://ipapi.co/json/', () => {
    return HttpResponse.json({
      ip: '192.168.1.1',
      city: 'San Francisco',
      region: 'California',
      country: 'US',
      latitude: 37.7749,
      longitude: -122.4194,
    });
  }),

  // Health check endpoint
  http.get('http://localhost:3000/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];
