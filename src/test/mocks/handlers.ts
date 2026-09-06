import { http, HttpResponse } from 'msw';
import { buildProxyUrl } from '../../services/gemini/api';
import { buildGalleryUrl } from '../../services/galleryService';

// The browser talks to our own proxy; text and image share one endpoint and
// are distinguished by `kind` in the JSON body.
export const GEMINI_PROXY_URL = buildProxyUrl();
// Gallery list/publish also go through our own endpoint (Supabase stays server-side).
export const GALLERY_URL = buildGalleryUrl();

export const mockGalleryItems = [
  {
    id: 'gal-1',
    created_at: '2025-01-02T10:00:00Z',
    title: 'Political Theater',
    image_path: '1735812000000-abc123.png',
    news_url: 'https://example.com/news/1',
    news_source: 'Test News Source',
    public_url: 'https://stub.supabase.co/storage/v1/object/public/cartoons/1735812000000-abc123.png',
  },
  {
    id: 'gal-2',
    created_at: '2025-01-01T10:00:00Z',
    title: 'Economic Rollercoaster',
    image_path: '1735725600000-def456.png',
    news_url: 'https://example.com/news/2',
    news_source: 'Another News Source',
    public_url: 'https://stub.supabase.co/storage/v1/object/public/cartoons/1735725600000-def456.png',
  },
];

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

  // Gemini proxy: concept/script (kind: 'text') and image (kind: 'image')
  http.post(GEMINI_PROXY_URL, async ({ request }) => {
    let body: Record<string, any> = {};
    try {
      body = (await request.json()) as Record<string, any>;
    } catch {
      return HttpResponse.json(
        { error: { message: 'Request body must be a JSON object', statusCode: 400, code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    const text: string = typeof body.prompt === 'string' ? body.prompt : '';

    if (body.kind === 'image') {
      // Simulate error for invalid image data
      if (text.includes('invalid')) {
        return HttpResponse.json(
          { error: { message: 'Invalid image data', statusCode: 400, code: 'GEMINI_ERROR' } },
          { status: 400 }
        );
      }
      return HttpResponse.json(mockGeminiImageResponse);
    }

    // Simulate rate limiting for specific prompts
    if (text.includes('rate-limit')) {
      return HttpResponse.json(
        { error: { message: 'Gemini API quota or rate limit exceeded.', statusCode: 429, code: 'GEMINI_RATE_LIMIT' } },
        { status: 429 }
      );
    }

    // Return script response for script-related prompts
    if (text.includes('comic script') || text.includes('Generate comic script')) {
      return HttpResponse.json(mockGeminiScriptResponse);
    }

    // Default to concept response
    return HttpResponse.json(mockGeminiConceptResponse);
  }),

  // Gallery proxy: list
  http.get(GALLERY_URL, () => HttpResponse.json({ items: mockGalleryItems })),

  // Gallery proxy: publish. A title containing 'not-configured' simulates a
  // server without Supabase settings; 'too-large' simulates the size guard.
  http.post(GALLERY_URL, async ({ request }) => {
    let body: Record<string, any> = {};
    try {
      body = (await request.json()) as Record<string, any>;
    } catch {
      return HttpResponse.json(
        { error: { message: 'Request body must be a JSON object', statusCode: 400, code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }
    const title: string = typeof body.title === 'string' ? body.title : '';
    if (title.trim() === '' || typeof body.image !== 'string' || body.image === '') {
      return HttpResponse.json(
        { error: { message: 'title must be a non-empty string', statusCode: 400, code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }
    if (title.includes('not-configured')) {
      return HttpResponse.json(
        {
          error: {
            message: 'The gallery is not set up on this server yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.',
            statusCode: 503,
            code: 'GALLERY_NOT_CONFIGURED',
          },
        },
        { status: 503 }
      );
    }
    if (title.includes('too-large')) {
      return HttpResponse.json(
        { error: { message: 'Image is too large to publish (max 3 MB)', statusCode: 413, code: 'GALLERY_IMAGE_TOO_LARGE' } },
        { status: 413 }
      );
    }
    return HttpResponse.json(
      {
        success: true,
        item: {
          id: 'gal-new',
          created_at: '2025-01-03T10:00:00Z',
          title,
          image_path: 'new.png',
          news_url: body.newsUrl,
          news_source: body.newsSource,
          public_url: 'https://stub.supabase.co/storage/v1/object/public/cartoons/new.png',
        },
      },
      { status: 201 }
    );
  }),

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
